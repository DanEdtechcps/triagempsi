-- Defesa em profundidade: o Supabase concede privilégios a `anon` por padrão em tabelas novas.
-- assessment_outcomes guarda desfecho clínico (dado de saúde) e só deve ser acessada por
-- usuários autenticados, via RLS. O RLS já bloqueava `anon`; aqui retiramos também os privilégios.
REVOKE ALL ON public.assessment_outcomes FROM anon;
