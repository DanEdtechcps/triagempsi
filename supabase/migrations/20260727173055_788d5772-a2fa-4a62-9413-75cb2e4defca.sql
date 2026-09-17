
-- Roles enum + tabela
CREATE TYPE public.app_role AS ENUM ('admin', 'clinico');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "user_roles_self_read" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_roles_admin_all" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Contatos
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone_e164 TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_staff_read" ON public.contacts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'clinico'));
CREATE POLICY "contacts_admin_write" ON public.contacts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Convites (tokens individuais)
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'link',
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  whatsapp_message_sid TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.invitations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;
GRANT ALL ON public.invitations TO service_role;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Público pode ler por token (para validar link) — mas só campos usados
CREATE POLICY "invitations_public_by_token" ON public.invitations
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "invitations_admin_write" ON public.invitations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Triagens
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID REFERENCES public.invitations(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  respondent_name TEXT NOT NULL,
  respondent_email TEXT NOT NULL,
  respondent_phone TEXT,
  respondent_age INTEGER,
  respondent_sex TEXT,
  main_complaint TEXT,
  consent_lgpd BOOLEAN NOT NULL DEFAULT false,
  consent_ip TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  risk_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.assessments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- Público pode INSERIR mas nunca LER
CREATE POLICY "assessments_public_insert" ON public.assessments
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "assessments_staff_read" ON public.assessments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'clinico'));
CREATE POLICY "assessments_admin_write" ON public.assessments
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "assessments_admin_delete" ON public.assessments
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Resultados por escala
CREATE TABLE public.scale_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE NOT NULL,
  scale_code TEXT NOT NULL,
  scale_name TEXT NOT NULL,
  score NUMERIC,
  band TEXT,
  band_level INTEGER,
  risk BOOLEAN NOT NULL DEFAULT false,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.scale_results TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scale_results TO authenticated;
GRANT ALL ON public.scale_results TO service_role;
ALTER TABLE public.scale_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scale_results_public_insert" ON public.scale_results
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "scale_results_staff_read" ON public.scale_results
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'clinico'));
CREATE POLICY "scale_results_admin_write" ON public.scale_results
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_scale_results_assessment ON public.scale_results(assessment_id);
CREATE INDEX idx_assessments_submitted ON public.assessments(submitted_at DESC);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
