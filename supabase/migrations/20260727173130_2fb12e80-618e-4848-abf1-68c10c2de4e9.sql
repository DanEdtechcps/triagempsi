
DROP POLICY IF EXISTS "assessments_public_insert" ON public.assessments;
DROP POLICY IF EXISTS "scale_results_public_insert" ON public.scale_results;
REVOKE INSERT ON public.assessments FROM anon;
REVOKE INSERT ON public.scale_results FROM anon;

-- Invitations: também não precisa que anon leia diretamente; validação vai por server fn
DROP POLICY IF EXISTS "invitations_public_by_token" ON public.invitations;
REVOKE SELECT ON public.invitations FROM anon;
CREATE POLICY "invitations_staff_read" ON public.invitations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'clinico'));
