-- Migration: 20260925090000_unify_rls_to_inline_subquery.sql
--
-- Unifica os dois padrões paralelos de RLS multi-tenant descritos em
-- `documentação viva/ROADMAP_ESCALA_SAAS_2026-09-24.md` (item #1, prioridade
-- máxima) e `documentação viva/02_BANCO_DE_DADOS_E_MIGRACOES.md`.
--
-- Contexto: `assessments`, `contacts`, `invitations`, `scale_results`,
-- `doctor_profiles`, `assessment_notes`, `whatsapp_messages` e `audit_logs`
-- já usam o padrão "subquery inline contra user_roles" (rewrite feito em
-- 20260728195656) — é o único padrão validado de ponta a ponta em produção.
--
-- `patient_longitudinal_records`, `clinic_subscriptions`,
-- `clinic_psychoeducation_settings` e `assessment_psychoeducation` ainda
-- usavam as funções helper `has_clinic_access()`/`is_global_admin()`. Essas
-- funções tiveram `GRANT EXECUTE` revogado de `authenticated` em 2026-07-28
-- e só regravado em 2026-09-23 (`20260923080000_regrant_...sql`) — ficaram
-- ~2 meses sem efeito prático, mascarado só porque o código sempre acessa
-- essas 4 tabelas via `supabaseAdmin` (service_role, que ignora RLS). Um
-- único ponto futuro de código que use o cliente autenticado nessas tabelas
-- romperia o isolamento entre clínicas sem aviso.
--
-- Esta migração reescreve as 6 policies dessas 4 tabelas para o mesmo
-- padrão de subquery inline, com a MESMA semântica de autorização (apenas
-- troca a chamada de função pela subquery equivalente) — e então remove as
-- funções `has_clinic_access(uuid)` e `is_global_admin()`, que ficam sem
-- nenhum chamador restante em RLS ou em código da aplicação (confirmado por
-- grep em `src/`). Isso elimina o segundo padrão por completo: só resta um
-- único mecanismo de isolamento auditável em todo o schema.

-- ====================================================================
-- 1. patient_longitudinal_records
-- ====================================================================
DROP POLICY IF EXISTS patient_longitudinal_records_team_read ON public.patient_longitudinal_records;
DROP POLICY IF EXISTS patient_longitudinal_records_team_write ON public.patient_longitudinal_records;

CREATE POLICY patient_longitudinal_records_team_read ON public.patient_longitudinal_records
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (ur.clinic_id IS NULL OR ur.clinic_id = patient_longitudinal_records.clinic_id)
  ));

CREATE POLICY patient_longitudinal_records_team_write ON public.patient_longitudinal_records
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (ur.clinic_id IS NULL OR ur.clinic_id = patient_longitudinal_records.clinic_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (ur.clinic_id IS NULL OR ur.clinic_id = patient_longitudinal_records.clinic_id)
  ));

-- ====================================================================
-- 2. clinic_subscriptions
-- ====================================================================
DROP POLICY IF EXISTS clinic_subscriptions_team_read ON public.clinic_subscriptions;
DROP POLICY IF EXISTS clinic_subscriptions_admin_write ON public.clinic_subscriptions;

CREATE POLICY clinic_subscriptions_team_read ON public.clinic_subscriptions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (ur.clinic_id IS NULL OR ur.clinic_id = clinic_subscriptions.clinic_id)
  ));

CREATE POLICY clinic_subscriptions_admin_write ON public.clinic_subscriptions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role AND ur.clinic_id IS NULL
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role AND ur.clinic_id IS NULL
  ));

-- ====================================================================
-- 3. clinic_psychoeducation_settings
-- ====================================================================
DROP POLICY IF EXISTS "clinic_psycho_select" ON public.clinic_psychoeducation_settings;
CREATE POLICY "clinic_psycho_select" ON public.clinic_psychoeducation_settings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role AND ur.clinic_id IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (ur.clinic_id IS NULL OR ur.clinic_id = clinic_psychoeducation_settings.clinic_id)
    )
  );

DROP POLICY IF EXISTS "clinic_psycho_manage" ON public.clinic_psychoeducation_settings;
CREATE POLICY "clinic_psycho_manage" ON public.clinic_psychoeducation_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role AND ur.clinic_id IS NULL
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND (ur.clinic_id IS NULL OR ur.clinic_id = clinic_psychoeducation_settings.clinic_id)
      )
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- ====================================================================
-- 4. assessment_psychoeducation
-- ====================================================================
DROP POLICY IF EXISTS "assessment_psycho_select" ON public.assessment_psychoeducation;
CREATE POLICY "assessment_psycho_select" ON public.assessment_psychoeducation
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role AND ur.clinic_id IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_id
        AND (
          EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND (ur.clinic_id IS NULL OR ur.clinic_id = a.clinic_id)
          )
          OR (a.respondent_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
        )
    )
  );

DROP POLICY IF EXISTS "assessment_psycho_insert" ON public.assessment_psychoeducation;
CREATE POLICY "assessment_psycho_insert" ON public.assessment_psychoeducation
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role AND ur.clinic_id IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.assessments a
      JOIN public.user_roles ur ON ur.user_id = auth.uid()
        AND (ur.clinic_id IS NULL OR ur.clinic_id = a.clinic_id)
      WHERE a.id = assessment_id
    )
  );

DROP POLICY IF EXISTS "assessment_psycho_update" ON public.assessment_psychoeducation;
CREATE POLICY "assessment_psycho_update" ON public.assessment_psychoeducation
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role AND ur.clinic_id IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_id
        AND (
          EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND (ur.clinic_id IS NULL OR ur.clinic_id = a.clinic_id)
          )
          OR (a.respondent_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
        )
    )
  );

-- ====================================================================
-- 5. Remover as funções do padrão descontinuado — sem chamadores restantes
--    (confirmado: nenhuma policy acima, nenhuma outra migration e nenhum
--    código em src/ chama has_clinic_access() ou is_global_admin() depois
--    deste ponto). Se algum caller não mapeado sobrar, o DROP falha alto
--    aqui em vez de deixar uma função órfã com RLS dependente dela.
-- ====================================================================
DROP FUNCTION IF EXISTS public.has_clinic_access(uuid);
DROP FUNCTION IF EXISTS public.is_global_admin();
