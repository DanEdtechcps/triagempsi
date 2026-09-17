REVOKE SELECT ON public.clinics FROM anon;
GRANT SELECT (
  id, slug, name, tagline, about, logo_url, favicon_url,
  primary_color, accent_color, contact_email, contact_phone,
  website_url, intro_copy, done_copy, is_active
) ON public.clinics TO anon;

CREATE POLICY landing_objects_admin_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'landing'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'::public.app_role
        AND ur.clinic_id IS NULL
    )
  );

CREATE POLICY landing_objects_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'landing'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'::public.app_role
        AND ur.clinic_id IS NULL
    )
  );

CREATE POLICY landing_objects_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'landing'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'::public.app_role
        AND ur.clinic_id IS NULL
    )
  )
  WITH CHECK (
    bucket_id = 'landing'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'::public.app_role
        AND ur.clinic_id IS NULL
    )
  );

CREATE POLICY landing_objects_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'landing'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'::public.app_role
        AND ur.clinic_id IS NULL
    )
  );