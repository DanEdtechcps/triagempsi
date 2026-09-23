-- Migration: 20260923080200_provision_lumina_subscription.sql
--
-- A migração original de provisionamento do Lumina (20260919200000) nunca
-- rodou com sucesso (plan_code/status inválidos abortavam a transação) —
-- confirmado: não existe nenhuma linha em clinic_subscriptions pra Lumina em
-- produção hoje. Cria a assinatura que deveria ter sido provisionada,
-- idempotente via ON CONFLICT (id).

INSERT INTO public.clinic_subscriptions (
  id,
  clinic_id,
  plan_code,
  status,
  monthly_price_cents,
  notes,
  started_at,
  current_period_end
)
SELECT
  '50000000-0000-4000-8000-000000000002'::uuid,
  c.id,
  'clinica',
  'ativa',
  240000,
  'Plano Clínica — provisionamento corrigido em 2026-09-23 (a migração original nunca rodou com sucesso em produção)',
  now(),
  now() + interval '1 year'
FROM public.clinics c
WHERE c.slug = 'lumina'
ON CONFLICT (id) DO NOTHING;
