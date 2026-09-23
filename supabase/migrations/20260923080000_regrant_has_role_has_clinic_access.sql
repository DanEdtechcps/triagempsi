-- Migration: 20260923080000_regrant_has_role_has_clinic_access.sql
--
-- has_role()/has_clinic_access() tiveram EXECUTE revogado de `authenticated`
-- em 2026-07-28 e nunca regravado (toda redefinição usa CREATE OR REPLACE,
-- que preserva a ACL antiga). Policies que chamam essas funções direto
-- (clinic_subscriptions_team_read, patient_longitudinal_records_team_*,
-- clinic_psycho_manage e outras) falhariam com "permission denied" para um
-- usuário comum — hoje inofensivo só porque o código sempre usa
-- supabaseAdmin nessas tabelas, mas RLS não é uma defesa funcional ali.

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_clinic_access(uuid) TO authenticated;
