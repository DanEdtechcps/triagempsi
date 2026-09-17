CREATE TABLE public.doctor_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  specialty text,
  is_listed boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT doctor_profiles_clinic_user_unique UNIQUE (clinic_id, user_id)
);

GRANT SELECT ON public.doctor_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_profiles TO authenticated;
GRANT ALL ON public.doctor_profiles TO service_role;

ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;

-- Pacientes (anônimos) veem apenas médicos listados; a tabela só contém nome e especialidade
CREATE POLICY doctor_profiles_public_read ON public.doctor_profiles
  FOR SELECT TO anon
  USING (is_listed = true);

-- Equipe do consultório lê todos os perfis da sua clínica
CREATE POLICY doctor_profiles_staff_read ON public.doctor_profiles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (ur.clinic_id IS NULL OR ur.clinic_id = doctor_profiles.clinic_id)
  ));

-- Somente administradores (globais ou do consultório) gerenciam perfis
CREATE POLICY doctor_profiles_admin_write ON public.doctor_profiles
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
      AND (ur.clinic_id IS NULL OR ur.clinic_id = doctor_profiles.clinic_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
      AND (ur.clinic_id IS NULL OR ur.clinic_id = doctor_profiles.clinic_id)
  ));

CREATE TRIGGER doctor_profiles_updated_at BEFORE UPDATE ON public.doctor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX doctor_profiles_clinic_idx ON public.doctor_profiles(clinic_id);

-- Triagem registra o médico escolhido pelo paciente (opcional, sem restringir visibilidade)
ALTER TABLE public.assessments
  ADD COLUMN doctor_id uuid REFERENCES public.doctor_profiles(id) ON DELETE SET NULL;

CREATE INDEX assessments_doctor_idx ON public.assessments(doctor_id);

-- Perfis iniciais dos médicos já cadastrados (nomes editáveis no admin)
INSERT INTO public.doctor_profiles (clinic_id, user_id, display_name, specialty)
VALUES
  ('18a5eb6b-f0b8-4f44-ac7b-e66b551727cf', '913446ae-9894-4bdc-a2bb-a0d76dca8b20', 'Dr. Marcel Villalumen', 'Psiquiatria'),
  ('18a5eb6b-f0b8-4f44-ac7b-e66b551727cf', '6bb7bf26-7889-4b51-a465-d5fe2acf472d', 'Dr. José Saraiva Jr.', 'Psiquiatria');