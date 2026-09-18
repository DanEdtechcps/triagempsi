-- ====================================================================
-- MIGRAÇÃO DE UNIFICAÇÃO DEFINITIVA DE PAPÉIS E RLS CIRÚRGICA
-- ====================================================================
-- 1. Expansão do ENUM app_role para incluir 'doctor' e 'staff'
-- 2. Regra Única:
--    - role = 'admin' AND clinic_id IS NULL: Super/Admin Global (acesso a tudo)
--    - role = 'admin' AND clinic_id IS NOT NULL: Administrador da clínica
--    - role = 'doctor': Médico da clínica
--    - role = 'staff': Equipe/Apoio da clínica
-- 3. Tabela patient_longitudinal_records com RLS tenant-isolated
-- ====================================================================

-- 1. Adicionar novos valores ao enum de roles de forma idempotente
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'app_role' AND enumlabel = 'doctor') THEN
    ALTER TYPE public.app_role ADD VALUE 'doctor';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'app_role' AND enumlabel = 'staff') THEN
    ALTER TYPE public.app_role ADD VALUE 'staff';
  END IF;
END $$;

-- 1.1 Migrar qualquer dado legado com role 'clinico' para 'doctor'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'app_role' AND enumlabel = 'clinico') THEN
    UPDATE public.user_roles SET role = 'doctor'::public.app_role WHERE role::text = 'clinico';
  END IF;
END $$;

-- 2. Helper para identificar Administrador Global
CREATE OR REPLACE FUNCTION public.is_global_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'::public.app_role
      AND clinic_id IS NULL
  );
$$;

-- 3. Helper universal de verificação de permissão clínica (Global Admin tem acesso irrestrito)
CREATE OR REPLACE FUNCTION public.has_clinic_access(_clinic_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND (
        (role = 'admin'::public.app_role AND clinic_id IS NULL)
        OR clinic_id = _clinic_id
      )
  );
$$;

-- 4. Helper has_role com herança de Admin Global
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR (role = 'admin'::public.app_role AND clinic_id IS NULL)
      )
  );
$$;

-- 5. Tabela de Registros Longitudinais (se não existir)
CREATE TABLE IF NOT EXISTS public.patient_longitudinal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_email TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  scale_code TEXT NOT NULL,
  score NUMERIC NOT NULL,
  band TEXT,
  band_level INTEGER,
  risk BOOLEAN NOT NULL DEFAULT false,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.patient_longitudinal_records TO authenticated;
GRANT ALL ON public.patient_longitudinal_records TO service_role;
ALTER TABLE public.patient_longitudinal_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS patient_longitudinal_records_team_read ON public.patient_longitudinal_records;
DROP POLICY IF EXISTS patient_longitudinal_records_team_write ON public.patient_longitudinal_records;

CREATE POLICY patient_longitudinal_records_team_read ON public.patient_longitudinal_records
  FOR SELECT TO authenticated
  USING (has_clinic_access(clinic_id));

CREATE POLICY patient_longitudinal_records_team_write ON public.patient_longitudinal_records
  FOR ALL TO authenticated
  USING (has_clinic_access(clinic_id))
  WITH CHECK (has_clinic_access(clinic_id));

CREATE INDEX IF NOT EXISTS patient_longitudinal_records_clinic_email_idx
  ON public.patient_longitudinal_records (clinic_id, patient_email);

-- 6. Garantir RLS em clinic_subscriptions para Global Admin
DROP POLICY IF EXISTS clinic_subscriptions_admin_write ON public.clinic_subscriptions;
CREATE POLICY clinic_subscriptions_admin_write ON public.clinic_subscriptions
  FOR ALL TO authenticated
  USING (is_global_admin(auth.uid()))
  WITH CHECK (is_global_admin(auth.uid()));
