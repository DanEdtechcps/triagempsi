-- Migration: 20260926000000_provision_new_clinic_plan_and_status.sql
--
-- Achado de UX/onboarding: provision_new_clinic() sempre criava a clínica
-- com plan_code='consultorio' e status='trial' fixos — quem cria a clínica
-- na UI (createClinicAdmin) não tinha como escolher o plano realmente
-- contratado pelo cliente pagante nem marcar a assinatura como já ativa
-- (sem período de teste). Adiciona p_plan_code e p_status como novos
-- parâmetros opcionais, no fim da lista (mudam o número de argumentos —
-- por isso DROP + CREATE, igual às trocas de assinatura anteriores desta
-- função — CREATE OR REPLACE não é suficiente).
--
-- Muda o número de parâmetros de 7 para 9 -> precisa de novo DROP + CREATE
-- (mesma razão de 20260925090000_provision_new_clinic_atomic_v3.sql).

DROP FUNCTION IF EXISTS public.provision_new_clinic(text, text, text, text, text, text, text);

CREATE FUNCTION public.provision_new_clinic(
  p_slug           text,
  p_name           text,
  p_tagline        text,
  p_primary_color  text DEFAULT '#1e4d5c',
  p_accent_color   text DEFAULT '#3d8b8b',
  p_contact_email  text DEFAULT NULL,
  p_contact_phone  text DEFAULT NULL,
  p_plan_code      text DEFAULT 'consultorio',
  p_status         text DEFAULT 'trial'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinic_id uuid;
  v_plan_price integer;
BEGIN

  IF p_slug IS NULL OR trim(p_slug) = '' THEN
    RAISE EXCEPTION 'provision_new_clinic: slug é obrigatório';
  END IF;
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'provision_new_clinic: name é obrigatório';
  END IF;
  IF p_slug !~ '^[a-z0-9][a-z0-9\-]{1,62}[a-z0-9]$' THEN
    RAISE EXCEPTION 'provision_new_clinic: slug inválido — use apenas minúsculas, dígitos e hifens (ex: "saraiva-clinica")';
  END IF;
  IF p_plan_code NOT IN ('consultorio', 'clinica', 'instituicao') THEN
    RAISE EXCEPTION 'provision_new_clinic: plano inválido — use consultorio, clinica ou instituicao';
  END IF;
  IF p_status NOT IN ('trial', 'ativa') THEN
    RAISE EXCEPTION 'provision_new_clinic: status inválido no provisionamento — use trial ou ativa (demais status só fazem sentido depois, via ciclo de vida da assinatura)';
  END IF;

  INSERT INTO public.clinics (
    slug, name, tagline, primary_color, accent_color, contact_email, contact_phone, is_active
  ) VALUES (
    trim(p_slug), trim(p_name), trim(p_tagline), p_primary_color, p_accent_color,
    p_contact_email, p_contact_phone, true
  )
  RETURNING id INTO v_clinic_id;

  SELECT monthly_price_cents INTO v_plan_price
  FROM public.plans WHERE code = p_plan_code;

  INSERT INTO public.clinic_subscriptions (
    clinic_id, plan_code, status, monthly_price_cents, notes,
    started_at, trial_ends_at, current_period_end
  ) VALUES (
    v_clinic_id, p_plan_code, p_status, v_plan_price,
    CASE WHEN p_status = 'trial'
      THEN 'Plano provisionado automaticamente no onboarding (trial 30 dias)'
      ELSE 'Assinatura contratada, ativada diretamente no onboarding (sem período de teste)'
    END,
    now(),
    CASE WHEN p_status = 'trial' THEN now() + interval '30 days' ELSE NULL END,
    CASE WHEN p_status = 'trial' THEN now() + interval '30 days' ELSE now() + interval '1 year' END
  );

  INSERT INTO public.clinic_psychoeducation_settings (clinic_id, topic_id, is_enabled, auto_trigger)
  SELECT v_clinic_id, pt.id, true, true
  FROM public.psychoeducation_topics pt
  WHERE pt.is_active = true
  ORDER BY pt.sort_order ASC
  LIMIT 10;

  INSERT INTO public.audit_logs (clinic_id, actor_user_id, action, entity_type, entity_id, details)
  VALUES (
    v_clinic_id,
    auth.uid(),
    'PROVISION_CLINIC',
    'clinic',
    v_clinic_id,
    jsonb_build_object(
      'slug', p_slug,
      'name', p_name,
      'plan', p_plan_code,
      'status', p_status,
      'psychoeducation_topics_linked', 10,
      'provisioned_at', now()
    )
  );

  RETURN v_clinic_id;

END;
$$;

-- CREATE (sem OR REPLACE, por causa do DROP acima) reseta os grants —
-- reaplica as duas camadas de segurança já estabelecidas: função só
-- executável por service_role (nunca por client-side anon/authenticated,
-- achado crítico corrigido em 20260925093700_revoke_provision_new_clinic_from_anon.sql).
REVOKE ALL ON FUNCTION public.provision_new_clinic(text, text, text, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_new_clinic(text, text, text, text, text, text, text, text, text) TO service_role;

COMMENT ON FUNCTION public.provision_new_clinic IS
  'Provisiona atomicamente um novo consultório: clinics + clinic_subscriptions '
  '(plano e status escolhidos no onboarding, default consultorio/trial) + '
  'clinic_psychoeducation_settings (10 temas base). Toda a operação roda em '
  'uma única transação. Único caminho de criação de clínica; chamado por '
  'createClinicAdmin via supabaseAdmin.rpc().';
