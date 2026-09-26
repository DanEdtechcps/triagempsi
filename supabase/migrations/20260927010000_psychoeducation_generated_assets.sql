-- ====================================================================
-- ASSETS GERADOS DE PSICOEDUCAÇÃO (IA) - TriagemPsi
-- ====================================================================
-- Um asset por formato gerado (leitura/quiz/flashcards/podcast/infografico/
-- video) dentro de um job da fila (psychoeducation_generation_jobs).
-- Tabela separada (não colunas em `psychoeducation_contents`) para permitir
-- aprovar/reprovar cada formato individualmente e adicionar formato novo
-- sem migração de coluna — mesmo espírito de tabela satélite já usado em
-- `assessment_psychoeducation`/`clinic_psychoeducation_settings`.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.psychoeducation_generated_assets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      uuid NOT NULL REFERENCES public.psychoeducation_generation_jobs(id) ON DELETE CASCADE,
  content_id  uuid NULL REFERENCES public.psychoeducation_contents(id) ON DELETE SET NULL,
  kind        text NOT NULL CHECK (kind IN ('leitura', 'quiz', 'flashcards', 'podcast', 'infografico', 'video')),
  body_md     text NULL,
  data_json   jsonb NULL,
  media_url   text NULL,
  status      text NOT NULL DEFAULT 'aguardando_aprovacao'
                CHECK (status IN ('aguardando_aprovacao', 'aprovado', 'rejeitado')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_psycho_gen_assets_job ON public.psychoeducation_generated_assets(job_id);
CREATE INDEX IF NOT EXISTS idx_psycho_gen_assets_content ON public.psychoeducation_generated_assets(content_id);

GRANT SELECT, INSERT, UPDATE ON public.psychoeducation_generated_assets TO authenticated;
GRANT ALL ON public.psychoeducation_generated_assets TO service_role;
-- Nunca GRANT a anon — o conteúdo publicado vive em psychoeducation_contents;
-- os assets crus da fila continuam privados mesmo depois de aprovados
-- (servem de histórico/auditoria, não de fonte pública).

ALTER TABLE public.psychoeducation_generated_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS psycho_gen_assets_team_read ON public.psychoeducation_generated_assets;
CREATE POLICY psycho_gen_assets_team_read ON public.psychoeducation_generated_assets
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.psychoeducation_generation_jobs j
    JOIN public.user_roles ur ON ur.user_id = auth.uid()
      AND (ur.clinic_id IS NULL OR ur.clinic_id = j.clinic_id)
    WHERE j.id = psychoeducation_generated_assets.job_id
  ));

DROP POLICY IF EXISTS psycho_gen_assets_admin_write ON public.psychoeducation_generated_assets;
CREATE POLICY psycho_gen_assets_admin_write ON public.psychoeducation_generated_assets
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role AND ur.clinic_id IS NULL
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role AND ur.clinic_id IS NULL
  ));
