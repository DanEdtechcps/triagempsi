-- Leitura do paciente sobre as PRÓPRIAS triagens, vinculadas pelo e-mail
-- verificado da conta (a confirmação de e-mail é obrigatória para ter sessão).
-- Política permissiva adicional: soma-se às políticas de equipe já existentes.

GRANT SELECT ON public.assessments TO authenticated;
GRANT SELECT ON public.scale_results TO authenticated;

CREATE POLICY assessments_patient_read
  ON public.assessments
  FOR SELECT
  TO authenticated
  USING (
    lower(trim(respondent_email)) = lower(trim(auth.jwt() ->> 'email'))
  );

CREATE POLICY scale_results_patient_read
  ON public.scale_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.assessments a
      WHERE a.id = scale_results.assessment_id
        AND lower(trim(a.respondent_email)) = lower(trim(auth.jwt() ->> 'email'))
    )
  );