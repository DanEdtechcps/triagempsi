
-- Roles enum + tabela
CREATE TYPE public.app_role AS ENUM ('admin', 'clinico', 'doctor', 'staff');

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
        OR (_role = 'clinico'::public.app_role AND role = 'doctor'::public.app_role)
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
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'clinico'));
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
  ON public.patient_longitudinal_records (assessment_id);