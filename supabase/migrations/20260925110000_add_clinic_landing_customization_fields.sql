-- Migration: 20260925110000_add_clinic_landing_customization_fields.sql
--
-- Item: ferramenta interna de branding/landing por clínica. Hoje o H1
-- principal e os 3 cards de destaque de $slug.index.tsx são 100% hardcoded
-- no componente, iguais para toda clínica, e não existe coluna de fonte —
-- ClinicTheme.tsx só varia cor. Esta migration adiciona os campos que
-- faltam para que headline, cards de destaque, fonte e imagem de hero
-- venham do banco, com fallback genérico seguro via resolveBranding()
-- (src/config/branding.ts) quando a clínica não preencher.
--
-- GRANT na MESMA migration que cria as colunas — 20260925100000 esqueceu
-- disso e quebrou /saraiva e /lumina em produção para todo visitante
-- anônimo, corrigido só depois em 20260925103000. Não repetir esse erro.

ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS landing_headline text,
  ADD COLUMN IF NOT EXISTS landing_font_preset text NOT NULL DEFAULT 'default'
    CHECK (landing_font_preset IN (
      'default', 'editorial-serif', 'modern-sans', 'warm-humanist', 'bold-grotesk'
    )),
  ADD COLUMN IF NOT EXISTS landing_feature_cards jsonb,
  ADD COLUMN IF NOT EXISTS landing_hero_image_url text;

-- Backfill de Saraiva e Lumina com o texto hoje hardcoded em
-- $slug.index.tsx, para que a migration não mude nada visualmente nas
-- duas clínicas reais em produção.
UPDATE public.clinics SET
  landing_headline = 'Uma primeira consulta mais produtiva começa aqui.',
  landing_font_preset = 'default',
  landing_feature_cards = '[
    {"title":"Confidencial","description":"Suas respostas ficam disponíveis apenas para a equipe clínica responsável."},
    {"title":"Instrumentos validados","description":"Escalas de rastreio reconhecidas, abertas conforme o que você relatar."},
    {"title":"No seu tempo","description":"Responda pelo celular, no seu ritmo. Se parar, retomamos de onde ficou."}
  ]'::jsonb
WHERE slug IN ('saraiva', 'lumina');

GRANT SELECT (
  landing_headline, landing_font_preset, landing_feature_cards, landing_hero_image_url
) ON public.clinics TO anon;
