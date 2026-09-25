-- Migration: 20260925090000_provision_new_clinic_atomic_v3.sql
--
-- Roadmap 2026-09-24, item #3 ("provisionamento de clínica não é repetível").
-- Reativa provision_new_clinic() como o ÚNICO caminho de criação de
-- consultório, chamado agora por createClinicAdmin (src/lib/admin.functions.ts)
-- via supabaseAdmin.rpc() em vez do INSERT simples que não criava
-- clinic_subscriptions nem clinic_psychoeducation_settings.
--
-- Duas mudanças de comportamento em relação à versão anterior
-- (20260923080100_fix_provision_new_clinic.sql):
--
--   1. O INSERT em clinics deixa de ter ON CONFLICT (slug) DO UPDATE. Essa
--      função agora é o caminho de "criar consultório novo" da UI de admin —
--      um slug duplicado deve abortar a transação inteira (erro 23505,
--      igual a uma violação de UNIQUE normal), nunca sobrescrever
--      silenciosamente nome/cores/contato de um tenant já existente. O
--      comportamento "idempotente" da versão anterior nunca teve um caller
--      real que precisasse dele (a função nunca foi chamada por código de
--      aplicação — confirmado por `grep -rn "provision_new_clinic" src`).
--   2. Novo parâmetro p_contact_phone, pra cobrir o campo que
--      createClinicAdmin já aceitava da UI e que ficaria de fora da
--      transação atômica se tivesse que ser gravado à parte depois.
--
-- Muda o número de parâmetros -> CREATE OR REPLACE não é suficiente (Postgres
-- não permite mudar a assinatura por OR REPLACE), por isso DROP + CREATE.
--
-- Atomicidade: todo o corpo roda como uma única transação de função — se
-- qualquer INSERT falhar (slug duplicado, FK de plano inválida, etc.), os
-- INSERTs anteriores dentro da mesma chamada são desfeitos automaticamente
-- (não há bloco EXCEPTION que capture e continue). Verificado de ponta a
-- ponta em scripts/verify-provision-clinic.sh (Postgres descartável via
-- Docker) — não requer acesso ao banco de produção.

DROP FUNCTION IF EXISTS public.provision_new_clinic(text, text, text, text, text, text);

CREATE FUNCTION public.provision_new_clinic(
  p_slug           text,
  p_name           text,
  p_tagline        text,
  p_primary_color  text DEFAULT '#1e4d5c',
  p_accent_color   text DEFAULT '#3d8b8b',
  p_contact_email  text DEFAULT NULL,
  p_contact_phone  text DEFAULT NULL
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

  -- ── 1. Validações de entrada ───────────────────────────────────────────

  IF p_slug IS NULL OR trim(p_slug) = '' THEN
    RAISE EXCEPTION 'provision_new_clinic: slug é obrigatório';
  END IF;
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'provision_new_clinic: name é obrigatório';
  END IF;
  IF p_slug !~ '^[a-z0-9][a-z0-9\-]{1,62}[a-z0-9]$' THEN
    RAISE EXCEPTION 'provision_new_clinic: slug inválido — use apenas minúsculas, dígitos e hifens (ex: "saraiva-clinica")';
  END IF;

  -- ── 2. Criar a clínica — sem ON CONFLICT: slug duplicado aborta tudo ───

  INSERT INTO public.clinics (
    slug, name, tagline, primary_color, accent_color, contact_email, contact_phone, is_active
  ) VALUES (
    trim(p_slug), trim(p_name), trim(p_tagline), p_primary_color, p_accent_color,
    p_contact_email, p_contact_phone, true
  )
  RETURNING id INTO v_clinic_id;

  -- ── 3. Provisionar assinatura de entrada, em trial (plano 'consultorio') ─

  SELECT monthly_price_cents INTO v_plan_price
  FROM public.plans WHERE code = 'consultorio';

  INSERT INTO public.clinic_subscriptions (
    clinic_id, plan_code, status, monthly_price_cents, notes,
    started_at, trial_ends_at, current_period_end
  ) VALUES (
    v_clinic_id, 'consultorio', 'trial', v_plan_price,
    'Plano Consultório provisionado automaticamente no onboarding (trial 30 dias)',
    now(), now() + interval '30 days', now() + interval '30 days'
  );

  -- ── 4. Vincular os 10 temas base de psicoeducação ──────────────────────

  INSERT INTO public.clinic_psychoeducation_settings (clinic_id, topic_id, is_enabled, auto_trigger)
  SELECT v_clinic_id, pt.id, true, true
  FROM public.psychoeducation_topics pt
  WHERE pt.is_active = true
  ORDER BY pt.sort_order ASC
  LIMIT 10;

  -- ── 5. Log de auditoria do provisionamento ─────────────────────────────

  INSERT INTO public.audit_logs (clinic_id, actor_user_id, action, entity_type, entity_id, details)
  VALUES (
    v_clinic_id,
    auth.uid(),      -- NULL quando chamado via service_role; createClinicAdmin
                      -- grava um audit_log adicional com o admin real via
                      -- recordAudit() (audit.server.ts), que não depende de JWT.
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

REVOKE ALL ON FUNCTION public.provision_new_clinic(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provision_new_clinic(text, text, text, text, text, text, text) TO service_role;

COMMENT ON FUNCTION public.provision_new_clinic IS
  'Provisiona atomicamente um novo consultório: clinics + clinic_subscriptions '
  '(trial Consultório) + clinic_psychoeducation_settings (10 temas base). Toda '
  'a operação roda em uma única transação — se qualquer etapa falhar (ex.: '
  'slug duplicado), nada é criado. Único caminho de criação de clínica; '
  'chamado por createClinicAdmin via supabaseAdmin.rpc().';
