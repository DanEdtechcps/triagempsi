-- Migration: 20260925093700_revoke_provision_new_clinic_from_anon.sql
--
-- Achado de segurança crítico ativo, pego pelo linter do Supabase logo após
-- aplicar 20260925090000_provision_new_clinic_atomic_v3.sql em produção: a
-- função é SECURITY DEFINER e o `REVOKE ALL ... FROM PUBLIC` daquela
-- migração não bloqueava `anon`/`authenticated` — Supabase expõe funções
-- SECURITY DEFINER via PostgREST independentemente de PUBLIC quando essas
-- roles têm GRANT próprio (herdado do momento da criação da função). Sem
-- este fix, qualquer requisição não autenticada a
-- `/rest/v1/rpc/provision_new_clinic` conseguia criar clínicas arbitrárias.
--
-- Revogado manualmente em produção em 2026-09-25 (logo após detectar via
-- `get_advisors`); esta migração só registra a mesma correção no histórico,
-- pra quem reconstruir o ambiente do zero (06_RUNBOOK_REPRODUCAO_DO_ZERO.md)
-- não reintroduzir a falha.

REVOKE EXECUTE ON FUNCTION public.provision_new_clinic(text, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_new_clinic(text, text, text, text, text, text, text) TO service_role;
