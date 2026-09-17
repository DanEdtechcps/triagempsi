ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS respondent_type text NOT NULL DEFAULT 'paciente',
  ADD COLUMN IF NOT EXISTS informant_name text,
  ADD COLUMN IF NOT EXISTS informant_relation text;

ALTER TABLE public.assessments
  ADD CONSTRAINT assessments_respondent_type_check
  CHECK (respondent_type IN ('paciente', 'familiar'));