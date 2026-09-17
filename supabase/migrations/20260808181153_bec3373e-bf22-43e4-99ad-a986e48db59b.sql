CREATE TABLE public.landing_settings (
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

INSERT INTO public.landing_settings (singleton) VALUES (true);