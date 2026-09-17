CREATE TABLE public.assessment_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL,
  author_user_id uuid,
  author_email text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX assessment_notes_assessment_idx ON public.assessment_notes(assessment_id, created_at DESC);

GRANT SELECT, INSERT ON public.assessment_notes TO authenticated;
GRANT ALL ON public.assessment_notes TO service_role;

ALTER TABLE public.assessment_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY assessment_notes_staff_read ON public.assessment_notes
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
    AND (ur.clinic_id IS NULL OR ur.clinic_id = assessment_notes.clinic_id)
));

CREATE POLICY assessment_notes_staff_insert ON public.assessment_notes
FOR INSERT TO authenticated
WITH CHECK (
  author_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (ur.clinic_id IS NULL OR ur.clinic_id = assessment_notes.clinic_id)
  )
);

CREATE TRIGGER update_assessment_notes_updated_at
BEFORE UPDATE ON public.assessment_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();