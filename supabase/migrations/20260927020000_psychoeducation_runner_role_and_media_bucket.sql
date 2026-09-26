-- ====================================================================
-- ROLE DE PRIVILÉGIO MÍNIMO PARA O RUNNER EXTERNO (FASE 2 — NotebookLM)
-- ====================================================================
-- O runner Python (content-pipeline/) roda numa máquina fora do Cloudflare
-- Worker e precisa de acesso ao banco. NUNCA recebe a SUPABASE_SERVICE_ROLE_KEY
-- (que ignora RLS e daria acesso irrestrito a assessments/contacts/notas
-- clínicas reais) nem uma role 'admin' comum (o padrão de RLS deste projeto
-- trata `user_roles.clinic_id IS NULL` como acesso GLOBAL em várias tabelas
-- clínicas, não só nestas duas). Em vez disso: uma role de login direto no
-- Postgres, sem GRANT em nenhuma outra tabela, com uma policy própria só
-- nestas duas tabelas — least privilege de verdade, verificável por GRANT,
-- não por confiar que o RLS de outras tabelas nunca vai casar com ela.
--
-- ATENÇÃO: a senha real foi definida diretamente no banco de produção via
-- MCP do Supabase (não fica em nenhum arquivo do repo) e vive só em
-- `content-pipeline/.env` (gitignored). O placeholder abaixo é só para o
-- histórico de migração ficar coerente — rodar este arquivo de novo do zero
-- exigiria trocar a senha manualmente (ou aceitar o padrão e trocar depois
-- com `ALTER ROLE ... PASSWORD ...`).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'psychoeducation_runner') THEN
    CREATE ROLE psychoeducation_runner WITH LOGIN PASSWORD 'TROCAR_NO_DASHBOARD_OU_CONTENT_PIPELINE_ENV';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO psychoeducation_runner;
GRANT SELECT, INSERT, UPDATE ON public.psychoeducation_generation_jobs TO psychoeducation_runner;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.psychoeducation_generated_assets TO psychoeducation_runner;
-- Só leitura do catálogo de tópicos (pra resolver título/slug ao montar o
-- material) — nunca escrita.
GRANT SELECT ON public.psychoeducation_topics TO psychoeducation_runner;

DROP POLICY IF EXISTS psycho_gen_jobs_runner_all ON public.psychoeducation_generation_jobs;
CREATE POLICY psycho_gen_jobs_runner_all ON public.psychoeducation_generation_jobs
  FOR ALL TO psychoeducation_runner
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS psycho_gen_assets_runner_all ON public.psychoeducation_generated_assets;
CREATE POLICY psycho_gen_assets_runner_all ON public.psychoeducation_generated_assets
  FOR ALL TO psychoeducation_runner
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS psycho_topics_runner_read ON public.psychoeducation_topics;
CREATE POLICY psycho_topics_runner_read ON public.psychoeducation_topics
  FOR SELECT TO psychoeducation_runner
  USING (true);

-- ====================================================================
-- BUCKET DE MÍDIA GERADA (Fase 2 — podcast/infográfico/vídeo)
-- ====================================================================
-- Mesmo padrão do bucket `landing` já existente: privado, servido só via
-- proxy público em src/routes/api/public/psychoeducation-asset.ts.
INSERT INTO storage.buckets (id, name, public)
VALUES ('psychoeducation-media', 'psychoeducation-media', false)
ON CONFLICT (id) DO NOTHING;

-- Só a role do runner escreve; leitura pelo bucket sempre via proxy usando
-- supabaseAdmin (service_role), então authenticated/anon não precisam de
-- policy de storage aqui.
DROP POLICY IF EXISTS psycho_media_runner_write ON storage.objects;
CREATE POLICY psycho_media_runner_write ON storage.objects
  FOR ALL TO psychoeducation_runner
  USING (bucket_id = 'psychoeducation-media')
  WITH CHECK (bucket_id = 'psychoeducation-media');
