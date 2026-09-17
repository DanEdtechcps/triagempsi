INSERT INTO public.user_roles (user_id, role, clinic_id)
SELECT '9d27e879-8f90-4abc-bfaa-34c187c29f2d'::uuid, 'admin'::app_role, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = '9d27e879-8f90-4abc-bfaa-34c187c29f2d'::uuid
    AND role = 'admin'::app_role AND clinic_id IS NULL
);