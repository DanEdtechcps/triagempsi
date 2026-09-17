ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS symptom_path jsonb NOT NULL DEFAULT '[]'::jsonb;