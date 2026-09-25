-- Migration: 20260925103000_grant_anon_select_new_clinic_branding_columns.sql
--
-- Fix de incidente: 20260925100000_add_clinic_branding_fields.sql adicionou
-- 7 colunas em `clinics` (doctor_name, doctor_credentials, short_tagline,
-- city, disclaimer, consent_copy, emergency_message) mas não estendeu o
-- allowlist de colunas legível por `anon` criado em
-- 20260812020233_b9629912-70f0-4e52-82d8-85bd0e24d163.sql
-- (REVOKE SELECT ON clinics FROM anon; GRANT SELECT (lista fixa) ... TO anon).
-- getClinicBySlug (clinics.functions.ts) seleciona todas as colunas de uma
-- vez, então a falta de GRANT em qualquer uma delas derruba a query inteira
-- pra visitante anônimo — quebrou /saraiva e /lumina em produção pra todo
-- paciente (equipe logada, role authenticated, não foi afetada).
GRANT SELECT (
  doctor_name, doctor_credentials, short_tagline, city,
  disclaimer, consent_copy, emergency_message
) ON public.clinics TO anon;
