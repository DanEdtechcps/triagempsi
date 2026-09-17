CREATE TABLE public.plans (
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

CREATE TRIGGER clinic_subscriptions_updated_at BEFORE UPDATE ON public.clinic_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO public.clinic_subscriptions (clinic_id, plan_code, status, trial_ends_at, current_period_end, notes)
SELECT c.id, 'consultorio', 'trial', now() + interval '30 days', CURRENT_DATE + 30, 'Trial inicial automático (30 dias)'
FROM public.clinics c;