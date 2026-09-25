-- Migration: 20260925100000_add_clinic_branding_fields.sql
--
-- Item #4 do roadmap (ROADMAP_ESCALA_SAAS_2026-09-24.md): src/config/branding.ts
-- hardcodava BRANDING (Saraiva) e LUMINA_BRANDING como objetos completos no
-- código, e resolveBranding() caía no fallback "Saraiva" pra qualquer campo
-- ausente de QUALQUER clínica nova — incluindo nome do médico, CRM e textos
-- legais de emergência de outra clínica. Esta migration adiciona os campos
-- que faltavam em `clinics` pra que o branding venha 100% do banco, com
-- default genérico e seguro (nunca dado real de uma clínica específica).

ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS doctor_name text,
  ADD COLUMN IF NOT EXISTS doctor_credentials text,
  ADD COLUMN IF NOT EXISTS short_tagline text,
  ADD COLUMN IF NOT EXISTS city text;

-- Disclaimer, consentimento LGPD e mensagem de acolhimento em crise: texto
-- genérico já usado hoje por TODAS as clínicas (Saraiva e Lumina reusam o
-- mesmo texto fixo em src/config/branding.ts) — CVV 188 / SAMU 192 são
-- serviços nacionais, não branding de uma clínica específica. Vira DEFAULT
-- de verdade em vez de hardcode no código-fonte, com espaço pra override por
-- clínica se algum dia for necessário.
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS disclaimer text NOT NULL DEFAULT
    'Este questionário é um instrumento de pré-avaliação clínica e não substitui uma consulta médica. Em caso de emergência, ligue 192 (SAMU) ou 188 (CVV).',
  ADD COLUMN IF NOT EXISTS consent_copy text NOT NULL DEFAULT
    'Concordo em compartilhar estas informações com a equipe de saúde para fins exclusivos do meu atendimento médico, em conformidade com a LGPD e o Código de Ética Médica.',
  ADD COLUMN IF NOT EXISTS emergency_message text NOT NULL DEFAULT
    'Seus sentimentos e seu sofrimento são importantes para nós. Se você está passando por um momento difícil, com pensamentos de morte ou de se machucar, saiba que você não está sozinho(a) e que existe ajuda imediata disponível agora.';

-- Backfill dos dados reais de Saraiva e Lumina que hoje só existiam
-- hardcoded em BRANDING/LUMINA_BRANDING (src/config/branding.ts). Sem isso o
-- comportamento visível pro paciente dessas duas clínicas mudaria — ex.: o
-- e-mail de contato da Saraiva sumiria do rodapé da landing, que hoje só
-- aparece por causa do fallback hardcoded que esta mudança remove.
UPDATE public.clinics
SET
  doctor_name = 'Dr. José Ribamar Fernandes Saraiva Junior',
  doctor_credentials = 'CRM-RS 29349 | RQE 30038',
  short_tagline = 'Psiquiatria que acolhe e orienta',
  city = 'Passo Fundo/RS',
  contact_email = coalesce(contact_email, 'contato@clinicasaraiva.med.br')
WHERE slug = 'saraiva';

UPDATE public.clinics
SET
  doctor_name = 'Dr. Gustavo Mello',
  doctor_credentials = 'CRM 198765-SP · Psiquiatria de Adultos & Neurociências',
  short_tagline = 'Psiquiatria de Precisão & Neurociências',
  city = 'São Paulo/SP'
WHERE slug = 'lumina';
