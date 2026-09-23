-- Migration: 20260923070000_harden_is_global_admin.sql
--
-- Fecha a brecha documentada em `documentação viva/02_BANCO_DE_DADOS_E_MIGRACOES.md`
-- (seção 4): `public.is_global_admin(_user_id uuid)` aceitava um _user_id arbitrário,
-- permitindo que qualquer usuário `authenticated` checasse via RPC se um UUID
-- qualquer era admin global. A correção anterior só revogou EXECUTE de `anon`
-- (aplicada direto em produção, nunca versionada). Esta migração substitui a
-- função por uma versão sem parâmetro, que só pode checar o próprio auth.uid()
-- do chamador, e atualiza as 6 policies que a usavam.

-- 1. Nova função sem parâmetro (usa auth.uid() internamente).
CREATE OR REPLACE FUNCTION public.is_global_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::public.app_role AND clinic_id IS NULL
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_global_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_global_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_global_admin() TO authenticated;

-- 2. Recriar as policies que chamavam is_global_admin(auth.uid()) para chamar
--    is_global_admin() (mesma lógica, só troca a chamada da função).

DROP POLICY IF EXISTS clinic_subscriptions_admin_write ON public.clinic_subscriptions;
CREATE POLICY clinic_subscriptions_admin_write ON public.clinic_subscriptions
  FOR ALL TO authenticated
  USING (is_global_admin())
  WITH CHECK (is_global_admin());

DROP POLICY IF EXISTS "clinic_psycho_select" ON public.clinic_psychoeducation_settings;
CREATE POLICY "clinic_psycho_select" ON public.clinic_psychoeducation_settings
  FOR SELECT USING (
    public.is_global_admin()
    OR public.has_clinic_access(clinic_id)
  );

DROP POLICY IF EXISTS "clinic_psycho_manage" ON public.clinic_psychoeducation_settings;
CREATE POLICY "clinic_psycho_manage" ON public.clinic_psychoeducation_settings
  FOR ALL USING (
    public.is_global_admin()
    OR (public.has_clinic_access(clinic_id) AND public.has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "assessment_psycho_select" ON public.assessment_psychoeducation;
CREATE POLICY "assessment_psycho_select" ON public.assessment_psychoeducation
  FOR SELECT USING (
    public.is_global_admin()
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
    public.is_global_admin()
    OR public.has_clinic_access(
      (SELECT clinic_id FROM public.assessments WHERE id = assessment_id)
    )
  );

DROP POLICY IF EXISTS "assessment_psycho_update" ON public.assessment_psychoeducation;
CREATE POLICY "assessment_psycho_update" ON public.assessment_psychoeducation
  FOR UPDATE USING (
    public.is_global_admin()
    OR EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_id
        AND (
          public.has_clinic_access(a.clinic_id)
          OR (a.respondent_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
        )
    )
  );

-- 3. Remover a função antiga, com parâmetro — nada mais deve chamá-la depois
--    do passo 2. Se este DROP falhar por dependência não mapeada aqui, é sinal
--    de que sobrou algum outro caller que precisa ser migrado primeiro.
DROP FUNCTION IF EXISTS public.is_global_admin(uuid);
