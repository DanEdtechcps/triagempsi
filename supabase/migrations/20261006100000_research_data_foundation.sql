-- ====================================================================
-- Base de dados para PESQUISA (mestrado/estudos de acurácia) — Psiqway
-- ====================================================================
-- 1) Portão por clínica: a pesquisa só liga com protocolo do CEP (CAAE) e TCLE
--    cadastrados. Sem isso o consentimento de pesquisa nem aparece ao paciente
--    e a exportação recusa.
-- 2) Consentimento de pesquisa por triagem, SEPARADO do consentimento clínico:
--    opcional, com versão e hash do texto exato mostrado (prova).
-- 3) Desfecho clínico (impressão do psiquiatra após a consulta): é o dado que
--    permite medir sensibilidade, especificidade, VPP e VPN do conjunto.
-- RLS obrigatório em tabela nova; nada é exposto a `anon`.
-- ====================================================================

-- 1) Clínica -----------------------------------------------------------
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS research_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS research_protocol text NULL,
  ADD COLUMN IF NOT EXISTS research_tcle_text text NULL,
  ADD COLUMN IF NOT EXISTS research_tcle_version text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clinics_research_requires_protocol'
  ) THEN
    ALTER TABLE public.clinics
      ADD CONSTRAINT clinics_research_requires_protocol CHECK (
        NOT research_enabled OR (
          nullif(btrim(research_protocol), '') IS NOT NULL
          AND nullif(btrim(research_tcle_text), '') IS NOT NULL
          AND nullif(btrim(research_tcle_version), '') IS NOT NULL
        )
      );
  END IF;
END $$;

-- 2) Consentimento de pesquisa na triagem ------------------------------
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS research_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS research_consent_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS research_consent_version text NULL,
  ADD COLUMN IF NOT EXISTS research_consent_sha256 text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assessments_research_consent_proof'
  ) THEN
    ALTER TABLE public.assessments
      ADD CONSTRAINT assessments_research_consent_proof CHECK (
        NOT research_consent OR (
          research_consent_at IS NOT NULL
          AND research_consent_version IS NOT NULL
          AND research_consent_sha256 IS NOT NULL
        )
      );
  END IF;
END $$;

-- 3) Desfecho clínico ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assessment_outcomes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id   uuid NOT NULL UNIQUE REFERENCES public.assessments(id) ON DELETE CASCADE,
  clinic_id       uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  recorded_by     uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  -- O psiquiatra concorda com a classificação da pré-triagem?
  concordance     text NOT NULL
                    CHECK (concordance IN ('concorda', 'concorda_parcialmente', 'nao_concorda')),
  -- Risco avaliado na consulta (padrão de referência para a via de risco).
  risk_assessment text NOT NULL DEFAULT 'nao_avaliado'
                    CHECK (risk_assessment IN ('risco_confirmado', 'risco_nao_confirmado', 'nao_avaliado')),
  -- Diagnóstico(s) final(is) CID-10, sem texto livre (evita dado pessoal solto).
  final_dx_icd10  text[] NULL
                    CHECK (final_dx_icd10 IS NULL OR array_length(final_dx_icd10, 1) <= 5),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assessment_outcomes_clinic ON public.assessment_outcomes(clinic_id);

-- A clínica do desfecho é sempre a da triagem (impede gravar em outro tenant).
CREATE OR REPLACE FUNCTION public.assessment_outcomes_sync_clinic()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_clinic uuid;
BEGIN
  SELECT clinic_id INTO v_clinic FROM public.assessments WHERE id = NEW.assessment_id;
  IF v_clinic IS NULL THEN
    RAISE EXCEPTION 'Triagem inexistente para o desfecho';
  END IF;
  NEW.clinic_id := v_clinic;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assessment_outcomes_sync_clinic ON public.assessment_outcomes;
CREATE TRIGGER trg_assessment_outcomes_sync_clinic
  BEFORE INSERT OR UPDATE ON public.assessment_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.assessment_outcomes_sync_clinic();

GRANT SELECT, INSERT, UPDATE ON public.assessment_outcomes TO authenticated;
GRANT ALL ON public.assessment_outcomes TO service_role;
-- Nunca GRANT a anon; sem DELETE (o desfecho some só em cascata com a triagem).

ALTER TABLE public.assessment_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS assessment_outcomes_team_read ON public.assessment_outcomes;
CREATE POLICY assessment_outcomes_team_read ON public.assessment_outcomes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (ur.clinic_id IS NULL OR ur.clinic_id = assessment_outcomes.clinic_id)
  ));

DROP POLICY IF EXISTS assessment_outcomes_clinician_insert ON public.assessment_outcomes;
CREATE POLICY assessment_outcomes_clinician_insert ON public.assessment_outcomes
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin'::public.app_role, 'doctor'::public.app_role)
      AND (ur.clinic_id IS NULL OR ur.clinic_id = (
        SELECT a.clinic_id FROM public.assessments a WHERE a.id = assessment_outcomes.assessment_id
      ))
  ));

DROP POLICY IF EXISTS assessment_outcomes_clinician_update ON public.assessment_outcomes;
CREATE POLICY assessment_outcomes_clinician_update ON public.assessment_outcomes
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin'::public.app_role, 'doctor'::public.app_role)
      AND (ur.clinic_id IS NULL OR ur.clinic_id = assessment_outcomes.clinic_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin'::public.app_role, 'doctor'::public.app_role)
      AND (ur.clinic_id IS NULL OR ur.clinic_id = assessment_outcomes.clinic_id)
  ));

-- O paciente (anon) precisa LER o TCLE e o protocolo para decidir; nada secreto aqui.
-- (clinics só libera colunas específicas a anon — ver 20260812020233.)
GRANT SELECT (research_enabled, research_protocol, research_tcle_text, research_tcle_version)
  ON public.clinics TO anon;
