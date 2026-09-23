-- Migration: 20260923070100_fix_lumina_slug.sql
--
-- O commit 47d3b8e corrigiu a rota pública do Instituto Lumina de /lumina-saude
-- para /lumina (a rota antiga dava 404) mas a correção foi aplicada direto em
-- produção via SQL, nunca versionada. A migração original de provisionamento
-- (20260919200000_provision_lumina_saude.sql) continua gravando 'lumina-saude'
-- — rodar o runbook de reprodução do zero hoje reintroduziria o bug de 404.
-- Este UPDATE é idempotente: não faz nada se o slug já estiver correto.

UPDATE public.clinics
SET slug = 'lumina'
WHERE slug = 'lumina-saude';
