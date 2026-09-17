-- 1) Clinics table
CREATE TABLE public.clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text,
  about text,
  logo_url text,
  favicon_url text,
  primary_color text,
  accent_color text,
  contact_email text,
  contact_phone text,
  website_url text,
  intro_copy text,
  done_copy text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.clinics TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinics TO authenticated;
GRANT ALL ON public.clinics TO service_role;

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

CREATE POLICY clinics_public_read ON public.clinics
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY clinics_admin_write ON public.clinics
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER clinics_updated_at
  BEFORE UPDATE ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Seed default clinic
INSERT INTO public.clinics (slug, name, tagline, primary_color, accent_color, intro_copy, done_copy)
VALUES (
  'padrao',
  'Consultório',
  'Avaliação pré-consulta psiquiátrica',
  '#2f7a86',
  '#7cc7cc',
  'Este questionário breve ajuda seu psiquiatra a se preparar melhor para atender você. Você responderá a um conjunto de escalas de rastreio validadas — algumas curtas, outras um pouco mais longas, aparecendo apenas se relevantes.',
  'Obrigado por dedicar seu tempo. Suas respostas foram enviadas para a equipe clínica.'
);

-- 3) Add clinic_id to existing tables (nullable first, then backfill, then NOT NULL)
ALTER TABLE public.contacts     ADD COLUMN clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.invitations  ADD COLUMN clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.assessments  ADD COLUMN clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles   ADD COLUMN clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE;

UPDATE public.contacts    SET clinic_id = (SELECT id FROM public.clinics WHERE slug = 'padrao') WHERE clinic_id IS NULL;
UPDATE public.invitations SET clinic_id = (SELECT id FROM public.clinics WHERE slug = 'padrao') WHERE clinic_id IS NULL;
UPDATE public.assessments SET clinic_id = (SELECT id FROM public.clinics WHERE slug = 'padrao') WHERE clinic_id IS NULL;

ALTER TABLE public.contacts    ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.invitations ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.assessments ALTER COLUMN clinic_id SET NOT NULL;

CREATE INDEX contacts_clinic_id_idx     ON public.contacts(clinic_id);
CREATE INDEX invitations_clinic_id_idx  ON public.invitations(clinic_id);
CREATE INDEX assessments_clinic_id_idx  ON public.assessments(clinic_id);
CREATE INDEX user_roles_clinic_id_idx   ON public.user_roles(clinic_id);

-- Uniqueness of role per user must now include clinic; drop implicit and add explicit
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
CREATE UNIQUE INDEX user_roles_user_role_clinic_uniq
  ON public.user_roles (user_id, role, COALESCE(clinic_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 4) Helper: does the current user belong to (or globally admin) a clinic
CREATE OR REPLACE FUNCTION public.has_clinic_access(_clinic_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND (clinic_id IS NULL OR clinic_id = _clinic_id)
  );
$$;

-- 5) Rewrite RLS on tenant-scoped tables to filter by clinic membership

-- contacts
DROP POLICY IF EXISTS contacts_staff_read  ON public.contacts;
DROP POLICY IF EXISTS contacts_admin_write ON public.contacts;

CREATE POLICY contacts_staff_read ON public.contacts
  FOR SELECT TO authenticated
  USING (has_clinic_access(clinic_id));

CREATE POLICY contacts_admin_write ON public.contacts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND has_clinic_access(clinic_id))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND has_clinic_access(clinic_id));

-- invitations
DROP POLICY IF EXISTS invitations_staff_read  ON public.invitations;
DROP POLICY IF EXISTS invitations_admin_write ON public.invitations;

CREATE POLICY invitations_staff_read ON public.invitations
  FOR SELECT TO authenticated
  USING (has_clinic_access(clinic_id));

CREATE POLICY invitations_admin_write ON public.invitations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND has_clinic_access(clinic_id))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND has_clinic_access(clinic_id));

-- assessments
DROP POLICY IF EXISTS assessments_staff_read  ON public.assessments;
DROP POLICY IF EXISTS assessments_admin_write ON public.assessments;
DROP POLICY IF EXISTS assessments_admin_delete ON public.assessments;

CREATE POLICY assessments_staff_read ON public.assessments
  FOR SELECT TO authenticated
  USING (has_clinic_access(clinic_id));

CREATE POLICY assessments_admin_write ON public.assessments
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND has_clinic_access(clinic_id))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND has_clinic_access(clinic_id));

CREATE POLICY assessments_admin_delete ON public.assessments
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND has_clinic_access(clinic_id));

-- scale_results already scoped via assessment; keep policies but re-express via join
DROP POLICY IF EXISTS scale_results_staff_read  ON public.scale_results;
DROP POLICY IF EXISTS scale_results_admin_write ON public.scale_results;

CREATE POLICY scale_results_staff_read ON public.scale_results
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = scale_results.assessment_id
      AND has_clinic_access(a.clinic_id)
  ));

CREATE POLICY scale_results_admin_write ON public.scale_results
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = scale_results.assessment_id
      AND has_clinic_access(a.clinic_id)
  ))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = scale_results.assessment_id
      AND has_clinic_access(a.clinic_id)
  ));