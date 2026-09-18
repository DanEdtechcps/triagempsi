
-- Roles enum + tabela
CREATE TYPE public.app_role AS ENUM ('admin', 'doctor', 'staff');

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

CREATE OR REPLACE FUNCTION public.is_global_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'::public.app_role AND clinic_id IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'doctor'));
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
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'doctor'));
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
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'doctor'));
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

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;

DROP POLICY IF EXISTS "assessments_public_insert" ON public.assessments;
DROP POLICY IF EXISTS "scale_results_public_insert" ON public.scale_results;
REVOKE INSERT ON public.assessments FROM anon;
REVOKE INSERT ON public.scale_results FROM anon;

-- Invitations: também não precisa que anon leia diretamente; validação vai por server fn
DROP POLICY IF EXISTS "invitations_public_by_token" ON public.invitations;
REVOKE SELECT ON public.invitations FROM anon;
CREATE POLICY "invitations_staff_read" ON public.invitations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'doctor'));
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

-- 2) Seed default clinic (Dr. José Ribamar Fernandes Saraiva Junior)
INSERT INTO public.clinics (slug, name, tagline, primary_color, accent_color, intro_copy, done_copy)
VALUES (
  'saraiva',
  'Saraiva Clínica de Psiquiatria',
  'Cuidado psiquiátrico com escuta, ciência e humanidade',
  '#1e4d5c',
  '#3d8b8b',
  'Seja bem-vindo(a). Este questionário breve de pré-avaliação ajuda o Dr. José Ribamar Fernandes Saraiva Junior a conhecer seu momento antes da consulta, permitindo que o nosso tempo juntos seja dedicado ao que realmente importa: uma escuta atenta, humanizada e individualizada. Suas respostas são protegidas por sigilo ético absoluto.',
  'Muito obrigado por dedicar seu tempo. Suas informações foram enviadas com segurança diretamente ao Dr. Saraiva, servindo de alicerce para a sua consulta médica.'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  primary_color = EXCLUDED.primary_color,
  accent_color = EXCLUDED.accent_color,
  intro_copy = EXCLUDED.intro_copy,
  done_copy = EXCLUDED.done_copy;

-- Alias de compatibilidade para slug 'padrao'
INSERT INTO public.clinics (slug, name, tagline, primary_color, accent_color, intro_copy, done_copy)
VALUES (
  'padrao',
  'Saraiva Clínica de Psiquiatria',
  'Cuidado psiquiátrico com escuta, ciência e humanidade',
  '#1e4d5c',
  '#3d8b8b',
  'Seja bem-vindo(a). Este questionário breve de pré-avaliação ajuda o Dr. José Ribamar Fernandes Saraiva Junior a conhecer seu momento antes da consulta, permitindo que o nosso tempo juntos seja dedicado ao que realmente importa: uma escuta atenta, humanizada e individualizada. Suas respostas são protegidas por sigilo ético absoluto.',
  'Muito obrigado por dedicar seu tempo. Suas informações foram enviadas com segurança diretamente ao Dr. Saraiva, servindo de alicerce para a sua consulta médica.'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  primary_color = EXCLUDED.primary_color,
  accent_color = EXCLUDED.accent_color,
  intro_copy = EXCLUDED.intro_copy,
  done_copy = EXCLUDED.done_copy;

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
      AND (
        (role = 'admin'::public.app_role AND clinic_id IS NULL)
        OR clinic_id = _clinic_id
      )
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
  ));REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_clinic_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_clinic_access(uuid) TO authenticated, service_role;REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_clinic_access(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS symptom_path jsonb NOT NULL DEFAULT '[]'::jsonb;-- assessments
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
DROP POLICY IF EXISTS user_roles_admin_all ON public.user_roles;CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  invitation_id uuid REFERENCES public.invitations(id) ON DELETE SET NULL,
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE SET NULL,
  to_phone text NOT NULL,
  kind text NOT NULL DEFAULT 'invite',
  body text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  provider_sid text,
  error text,
  sent_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY whatsapp_messages_staff_read ON public.whatsapp_messages
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND (ur.clinic_id IS NULL OR ur.clinic_id = whatsapp_messages.clinic_id)));

CREATE TRIGGER whatsapp_messages_updated_at
BEFORE UPDATE ON public.whatsapp_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX whatsapp_messages_clinic_created_idx ON public.whatsapp_messages (clinic_id, created_at DESC);

ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS whatsapp_status text;

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid,
  actor_user_id uuid,
  actor_email text,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX audit_logs_clinic_idx ON public.audit_logs (clinic_id);
CREATE INDEX audit_logs_entity_idx ON public.audit_logs (entity_type, entity_id);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_staff_read ON public.audit_logs
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (ur.clinic_id IS NULL OR ur.clinic_id = audit_logs.clinic_id)
  )
);CREATE TABLE public.assessment_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL,
  author_user_id uuid,
  author_email text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX assessment_notes_assessment_idx ON public.assessment_notes(assessment_id, created_at DESC);

GRANT SELECT, INSERT ON public.assessment_notes TO authenticated;
GRANT ALL ON public.assessment_notes TO service_role;

ALTER TABLE public.assessment_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY assessment_notes_staff_read ON public.assessment_notes
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
    AND (ur.clinic_id IS NULL OR ur.clinic_id = assessment_notes.clinic_id)
));

CREATE POLICY assessment_notes_staff_insert ON public.assessment_notes
FOR INSERT TO authenticated
WITH CHECK (
  author_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (ur.clinic_id IS NULL OR ur.clinic_id = assessment_notes.clinic_id)
  )
);

CREATE TRIGGER update_assessment_notes_updated_at
BEFORE UPDATE ON public.assessment_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS respondent_type text NOT NULL DEFAULT 'paciente',
  ADD COLUMN IF NOT EXISTS informant_name text,
  ADD COLUMN IF NOT EXISTS informant_relation text;

ALTER TABLE public.assessments
  ADD CONSTRAINT assessments_respondent_type_check
  CHECK (respondent_type IN ('paciente', 'familiar'));CREATE TABLE public.landing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  eyebrow text NOT NULL DEFAULT 'Pré-triagem psiquiátrica de alto padrão',
  headline_line1 text NOT NULL DEFAULT 'A primeira consulta',
  headline_line2 text NOT NULL DEFAULT 'não começa do zero.',
  subheadline text NOT NULL DEFAULT 'Doze instrumentos validados, uma árvore de decisão que se adapta a cada resposta e um painel clínico que entrega o caso mastigado.',
  share_title text NOT NULL DEFAULT 'Triagem Psiquiátrica — pré-triagem premium para consultórios',
  share_description text NOT NULL DEFAULT 'Plataforma de pré-triagem em saúde mental: instrumentos validados, triagem adaptativa e painel clínico.',
  share_image_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.landing_settings TO anon;
GRANT SELECT ON public.landing_settings TO authenticated;
GRANT ALL ON public.landing_settings TO service_role;

ALTER TABLE public.landing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY landing_settings_public_read ON public.landing_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE TRIGGER update_landing_settings_updated_at
  BEFORE UPDATE ON public.landing_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.landing_settings (singleton) VALUES (true);ALTER TABLE public.landing_settings ADD COLUMN share_image_path text;ALTER TABLE public.landing_settings ADD COLUMN IF NOT EXISTS share_image_version integer NOT NULL DEFAULT 1;REVOKE SELECT ON public.clinics FROM anon;
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
  );CREATE TABLE public.doctor_profiles (
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
  );CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  monthly_price_cents integer,
  max_professionals integer,
  max_units integer,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_read_authenticated" ON public.plans
  FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER plans_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO public.plans (code, name, monthly_price_cents, max_professionals, max_units, features) VALUES
  ('consultorio', 'Consultório', 89000, 2, 1, '["1 consultório white-label","Triagens ilimitadas","Relatórios PDF","LGPD by design"]'::jsonb),
  ('clinica', 'Clínica', 240000, NULL, 6, '["Até 6 consultórios white-label","Equipe ilimitada","Consolidação multi-unidade","Suporte prioritário"]'::jsonb),
  ('instituicao', 'Instituição', NULL, NULL, NULL, '["Unidades ilimitadas","Integrações sob medida","SLA dedicado","Onboarding assistido"]'::jsonb);

CREATE TABLE public.clinic_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  plan_code text NOT NULL REFERENCES public.plans(code),
  status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial','ativa','inadimplente','suspensa','cancelada')),
  monthly_price_cents integer,
  started_at timestamptz NOT NULL DEFAULT now(),
  trial_ends_at timestamptz,
  current_period_end date,
  canceled_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id)
);

GRANT SELECT ON public.clinic_subscriptions TO authenticated;
GRANT ALL ON public.clinic_subscriptions TO service_role;

ALTER TABLE public.clinic_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_subscriptions_team_read" ON public.clinic_subscriptions
  FOR SELECT TO authenticated
  USING (public.has_clinic_access(clinic_id));

CREATE POLICY "clinic_subscriptions_admin_write" ON public.clinic_subscriptions
  FOR ALL TO authenticated
  USING (public.is_global_admin(auth.uid()))
  WITH CHECK (public.is_global_admin(auth.uid()));

CREATE TRIGGER clinic_subscriptions_updated_at BEFORE UPDATE ON public.clinic_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO public.clinic_subscriptions (clinic_id, plan_code, status, trial_ends_at, current_period_end, notes)
SELECT c.id, 'consultorio', 'trial', now() + interval '30 days', CURRENT_DATE + 30, 'Trial inicial automático (30 dias)'
FROM public.clinics c
ON CONFLICT (clinic_id) DO NOTHING;

-- Acompanhamento Longitudinal
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

CREATE POLICY "patient_longitudinal_records_team_read" ON public.patient_longitudinal_records
  FOR SELECT TO authenticated
  USING (has_clinic_access(clinic_id));

CREATE POLICY "patient_longitudinal_records_team_write" ON public.patient_longitudinal_records
  FOR ALL TO authenticated
  USING (has_clinic_access(clinic_id))
  WITH CHECK (has_clinic_access(clinic_id));

CREATE INDEX IF NOT EXISTS patient_longitudinal_records_clinic_email_idx
  ON public.patient_longitudinal_records (clinic_id, patient_email);
CREATE INDEX IF NOT EXISTS patient_longitudinal_records_assessment_idx
  ON public.patient_longitudinal_records (assessment_id);-- ====================================================================
-- MÓDULO DE PSICOEDUCAÇÃO - TriagemPsi
-- ====================================================================
-- Curadoria clínica inspirada nas práticas do Dr. José Ribamar Fernandes Saraiva Junior
-- (Medicina de Família, Psiquiatria ABP, TCC, Dependência Química e Geriatria).
-- ====================================================================

-- 1. Temas (categorias clínicas)
CREATE TABLE IF NOT EXISTS public.psychoeducation_topics (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  title         text NOT NULL,
  short_title   text,
  description   text,
  icon          text,
  sort_order    integer DEFAULT 0,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- 2. Conteúdos (versões do tema)
CREATE TABLE IF NOT EXISTS public.psychoeducation_contents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id        uuid NOT NULL REFERENCES public.psychoeducation_topics(id) ON DELETE CASCADE,
  version         text NOT NULL DEFAULT 'v1',
  level           text NOT NULL CHECK (level IN ('resumo', 'completo', 'crise')),
  title           text NOT NULL,
  body_md         text NOT NULL,
  summary_pdf     text,
  external_links  jsonb DEFAULT '[]',
  video_urls      jsonb DEFAULT '[]',
  is_published    boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(topic_id, version, level)
);

-- 3. Configuração por clínica (o médico controla)
CREATE TABLE IF NOT EXISTS public.clinic_psychoeducation_settings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  topic_id        uuid NOT NULL REFERENCES public.psychoeducation_topics(id) ON DELETE CASCADE,
  is_enabled      boolean DEFAULT true,
  auto_trigger    boolean DEFAULT true,
  custom_intro    text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(clinic_id, topic_id)
);

-- 4. Recomendações geradas por triagem (histórico)
CREATE TABLE IF NOT EXISTS public.assessment_psychoeducation (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id   uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  topic_id        uuid NOT NULL REFERENCES public.psychoeducation_topics(id) ON DELETE CASCADE,
  content_id      uuid REFERENCES public.psychoeducation_contents(id) ON DELETE SET NULL,
  trigger_reason  text,
  is_manual       boolean DEFAULT false,
  viewed_at       timestamptz,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(assessment_id, topic_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_psycho_contents_topic ON public.psychoeducation_contents(topic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_psycho_clinic ON public.clinic_psychoeducation_settings(clinic_id);
CREATE INDEX IF NOT EXISTS idx_assessment_psycho_assessment ON public.assessment_psychoeducation(assessment_id);

-- Grants
GRANT SELECT ON public.psychoeducation_topics TO anon, authenticated;
GRANT SELECT ON public.psychoeducation_contents TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_psychoeducation_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_psychoeducation TO authenticated;
GRANT ALL ON public.psychoeducation_topics TO service_role;
GRANT ALL ON public.psychoeducation_contents TO service_role;
GRANT ALL ON public.clinic_psychoeducation_settings TO service_role;
GRANT ALL ON public.assessment_psychoeducation TO service_role;

-- =====================================================
-- RLS
-- =====================================================

ALTER TABLE public.psychoeducation_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.psychoeducation_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_psychoeducation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_psychoeducation ENABLE ROW LEVEL SECURITY;

-- Temas e conteúdos: leitura pública para ativos e publicados
DROP POLICY IF EXISTS "psycho_topics_read" ON public.psychoeducation_topics;
CREATE POLICY "psycho_topics_read" ON public.psychoeducation_topics
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "psycho_contents_read" ON public.psychoeducation_contents;
CREATE POLICY "psycho_contents_read" ON public.psychoeducation_contents
  FOR SELECT USING (is_published = true);

-- Configuração da clínica: quem tem acesso à clínica
DROP POLICY IF EXISTS "clinic_psycho_select" ON public.clinic_psychoeducation_settings;
CREATE POLICY "clinic_psycho_select" ON public.clinic_psychoeducation_settings
  FOR SELECT USING (
    public.is_global_admin(auth.uid()) 
    OR public.has_clinic_access(clinic_id)
  );

DROP POLICY IF EXISTS "clinic_psycho_manage" ON public.clinic_psychoeducation_settings;
CREATE POLICY "clinic_psycho_manage" ON public.clinic_psychoeducation_settings
  FOR ALL USING (
    public.is_global_admin(auth.uid()) 
    OR (public.has_clinic_access(clinic_id) AND public.has_role(auth.uid(), 'admin'))
  );

-- Recomendações da triagem: equipe clínica e paciente dono do e-mail
DROP POLICY IF EXISTS "assessment_psycho_select" ON public.assessment_psychoeducation;
CREATE POLICY "assessment_psycho_select" ON public.assessment_psychoeducation
  FOR SELECT USING (
    public.is_global_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_id
        AND (
          public.has_clinic_access(a.clinic_id)
          OR (a.respondent_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
        )
    )
  );

DROP POLICY IF EXISTS "assessment_psycho_insert" ON public.assessment_psychoeducation;
CREATE POLICY "assessment_psycho_insert" ON public.assessment_psychoeducation
  FOR INSERT WITH CHECK (
    public.is_global_admin(auth.uid())
    OR public.has_clinic_access(
      (SELECT clinic_id FROM public.assessments WHERE id = assessment_id)
    )
  );

DROP POLICY IF EXISTS "assessment_psycho_update" ON public.assessment_psychoeducation;
CREATE POLICY "assessment_psycho_update" ON public.assessment_psychoeducation
  FOR UPDATE USING (
    public.is_global_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_id
        AND (
          public.has_clinic_access(a.clinic_id)
          OR (a.respondent_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
        )
    )
  );

-- =====================================================
-- SEED DOS 10 TEMAS OFICIAIS COM RESUMO E COMPLETO
-- =====================================================

DO $$
DECLARE
  v_topic_id uuid;
BEGIN

  -- 1. Depressão e humor baixo
  INSERT INTO public.psychoeducation_topics (slug, title, short_title, description, icon, sort_order)
  VALUES (
    'depressao-humor',
    'Depressão e humor baixo',
    'Humor e Depressão',
    'Compreensão do humor deprimido, ativação comportamental e apoio sem julgamento.',
    'Sun',
    1
  ) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, short_title = EXCLUDED.short_title
  RETURNING id INTO v_topic_id;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'resumo',
    'Depressão e humor baixo: primeiros passos',
    'Sentir o humor baixo por vários dias, com falta de prazer nas coisas e cansaço excessivo, é mais comum do que se imagina. Isso não significa fraqueza. Pequenas ações diárias (caminhada curta, manter rotina de sono e conversar com alguém de confiança) já ajudam a criar movimento. Se esses sentimentos persistirem, conversar com seu médico é o próximo passo mais importante. Você não precisa enfrentar isso sozinho.',
    'Sentir o humor baixo por vários dias e cansaço excessivo é comum e não significa fraqueza. Pequenas ações diárias ajudam a criar movimento. Converse com seu médico para avaliação individualizada.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'completo',
    'Compreendendo a depressão e a recuperação',
    'O humor deprimido envolve alterações no sono, apetite, energia, concentração e interesse pelas coisas que antes davam prazer. A Terapia Cognitivo-Comportamental (TCC) demonstra que pensamentos autocríticos e a redução gradual de atividades cotidianas formam um ciclo que se retroalimenta.

### Estratégias práticas de enfrentamento:
1. **Ativação comportamental:** Comece com uma atividade muito pequena e viável (ex.: 10 minutos de caminhada ou arrumar uma mesa), mesmo sem ter vontade prévia. A motivação frequentemente surge após o movimento, não antes.
2. **Higiene do sono:** Mantenha horários constantes para acordar e deitar, garantindo exposição à luz solar pela manhã.
3. **Reduzir a autocrítica:** Reconheça que a lentidão é um sintoma biológico e psicológico, e não preguiça ou falta de caráter.

### Abordagens de tratamento:
O plano terapêutico é sempre individualizado e pode combinar psicoterapia, intervenções no estilo de vida, psicofármacos adequados e, em situações específicas, técnicas modernas de neuromodulação (como a Estimulação Magnética Transcraniana - TMS). O passo fundamental é compartilhar o que você sente com seu médico de confiança.',
    'Compreensão profunda sobre ciclo de humor, ativação comportamental e opções de cuidado em equipe multiprofissional.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;


  -- 2. Ansiedade e preocupação excessiva
  INSERT INTO public.psychoeducation_topics (slug, title, short_title, description, icon, sort_order)
  VALUES (
    'ansiedade-preocupacao',
    'Ansiedade e preocupação excessiva',
    'Ansiedade e Alívio',
    'O sistema de alarme do organismo, técnicas de respiração e regulação cognitiva.',
    'Wind',
    2
  ) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, short_title = EXCLUDED.short_title
  RETURNING id INTO v_topic_id;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'resumo',
    'Ansiedade e preocupação: compreendendo o alarme',
    'A ansiedade é um sistema de alarme do corpo. Quando ele fica ligado o tempo todo, gera tensão, preocupação excessiva e dificuldade de relaxar. Técnicas simples de respiração (inspirar 4 segundos, segurar 4, expirar 6) e limitar o tempo de checagem de notícias já ajudam. Converse com seu médico se a preocupação estiver atrapalhando seu dia a dia.',
    'A ansiedade funciona como um alarme hiperativo. Pratique a respiração 4-4-6 e limite estímulos de notícias. Um profissional de saúde pode ajudar a recalibrar esse equilíbrio.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'completo',
    'Mecanismos da ansiedade e técnicas de autorregulação',
    'A ansiedade excessiva mantém o organismo em estado contínuo de alerta contra perigos imaginados ou superestimados. Isso se manifesta no corpo como taquicardia, tensão muscular, aperto no peito e respiração curta.

### Estratégias práticas de TCC:
1. **Respiração diafragmática ritmada:** Inspire contando até 4 pelo nariz, segure o ar por 4 segundos e solte lentamente pela boca por 6 segundos. Repita por 3 a 5 ciclos para sinalizar segurança ao sistema nervoso.
2. **Técnica de Aterramento (Grounding 5-4-3-2-1):** Em momentos de crise, olhe ao redor e nomeie 5 objetos que você vê, 4 que pode tocar, 3 sons que escuta, 2 cheiros e 1 sabor.
3. **Exposição gradual:** Não evite completamente tarefas rotineiras que gerem desconforto leve; encare-as em etapas gradativas.
4. **Higiene informacional:** Estabeleça horários específicos para ler notícias e redes sociais, evitando checagens repetitivas à noite.',
    'Guia de autorregulação emocional, técnicas de grounding e respiração diafragmática contra crises de ansiedade.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;


  -- 3. Crise emocional e ideação suicida
  INSERT INTO public.psychoeducation_topics (slug, title, short_title, description, icon, sort_order)
  VALUES (
    'crise-emocional',
    'Crise emocional e ideação suicida',
    'Apoio Imediato e Crise',
    'Acolhimento prioritário, desestigmatização do sofrimento extremo e canais 24h de emergência.',
    'HeartHandshake',
    3
  ) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, short_title = EXCLUDED.short_title
  RETURNING id INTO v_topic_id;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'resumo',
    'Apoio em momentos de sofrimento intenso',
    'Se você está passando por um momento muito difícil e teve pensamentos de que seria melhor não estar vivo, saiba que esses sentimentos podem melhorar. Você não está sozinho. Ligue agora para o CVV 188 (24 horas, gratuito) ou SAMU 192. Conte para alguém de confiança. Há ajuda disponível.',
    'Você não precisa carregar essa dor sozinho. Em sofrimento intenso, ligue imediatamente para o CVV 188 (ligação gratuita 24h) ou SAMU 192.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'completo',
    'Plano de segurança e cuidado prioritário',
    'Momentos de crise profunda podem trazer pensamentos de morte, desaparecimento ou autolesão. Esse é um sinal de sofrimento psíquico severo e agudo, e **nunca** de fraqueza pessoal ou falta de fé.

### Passos de segurança imediatos:
1. **Peça ajuda agora:** Ligue gratuitamente para o **CVV (Centro de Valorização da Vida) no número 188** ou acione o **SAMU (192)**.
2. **Avise alguém de confiança:** Fale abertamente com um amigo, familiar ou vizinho próximo: *"Estou com pensamentos difíceis agora e preciso de companhia."*
3. **Proteja seu ambiente:** Afaste do alcance qualquer substância, medicamento ou meio que possa oferecer risco.
4. **Não tome decisões definitivas sob dor extrema:** A dor psíquica intensa distorce temporariamente nossa capacidade de enxergar soluções futuras.
5. **Procure atendimento presencial:** Vá até a Unidade de Pronto Atendimento (UPA) ou pronto-socorro mais próximo.

Existem intervenções seguras e eficazes. A sua vida tem valor e o acolhimento médico é sigiloso e acolhedor.',
    'Plano de segurança para momentos críticos com canais de emergência CVV 188 e SAMU 192.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;


  -- 4. Insônia e higiene do sono
  INSERT INTO public.psychoeducation_topics (slug, title, short_title, description, icon, sort_order)
  VALUES (
    'insonia-sono',
    'Insônia e higiene do sono',
    'Sono e Recuperação',
    'Regras de higiene do sono, regulação circadiana e cuidados especiais para todas as faixas etárias.',
    'Moon',
    4
  ) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, short_title = EXCLUDED.short_title
  RETURNING id INTO v_topic_id;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'resumo',
    'Higiene do sono para noites reparadoras',
    'Dormir mal afeta humor, ansiedade e concentração. Regras simples: horário fixo para deitar e acordar, evitar telas 1 hora antes, não usar a cama para trabalho ou celular, e levantar se não dormir em 20-30 minutos.',
    'A qualidade do sono modula a estabilidade do humor e da ansiedade. Horários regulares e quarto sem telas são os primeiros passos fundamentais.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'completo',
    'Estratégias baseadas em evidências para insônia',
    'A insônia frequentemente se perpetua através de associações condicionadas de ansiedade com a própria cama. A privação crônica de sono amplia a vulnerabilidade a sintomas depressivos e desregulação neuroquímica.

### Pilares da Higiene do Sono (TCC-I):
1. **Controle de estímulos:** Use a cama unicamente para dormir e intimidade. Evite trabalhar, assistir televisão ou usar smartphone deitado.
2. **Regra dos 25 minutos:** Se não adormecer após 20 a 30 minutos, saia do quarto, vá a um ambiente com luz suave e faça uma leitura tranquila. Volte apenas com sono real.
3. **Horário de despertar inegociável:** Mantenha o mesmo horário de levantar todos os dias, inclusive nos fins de semana, ancorando o ritmo circadiano.
4. **Cuidado com cafeína e álcool:** Suspenda estimulantes após as 14h. Embora o álcool induza sonolência superficial, ele fragmenta o sono profundo e piora a insônia nas horas seguintes.
5. **Atenção especial à terceira idade:** No envelhecimento, é natural haver menor necessidade de sono profundo e maior fragmentação; cochilos diurnos prolongados devem ser ajustados para preservar o repouso noturno.',
    'Diretrizes da TCC para insônia (TCC-I), controle de estímulos e rotina de descanso biológico.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;


  -- 5. TDAH em adultos
  INSERT INTO public.psychoeducation_topics (slug, title, short_title, description, icon, sort_order)
  VALUES (
    'tdah-adultos',
    'TDAH em adultos (atenção e organização)',
    'TDAH em Adultos',
    'Mecanismos executivos, desorganização crônica, estratégias práticas de rotina e externalização mental.',
    'BrainCircuit',
    5
  ) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, short_title = EXCLUDED.short_title
  RETURNING id INTO v_topic_id;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'resumo',
    'TDAH em adultos: atenção e rotina',
    'Dificuldade de organização, procrastinação e distração excessiva na vida adulta podem estar relacionadas ao TDAH. Estratégias práticas (listas, alarmes, ambiente organizado) ajudam bastante. Uma avaliação formal pode esclarecer e abrir caminhos de tratamento.',
    'Dificuldades crônicas de foco, esquecimentos e procrastinação em adultos podem se beneficiar de avaliação clínica e estratégias de apoio estruturado.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'completo',
    'Compreensão do TDAH no adulto e funções executivas',
    'O Transtorno de Déficit de Atenção/Hiperatividade em adultos se manifesta primariamente por disfunção executiva: dificuldade em gerenciar o tempo, priorizar obrigações, sustentar foco em tarefas pouco prazerosas e modular a impulsividade.

### Estratégias práticas de externalização:
1. **Tire as pendências da cabeça:** A memória de trabalho no TDAH sobrecarrega facilmente. Registre compromissos em blocos visíveis, calendários sincronizados e notas no celular.
2. **Método de micropassos:** Divida relatórios, estudos ou tarefas domésticas em etapas de 15 minutos (técnica Pomodoro adaptada).
3. **Ambiente com baixo ruído visual:** Mantenha sobre a mesa apenas o que está sendo executado naquele momento.
4. **Validação histórica:** Entender que a distração não é sinal de incapacidade intelectual reduz anos de culpa e baixa autoestima acumulada.',
    'Guia sobre funções executivas no TDAH adulto, externalização de tarefas e organização prática.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;


  -- 6. Oscilações de humor (espectro bipolar)
  INSERT INTO public.psychoeducation_topics (slug, title, short_title, description, icon, sort_order)
  VALUES (
    'oscilacoes-humor',
    'Oscilações de humor (espectro bipolar)',
    'Estabilidade do Humor',
    'Diferença entre reações normais e períodos de ativação intensa; relevância de diagnóstico cuidadoso.',
    'Activity',
    6
  ) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, short_title = EXCLUDED.short_title
  RETURNING id INTO v_topic_id;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'resumo',
    'Oscilações de energia e ritmo de humor',
    'Mudanças intensas de energia, sono e humor merecem atenção. Evite automedicação. Converse com seu médico sobre o padrão desses períodos. Existem formas eficazes de estabilizar o humor.',
    'Períodos alternados de excesso de energia seguidos por apatia profunda merecem investigação médica detalhada para segurança farmacológica.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'completo',
    'Entendendo as oscilações do espectro bipolar',
    'Variações emocionais fazem parte da existência humana. No entanto, quando surgem fases de energia exacerbada, redução acentuada da necessidade de sono (sentir-se desperto dormindo apenas 2 ou 3 horas), pensamento acelerado e aumento de comportamentos impulsivos, pode se tratar de uma oscilação do espectro de humor bipolar.

### Aspectos essenciais:
1. **Preservação de rotina social e biológica:** Pessoas com propensão a oscilações de humor têm relógios biológicos sensíveis. Horários fixos de alimentação e sono agem como estabilizadores naturais.
2. **Cuidado com antidepressivos isolados:** Em quadros bipolares, tomar antidepressivos sem estabilizador de humor pode deflagrar crises de aceleração (virada hipomaníaca) ou agitação.
3. **Mapeamento de gatilhos:** Privação deliberada de sono, viagens longas com troca de fuso horário e estresse prolongado exigem acompanhamento médico vigilante.',
    'Orientações sobre ritmos circadianos, cuidados no uso de medicamentos e estabilidade no espectro bipolar.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;


  -- 7. Álcool e substâncias
  INSERT INTO public.psychoeducation_topics (slug, title, short_title, description, icon, sort_order)
  VALUES (
    'alcool-substancias',
    'Álcool e substâncias',
    'Álcool e Substâncias',
    'Abordagem humanizada, redução progressiva de danos e acolhimento em saúde sem julgamento moral.',
    'Wine',
    7
  ) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, short_title = EXCLUDED.short_title
  RETURNING id INTO v_topic_id;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'resumo',
    'Cuidado integral no uso de substâncias',
    'O uso de álcool ou outras substâncias pode afetar o humor, o sono e a ansiedade. Reduzir o consumo já traz benefícios. Converse abertamente com seu médico — o objetivo é cuidar da sua saúde, sem julgamento.',
    'O consumo de substâncias interage intimamente com quadros de ansiedade e sono. A redução gradual de danos é sempre acolhida com sigilo e respeito.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'completo',
    'Redução de danos e saúde mental no uso de substâncias',
    'O consumo de álcool, tabaco ou outras substâncias frequentemente tem início como uma tentativa de aplacar angústias, ansiedade ou insônia. Contudo, com o tempo, o uso continuado altera a neuroquímica cerebral e aprofunda os próprios sintomas que se tentava aliviar.

### Princípios da Redução de Danos:
1. **Progresso acima da perfeição:** Não é necessário atingir abstinência imediata para experimentar melhoras na saúde. Cada redução de quantidade ou frequência é uma vitória protetora.
2. **Mapeie os contextos de risco:** Identifique horários, companhias e locais onde o consumo perde o controle planejado.
3. **Hidratação e alimentação prévia:** Nunca consuma álcool com o estômago vazio e intercale sempre copos de água.
4. **Espaço seguro na consulta médica:** Em nosso serviço, o diálogo sobre substâncias é conduzido sob sigilo ético absoluto, com foco científico em sua qualidade de vida e metas pessoais.',
    'Guia de redução de danos, relação entre substâncias e ansiedade e atendimento médico acolhedor.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;


  -- 8. Trauma e estresse pós-traumático
  INSERT INTO public.psychoeducation_topics (slug, title, short_title, description, icon, sort_order)
  VALUES (
    'trauma-tept',
    'Trauma e estresse pós-traumático',
    'Trauma e Segurança',
    'Processamento de eventos estressores graves, memórias intrusivas e caminhos de restabelecimento seguro.',
    'ShieldCheck',
    8
  ) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, short_title = EXCLUDED.short_title
  RETURNING id INTO v_topic_id;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'resumo',
    'Superando o impacto de experiências traumáticas',
    'Experiências difíceis podem deixar marcas (lembranças invasivas, evitação, hipervigilância). Existem tratamentos eficazes. Você não precisa reviver tudo sozinho.',
    'Lembranças invasivas e estado contínuo de alerta são reações biológicas a traumas. Terapias especializadas ajudam a reprocessar essas memórias com segurança.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'completo',
    'Compreendendo o Transtorno de Estresse Pós-Traumático (TEPT)',
    'Eventos traumáticos — como acidentes graves, violência interpessoal, perdas abruptas ou situações de risco iminente — podem sobrecarregar o centro cerebral de memória (hipocampo) e medo (amígdala), fazendo com que o evento passado pareça estar acontecendo no tempo presente.

### Sintomas típicos e normatização:
- **Intrusão:** Flashbacks, pesadelos e imagens espontâneas angustiantes.
- **Evitação:** Esforço para não falar, pensar ou passar perto de locais que lembrem o fato.
- **Hiperativação:** Sobressaltos repentinos, irritabilidade e dificuldade severa para relaxar.

### Caminhos de cuidado baseado em evidências:
A psicoterapia com técnicas de TCC focada em trauma, EMDR e cuidados médicos coordenados demonstram excelentes índices de recuperação. O autocuidado começa por reestabelecer uma rotina de segurança pessoal e acolhimento por pessoas queridas.',
    'Orientações sobre processamento de traumas, redução da hipervigilância e psicoterapias com respaldo científico.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;


  -- 9. Burnout e esgotamento
  INSERT INTO public.psychoeducation_topics (slug, title, short_title, description, icon, sort_order)
  VALUES (
    'burnout-esgotamento',
    'Burnout e esgotamento',
    'Esgotamento e Trabalho',
    'Identificação do cansaço laboral crônico, despersonalização e reorganização saudável de limites.',
    'BatteryWarning',
    9
  ) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, short_title = EXCLUDED.short_title
  RETURNING id INTO v_topic_id;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'resumo',
    'Reconhecendo o esgotamento no trabalho',
    'Esgotamento emocional, cinismo e sensação de ineficácia são sinais de burnout. Pausas reais, limites claros e conversa com alguém de confiança são o começo. Seu médico pode ajudar a avaliar o quadro completo.',
    'O esgotamento profissional crônico não se resolve apenas com descanso de fim de semana. É necessária reestruturação de limites e suporte clínico.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'completo',
    'Dimensões do Burnout e restauração de energia',
    'O Burnout não é um simples cansaço passageiro; é uma resposta prolongada ao estresse crônico no ambiente de trabalho ou de cuidados a terceiros, estruturado em três dimensões:
1. **Exaustão emocional:** Esvaziamento de recursos físicos e mentais logo no início do dia.
2. **Despersonalização / Cinismo:** Atitude de distanciamento, frieza ou irritação com colegas e clientes.
3. **Baixa realização pessoal:** Sensação de que o esforço é inútil ou insuficiente.

### Medidas práticas de recuperação:
- **Desconexão digital real:** Não responda e-mails ou mensagens de trabalho fora da jornada contratada.
- **Resgate de atividades com sentido:** Pratique hobbies desvinculados de metas de produtividade.
- **Suporte médico e laboral:** Quando a exaustão atinge níveis incapacitantes, licenças médicas orientadas e psicoterapia são passos clínicos indispensáveis.',
    'Guia sobre as 3 dimensões do burnout, limites profissionais e recuperação de energia vital.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;


  -- 10. Bem-estar e prevenção + Saúde mental no envelhecimento
  INSERT INTO public.psychoeducation_topics (slug, title, short_title, description, icon, sort_order)
  VALUES (
    'bem-estar-prevencao',
    'Bem-estar e prevenção na vida e no envelhecimento',
    'Bem-estar e Longevidade',
    'Hábitos protetores, manutenção de propósito, conexões afetivas e saúde mental na maturidade e velhice.',
    'Sparkles',
    10
  ) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, short_title = EXCLUDED.short_title
  RETURNING id INTO v_topic_id;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'resumo',
    'Hábitos fundamentais de bem-estar',
    'Pequenos hábitos diários protegem a saúde mental: sono regular, movimento, conexão social e limitação de redes sociais. Na terceira idade, manter vínculos e propósito é especialmente importante.',
    'A saúde mental se cultiva em pequenos atos diários de conexão, sono e movimento. O envelhecimento pleno apoia-se em manter autonomia e vínculos significativos.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'completo',
    'Saúde mental integral, longevidade e envelhecimento com dignidade',
    'A saúde mental é uma construção dinâmica diária e não uma ausência passiva de sintomas. Ao longo de todo o ciclo de vida — e muito especialmente na maturidade e na velhice — a preservação de vínculos afetivos autênticos e de um sentido pessoal são os maiores protetores cerebrais conhecidos pela neurociência e pela psicodinâmica.

### Pilares Universais de Proteção Psíquica:
1. **Movimento regular:** Atividade aeróbica ou caminhadas leves estimulam o BDNF (fator neurotrófico derivado do cérebro), atuando como um antidepressivo natural.
2. **Conexão humana presencial:** Conversas significativas liberam ocitocina e regulam o eixo de estresse corporal.
3. **Cultivo de propósito:** Ter projetos pessoais — desde plantar, estudar um novo assunto ou orientar outras gerações — mantém a plasticidade mental ativa.

### A Psicodinâmica do Envelhecimento Humano:
Como nos ensinam os estudos sobre longevidade e saúde mental do idoso, o avançar da idade traz singularidade, sabedoria acumulada e capacidade de ressignificação. O envelhecer **não** deve ser igualado a decadência ou perda de valor social. Manter a escuta ativa, o respeito à autonomia e o cuidado preventivo de rotina permite que cada fase da vida seja vivida com dignidade, vitalidade e alegria.',
    'Reflexões sobre longevidade ativa, neurociência dos hábitos de bem-estar e psicodinâmica do envelhecimento.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;

END $$;
