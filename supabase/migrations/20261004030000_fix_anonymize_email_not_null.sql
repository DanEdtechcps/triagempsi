-- Correção de 20261004020000_lgpd_erasure_and_retention.sql (já aplicada, por isso
-- NÃO editada): assessments.respondent_email é NOT NULL, então anonymize_assessment
-- falhava com "null value violates not-null constraint". Em vez de NULL, grava um
-- valor ÚNICO por linha em domínio reservado (RFC 6761 .invalid), assim linhas
-- anonimizadas nunca se agrupam como se fossem a mesma pessoa.
-- Achado ao testar a função com uma triagem fictícia em transação desfeita.

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
         respondent_email    = 'removido+' || id::text || '@anonimizado.invalid',
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

REVOKE ALL ON FUNCTION public.anonymize_assessment(uuid, uuid, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonymize_assessment(uuid, uuid, text, boolean) TO service_role;
