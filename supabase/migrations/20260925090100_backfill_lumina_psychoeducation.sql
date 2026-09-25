-- Migration: 20260925090100_backfill_lumina_psychoeducation.sql
--
-- Roadmap 2026-09-24, item #3, passo 4: tratar a clínica Lumina existente.
--
-- clinic_subscriptions da Lumina já foi corrigida em
-- 20260923080200_provision_lumina_subscription.sql. O que nunca foi
-- provisionado é clinic_psychoeducation_settings: a migração que criou os 10
-- temas oficiais (20260917230000_psychoeducation_module.sql) semeou apenas os
-- temas globais — não vinculou nenhuma clínica existente a eles, porque
-- nenhum código de provisionamento rodava naquele momento. Sem isso, o
-- módulo de psicoeducação da Lumina fica com a tabela de configuração vazia.
--
-- ATENÇÃO — verificação antes de aplicar em produção: rode a query abaixo no
-- SQL Editor do Supabase e confirme que a contagem de settings está mesmo
-- zerada antes de aplicar esta migration (este projeto não usa
-- supabase_migrations.schema_migrations — migrações locais podem já ter sido
-- aplicadas manualmente sem deixar rastro; não assuma, confira):
--
--   SELECT c.slug,
--          (SELECT count(*) FROM public.clinic_subscriptions cs WHERE cs.clinic_id = c.id) AS subs,
--          (SELECT count(*) FROM public.clinic_psychoeducation_settings ps WHERE ps.clinic_id = c.id) AS psycho_settings
--   FROM public.clinics c
--   WHERE c.slug = 'lumina';
--
-- Não usa provision_new_clinic() de propósito: essa função também
-- sobrescreveria name/tagline/cores/contato da Lumina com os valores
-- passados como argumento, arriscando divergir dos dados reais de produção
-- (já corretos, per auditoria 2026-09-20/21). Este backfill é cirúrgico —
-- só insere o que está comprovadamente faltando, sem tocar em mais nada.

INSERT INTO public.clinic_psychoeducation_settings (clinic_id, topic_id, is_enabled, auto_trigger)
SELECT c.id, pt.id, true, true
FROM public.clinics c
CROSS JOIN public.psychoeducation_topics pt
WHERE c.slug = 'lumina'
  AND pt.is_active = true
ORDER BY pt.sort_order ASC
LIMIT 10
ON CONFLICT (clinic_id, topic_id) DO NOTHING;

-- Salvaguarda idempotente (no-op se já existir, graças ao UNIQUE(clinic_id)
-- de clinic_subscriptions): garante que a Lumina nunca fique sem assinatura
-- mesmo que 20260923080200 não tenha rodado neste ambiente.
INSERT INTO public.clinic_subscriptions (
  clinic_id, plan_code, status, monthly_price_cents, notes, started_at, current_period_end
)
SELECT c.id, 'clinica', 'ativa', 240000,
  'Salvaguarda idempotente (roadmap item #3, 2026-09-25) — no-op se já existir',
  now(), now() + interval '1 year'
FROM public.clinics c
WHERE c.slug = 'lumina'
ON CONFLICT (clinic_id) DO NOTHING;
