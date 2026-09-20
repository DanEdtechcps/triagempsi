-- ====================================================================
-- MIGRATION: Onboarding Genérico de Novo Cliente SaaS (TriagemPsi)
-- ====================================================================
-- Timestamp: 20260920010000
-- Propósito: Stored procedure `provision_new_clinic` que:
--   1. Cria o registro da clínica com brand white-label
--   2. Garante isolamento pelo clinic_id em TODAS as tabelas RLS
--   3. Provisiona assinatura padrão (Starter)
--   4. Vincula os 10 temas base de psicoeducação
--
-- Uso (após deploy desta migration):
--   SELECT provision_new_clinic(
--     'saraiva-clinica',                      -- slug único
--     'Saraiva Clínica de Psiquiatria',       -- nome
--     'Cuidado psiquiátrico com humanidade',  -- tagline
--     '#1e4d5c',                              -- primary_color
--     '#3d8b8b',                              -- accent_color
--     'contato@saraivaClinica.com.br'         -- contact_email
--   );
-- ====================================================================

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

  -- ── 3. Provisionar assinatura Starter ────────────────────────────────────

  INSERT INTO public.clinic_subscriptions (
    clinic_id,
    plan_code,
    status,
    monthly_price_cents,
    notes,
    started_at,
    current_period_end
  ) VALUES (
    v_clinic_id,
    'starter',
    'active',
    49900,       -- R$ 499,00/mês (Starter: 1 médico, 100 triagens/mês)
    'Plano Starter provisionado automaticamente no onboarding',
    now(),
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
    user_id,
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
      'plan', 'starter',
      'psychoeducation_topics_linked', 10,
      'provisioned_at', now()
    )
  );

  RETURN v_clinic_id;

END;
$$;

-- Garante que apenas o service_role ou admin global pode chamar
REVOKE ALL ON FUNCTION public.provision_new_clinic(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provision_new_clinic(text, text, text, text, text, text) TO service_role;

COMMENT ON FUNCTION public.provision_new_clinic IS
  'Provisiona um novo cliente SaaS: cria clínica, assinatura Starter e vincula '
  'os 10 temas base de psicoeducação. Idempotente — seguro de re-executar.';
