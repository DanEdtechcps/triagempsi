INSERT INTO public.user_roles (user_id, role, clinic_id)
SELECT '4b5a4876-971c-4344-a210-1e638ec9ccb5', 'admin', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = '4b5a4876-971c-4344-a210-1e638ec9ccb5' AND role = 'admin'
);