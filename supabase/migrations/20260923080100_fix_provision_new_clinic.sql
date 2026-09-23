-- Migration: 20260923080100_fix_provision_new_clinic.sql
--
-- provision_new_clinic() (20260920010000) tinha 3 bugs independentes que
-- abortavam a função inteira, cada um sozinho já suficiente pra rollback de
-- toda a transação (clínica + assinatura + vínculo de temas juntos):
--   1. plan_code => 'starter' não existe em public.plans (só 'consultorio',
--      'clinica', 'instituicao' existem) — violava a FK.
--   2. status => 'active' não é um valor válido do CHECK de
--      clinic_subscriptions.status (precisa ser 'trial'/'ativa'/...).
--   3. Gravava audit_logs.user_id, mas a coluna real é actor_user_id.
--
-- CREATE OR REPLACE mantém o mesmo nome/assinatura, corrigindo a função
-- existente sem precisar de DROP.

CREATE OR REPLACE FUNCTION public.provision_new_clinic(
  p_slug           text,
  p_name           text,
  p_tagline        text,
  p_primary_color  text DEFAULT '#1e4d5c',
  p_accent_color   text DEFAULT '#3d8b8b',
  p_contact_email  text DEFAULT NULL
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

  -- ── 1. Validações de entrada ───────────────────────────────────────────────

  IF p_slug IS NULL OR trim(p_slug) = '' THEN
    RAISE EXCEPTION 'provision_new_clinic: slug é obrigatório';
  END IF;
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'provision_new_clinic: name é obrigatório';
  END IF;

  -- Slug: apenas lowercase, letras, dígitos e hifens
  IF p_slug !~ '^[a-z0-9][a-z0-9\-]{1,62}[a-z0-9]$' THEN
    RAISE EXCEPTION 'provision_new_clinic: slug inválido — use apenas minúsculas, dígitos e hifens (ex: "saraiva-clinica")';
  END IF;

  -- ── 2. Inserir clínica (idempotente via ON CONFLICT) ─────────────────────

  INSERT INTO public.clinics (
    slug,
    name,
    tagline,
    primary_color,
    accent_color,
    contact_email,
    is_active
  ) VALUES (
    trim(p_slug),
    trim(p_name),
    trim(p_tagline),
    p_primary_color,
    p_accent_color,
    p_contact_email,
    true
  )
  ON CONFLICT (slug) DO UPDATE SET
    name          = EXCLUDED.name,
    tagline       = EXCLUDED.tagline,
    primary_color = EXCLUDED.primary_color,
    accent_color  = EXCLUDED.accent_color,
    contact_email = COALESCE(EXCLUDED.contact_email, clinics.contact_email),
    is_active     = true,
    updated_at    = now()
  RETURNING id INTO v_clinic_id;

  -- ── 3. Provisionar assinatura de entrada, em trial (plano 'consultorio') ──

  SELECT monthly_price_cents INTO v_plan_price
  FROM public.plans WHERE code = 'consultorio';

  INSERT INTO public.clinic_subscriptions (
    clinic_id,
    plan_code,
    status,
    monthly_price_cents,
    notes,
    started_at,
    trial_ends_at,
    current_period_end
  ) VALUES (
    v_clinic_id,
    'consultorio',
    'trial',
    v_plan_price,
    'Plano Consultório provisionado automaticamente no onboarding (trial 30 dias)',
    now(),
    now() + interval '30 days',
    now() + interval '30 days'
  )
  ON CONFLICT DO NOTHING;

  -- ── 4. Vincular os 10 temas base de psicoeducação ────────────────────────
  --
  -- Os temas são globais (sem clinic_id na tabela psychoeducation_topics).
  -- A tabela clinic_psychoeducation_settings liga cada clínica aos temas
  -- que ela ativou, com opção de custom_intro por clínica.
  --
  -- Seleciona os 10 primeiros temas ativos por sort_order.

  INSERT INTO public.clinic_psychoeducation_settings (
    clinic_id,
    topic_id,
    is_enabled,
    auto_trigger
  )
  SELECT
    v_clinic_id,
    pt.id,
    true,    -- todos habilitados por padrão
    true     -- auto-trigger no fluxo de triagem
  FROM public.psychoeducation_topics pt
  WHERE pt.is_active = true
  ORDER BY pt.sort_order ASC
  LIMIT 10
  ON CONFLICT (clinic_id, topic_id) DO NOTHING;

  -- ── 5. Log de auditoria do provisionamento ───────────────────────────────

  INSERT INTO public.audit_logs (
    clinic_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    v_clinic_id,
    auth.uid(),      -- NULL se chamado via service_role (migration direta)
    'PROVISION_CLINIC',
    'clinic',
    v_clinic_id,
    jsonb_build_object(
      'slug', p_slug,
      'name', p_name,
      'plan', 'consultorio',
      'psychoeducation_topics_linked', 10,
      'provisioned_at', now()
    )
  );

  RETURN v_clinic_id;

END;
$$;

COMMENT ON FUNCTION public.provision_new_clinic IS
  'Provisiona um novo cliente SaaS: cria clínica, assinatura trial no plano '
  'Consultório e vincula os 10 temas base de psicoeducação. Idempotente — '
  'seguro de re-executar.';
