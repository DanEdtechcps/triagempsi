-- assessments
DROP POLICY IF EXISTS assessments_staff_read ON public.assessments;
DROP POLICY IF EXISTS assessments_admin_write ON public.assessments;
DROP POLICY IF EXISTS assessments_admin_delete ON public.assessments;

CREATE POLICY assessments_staff_read ON public.assessments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND (ur.clinic_id IS NULL OR ur.clinic_id = assessments.clinic_id)));

CREATE POLICY assessments_admin_write ON public.assessments FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND (ur.clinic_id IS NULL OR ur.clinic_id = assessments.clinic_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND (ur.clinic_id IS NULL OR ur.clinic_id = assessments.clinic_id)));

CREATE POLICY assessments_admin_delete ON public.assessments FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND (ur.clinic_id IS NULL OR ur.clinic_id = assessments.clinic_id)));

-- scale_results
DROP POLICY IF EXISTS scale_results_staff_read ON public.scale_results;
DROP POLICY IF EXISTS scale_results_admin_write ON public.scale_results;

CREATE POLICY scale_results_staff_read ON public.scale_results FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.assessments a
  JOIN public.user_roles ur ON ur.user_id = auth.uid() AND (ur.clinic_id IS NULL OR ur.clinic_id = a.clinic_id)
  WHERE a.id = scale_results.assessment_id));

CREATE POLICY scale_results_admin_write ON public.scale_results FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.assessments a
  JOIN public.user_roles ur ON ur.user_id = auth.uid() AND ur.role = 'admin' AND (ur.clinic_id IS NULL OR ur.clinic_id = a.clinic_id)
  WHERE a.id = scale_results.assessment_id))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.assessments a
  JOIN public.user_roles ur ON ur.user_id = auth.uid() AND ur.role = 'admin' AND (ur.clinic_id IS NULL OR ur.clinic_id = a.clinic_id)
  WHERE a.id = scale_results.assessment_id));

-- contacts
DROP POLICY IF EXISTS contacts_staff_read ON public.contacts;
DROP POLICY IF EXISTS contacts_admin_write ON public.contacts;

CREATE POLICY contacts_staff_read ON public.contacts FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND (ur.clinic_id IS NULL OR ur.clinic_id = contacts.clinic_id)));

CREATE POLICY contacts_admin_write ON public.contacts FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND (ur.clinic_id IS NULL OR ur.clinic_id = contacts.clinic_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND (ur.clinic_id IS NULL OR ur.clinic_id = contacts.clinic_id)));

-- invitations
DROP POLICY IF EXISTS invitations_staff_read ON public.invitations;
DROP POLICY IF EXISTS invitations_admin_write ON public.invitations;

CREATE POLICY invitations_staff_read ON public.invitations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND (ur.clinic_id IS NULL OR ur.clinic_id = invitations.clinic_id)));

CREATE POLICY invitations_admin_write ON public.invitations FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND (ur.clinic_id IS NULL OR ur.clinic_id = invitations.clinic_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND (ur.clinic_id IS NULL OR ur.clinic_id = invitations.clinic_id)));

-- clinics
DROP POLICY IF EXISTS clinics_admin_write ON public.clinics;
CREATE POLICY clinics_admin_write ON public.clinics FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- user_roles: evitar recursão; leitura apenas dos próprios papéis
DROP POLICY IF EXISTS user_roles_admin_all ON public.user_roles;