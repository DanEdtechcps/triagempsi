-- ====================================================================
-- FILA DE GERAÇÃO DE PSICOEDUCAÇÃO (IA) - TriagemPsi
-- ====================================================================
-- Extensão do módulo de psicoeducação (20260917230000_psychoeducation_module.sql)
-- para gerar conteúdo assistido por IA (leitura/quiz/flashcards via
-- Cloudflare Workers AI na Fase 1; podcast/vídeo/infográfico via um runner
-- externo na Fase 2 — ver `documentação viva/` para o plano completo).
--
-- Esta tabela é a fila de aprovação humana: nenhuma geração publica sozinha.
-- Só `approvePsychoeducationGenerationJob` (server function) marca
-- `psychoeducation_contents.is_published = true`. RLS segue o único padrão
-- vigente no projeto (subquery inline contra `user_roles`, consolidado em
-- 20260925090000_unify_rls_to_inline_subquery.sql) — nunca os helpers
-- `has_clinic_access()`/`is_global_admin()`, que foram removidos.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.psychoeducation_generation_jobs (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id                   uuid NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  topic_id                    uuid NULL REFERENCES public.psychoeducation_topics(id) ON DELETE SET NULL,
  topic_title_draft           text NULL,
  source_material             text NOT NULL,
  -- Trava de aplicação, não só de UI: nenhum job sai de "pendente" sem essa
  -- confirmação explícita do admin de que o material colado não contém
  -- prontuário/dado de paciente (só diretriz clínica genérica).
  confirmed_no_patient_data   boolean NOT NULL DEFAULT false,
  requested_formats           text[] NOT NULL,
  engine                      text NOT NULL CHECK (engine IN ('workers_ai', 'notebooklm')),
  status                      text NOT NULL DEFAULT 'pendente'
                                CHECK (status IN ('pendente', 'gerando', 'aguardando_aprovacao', 'aprovado', 'rejeitado', 'erro')),
  qc_notes                    text[] NULL,
  notebook_id                 text NULL,
  error_message               text NULL,
  rejection_reason            text NULL,
  requested_by                uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by                 uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT psycho_gen_jobs_requires_topic_or_draft
    CHECK (topic_id IS NOT NULL OR topic_title_draft IS NOT NULL),
  CONSTRAINT psycho_gen_jobs_requires_patient_data_confirmation
    CHECK (status = 'pendente' OR confirmed_no_patient_data = true)
);

CREATE INDEX IF NOT EXISTS idx_psycho_gen_jobs_clinic ON public.psychoeducation_generation_jobs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_psycho_gen_jobs_status ON public.psychoeducation_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_psycho_gen_jobs_topic ON public.psychoeducation_generation_jobs(topic_id);

GRANT SELECT, INSERT, UPDATE ON public.psychoeducation_generation_jobs TO authenticated;
GRANT ALL ON public.psychoeducation_generation_jobs TO service_role;
-- Nunca GRANT a anon — fila de trabalho interna, nunca pública.

ALTER TABLE public.psychoeducation_generation_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS psycho_gen_jobs_team_read ON public.psychoeducation_generation_jobs;
CREATE POLICY psycho_gen_jobs_team_read ON public.psychoeducation_generation_jobs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (ur.clinic_id IS NULL OR ur.clinic_id = psychoeducation_generation_jobs.clinic_id)
  ));

DROP POLICY IF EXISTS psycho_gen_jobs_admin_write ON public.psychoeducation_generation_jobs;
CREATE POLICY psycho_gen_jobs_admin_write ON public.psychoeducation_generation_jobs
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role AND ur.clinic_id IS NULL
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role AND ur.clinic_id IS NULL
  ));
