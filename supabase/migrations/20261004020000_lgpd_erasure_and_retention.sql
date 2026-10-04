-- LGPD, parte 2: direitos do titular (anonimização / exclusão) e retenção.
--
-- Por que funções SQL e não UPDATE/DELETE soltos na aplicação:
--  * é ATÔMICO (tudo ou nada) e deixa rastro em audit_logs na mesma transação;
--  * o dado pessoal de um paciente vive em MAIS de uma tabela. Além de
--    assessments: patient_longitudinal_records duplica nome e e-mail;
--    whatsapp_messages guarda telefone e texto; contacts guarda nome/e-mail/
--    telefone/notas. Um DELETE ingênuo em assessments deixaria isso para trás
--    (whatsapp_messages.assessment_id é ON DELETE SET NULL).
--  * a mesma pessoa pode ter várias triagens na clínica (agrupadas por e-mail);
--    o pedido do titular cobre todas, por padrão (p_all = true).
--
-- Só cria funções novas. Executável apenas por service_role: a server function
-- confere antes que quem pede é ADMIN da clínica.
--
-- RETENÇÃO: anonymize_expired_assessments NÃO é agendada. O prazo legal de guarda
-- (prontuário/CFM, base legal da clínica) é decisão do Dr. Saraiva / encarregado
-- (DPO), não técnica. Ver documentação viva/11_LGPD_DIREITOS_DO_TITULAR.md.

CREATE OR REPLACE FUNCTION public.lgpd_subject_assessment_ids(p_assessment_id uuid, p_all boolean)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_clinic uuid;
  v_email  text;
  v_ids    uuid[];
BEGIN
  SELECT clinic_id, lower(btrim(respondent_email))
    INTO v_clinic, v_email
    FROM public.assessments WHERE id = p_assessment_id;
  IF v_clinic IS NULL THEN
    RETURN ARRAY[]::uuid[];
  END IF;
  IF p_all AND v_email IS NOT NULL AND v_email <> '' THEN
    SELECT coalesce(array_agg(id), ARRAY[]::uuid[]) INTO v_ids
      FROM public.assessments
     WHERE clinic_id = v_clinic AND lower(btrim(respondent_email)) = v_email;
  ELSE
    v_ids := ARRAY[p_assessment_id];
  END IF;
  RETURN v_ids;
END;
$$;

-- Anonimiza: remove o que identifica a pessoa e MANTÉM o conteúdo clínico
-- (escores, faixas, sinais de risco, pareceres) sem identificador.
CREATE OR REPLACE FUNCTION public.anonymize_assessment(
  p_assessment_id uuid,
  p_actor         uuid,
  p_reason        text,
  p_all           boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_ids        uuid[];
  v_clinic     uuid;
  v_contacts   uuid[];
  v_n_assess   integer;
  v_n_msgs     integer;
  v_n_contacts integer;
  v_n_notes    integer;
BEGIN
  IF p_reason NOT IN ('solicitacao_titular', 'fim_retencao', 'outro') THEN
    RAISE EXCEPTION 'motivo invalido';
  END IF;

  v_ids := public.lgpd_subject_assessment_ids(p_assessment_id, p_all);
  IF coalesce(cardinality(v_ids), 0) = 0 THEN
    RAISE EXCEPTION 'triagem nao encontrada';
  END IF;

  SELECT clinic_id INTO v_clinic FROM public.assessments WHERE id = p_assessment_id;

  SELECT coalesce(array_agg(DISTINCT contact_id), ARRAY[]::uuid[]) INTO v_contacts
    FROM public.assessments WHERE id = ANY (v_ids) AND contact_id IS NOT NULL;

  UPDATE public.assessments
     SET respondent_name     = '[titular removido]',
         respondent_email    = NULL,
         respondent_phone    = NULL,
         respondent_age      = NULL,
         respondent_sex      = NULL,
         birth_date          = NULL,
         main_complaint      = NULL,
         informant_name      = NULL,
         informant_relation  = NULL,
         consent_ip          = NULL,
         contact_id          = NULL,
         summary             = coalesce(summary, '{}'::jsonb) - 'preferred_name' - 'pronouns'
   WHERE id = ANY (v_ids);
  GET DIAGNOSTICS v_n_assess = ROW_COUNT;

  UPDATE public.patient_longitudinal_records
     SET patient_name  = '[titular removido]',
         patient_email = 'anonimizado:' || assessment_id::text
   WHERE assessment_id = ANY (v_ids);

  DELETE FROM public.whatsapp_messages
   WHERE assessment_id = ANY (v_ids) OR contact_id = ANY (v_contacts);
  GET DIAGNOSTICS v_n_msgs = ROW_COUNT;

  DELETE FROM public.contacts c
   WHERE c.id = ANY (v_contacts)
     AND NOT EXISTS (SELECT 1 FROM public.assessments a WHERE a.contact_id = c.id);
  GET DIAGNOSTICS v_n_contacts = ROW_COUNT;

  SELECT count(*) INTO v_n_notes FROM public.assessment_notes WHERE assessment_id = ANY (v_ids);

  INSERT INTO public.audit_logs (clinic_id, actor_user_id, action, entity_type, entity_id, details)
  VALUES (v_clinic, p_actor, 'data_anonymized', 'assessment', p_assessment_id,
          jsonb_build_object('motivo', p_reason, 'triagens', v_n_assess,
                             'mensagens_removidas', v_n_msgs, 'contatos_removidos', v_n_contacts,
                             'pareceres_mantidos', v_n_notes));

  RETURN jsonb_build_object('mode', 'anonimizar', 'triagens', v_n_assess,
                            'mensagens_removidas', v_n_msgs, 'contatos_removidos', v_n_contacts,
                            'pareceres_mantidos', v_n_notes);
END;
$$;

-- Exclui de verdade (cascata em scale_results, pareceres, longitudinal, psicoeducação).
CREATE OR REPLACE FUNCTION public.erase_assessment(
  p_assessment_id uuid,
  p_actor         uuid,
  p_reason        text,
  p_all           boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_ids        uuid[];
  v_clinic     uuid;
  v_contacts   uuid[];
  v_n_assess   integer;
  v_n_msgs     integer;
  v_n_contacts integer;
BEGIN
  IF p_reason NOT IN ('solicitacao_titular', 'fim_retencao', 'outro') THEN
    RAISE EXCEPTION 'motivo invalido';
  END IF;

  v_ids := public.lgpd_subject_assessment_ids(p_assessment_id, p_all);
  IF coalesce(cardinality(v_ids), 0) = 0 THEN
    RAISE EXCEPTION 'triagem nao encontrada';
  END IF;

  SELECT clinic_id INTO v_clinic FROM public.assessments WHERE id = p_assessment_id;

  SELECT coalesce(array_agg(DISTINCT contact_id), ARRAY[]::uuid[]) INTO v_contacts
    FROM public.assessments WHERE id = ANY (v_ids) AND contact_id IS NOT NULL;

  DELETE FROM public.whatsapp_messages
   WHERE assessment_id = ANY (v_ids) OR contact_id = ANY (v_contacts);
  GET DIAGNOSTICS v_n_msgs = ROW_COUNT;

  DELETE FROM public.assessments WHERE id = ANY (v_ids);
  GET DIAGNOSTICS v_n_assess = ROW_COUNT;

  DELETE FROM public.contacts c
   WHERE c.id = ANY (v_contacts)
     AND NOT EXISTS (SELECT 1 FROM public.assessments a WHERE a.contact_id = c.id);
  GET DIAGNOSTICS v_n_contacts = ROW_COUNT;

  INSERT INTO public.audit_logs (clinic_id, actor_user_id, action, entity_type, entity_id, details)
  VALUES (v_clinic, p_actor, 'data_erased', 'assessment', p_assessment_id,
          jsonb_build_object('motivo', p_reason, 'triagens', v_n_assess,
                             'mensagens_removidas', v_n_msgs, 'contatos_removidos', v_n_contacts));

  RETURN jsonb_build_object('mode', 'excluir', 'triagens', v_n_assess,
                            'mensagens_removidas', v_n_msgs, 'contatos_removidos', v_n_contacts);
END;
$$;

-- Retenção: anonimiza triagens mais antigas que o prazo. NÃO agendada (decisão
-- do DPO/Dr. Saraiva). Processa em lotes para não segurar transação longa.
CREATE OR REPLACE FUNCTION public.anonymize_expired_assessments(
  p_older_than interval,
  p_actor      uuid DEFAULT NULL,
  p_limit      integer DEFAULT 200
)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  IF p_older_than < interval '30 days' THEN
    RAISE EXCEPTION 'prazo de retencao menor que 30 dias nao e permitido';
  END IF;
  FOR r IN
    SELECT id FROM public.assessments
     WHERE created_at < now() - p_older_than
       AND respondent_name <> '[titular removido]'
     ORDER BY created_at
     LIMIT greatest(1, p_limit)
  LOOP
    PERFORM public.anonymize_assessment(r.id, p_actor, 'fim_retencao', false);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.lgpd_subject_assessment_ids(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.anonymize_assessment(uuid, uuid, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.erase_assessment(uuid, uuid, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.anonymize_expired_assessments(interval, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lgpd_subject_assessment_ids(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.anonymize_assessment(uuid, uuid, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.erase_assessment(uuid, uuid, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.anonymize_expired_assessments(interval, uuid, integer) TO service_role;
