-- ==============================================================================
-- Migration: 20260919200000_provision_lumina_saude.sql
-- Provisionamento do Tenant Instituto Lumina de Saúde Mental & Neurociências
-- Plano Enterprise (R$ 2.400/mês), Corpo Clínico e Credenciais de Demonstração
-- ==============================================================================

DO $$
DECLARE
  v_clinic_id UUID := 'c0000000-0000-4000-8000-000000000002'::UUID;
  v_user_gustavo_id UUID := 'u0000000-0000-4000-8000-000000000001'::UUID;
  v_user_camila_id UUID := 'u0000000-0000-4000-8000-000000000002'::UUID;
  v_user_recepcao_id UUID := 'u0000000-0000-4000-8000-000000000003'::UUID;
BEGIN
  -- 1. Provisionar a Clínica Lumina Saúde
  INSERT INTO public.clinics (
    id,
    slug,
    name,
    tagline,
    about,
    primary_color,
    accent_color,
    contact_email,
    contact_phone,
    website_url,
    intro_copy,
    done_copy,
    is_active
  ) VALUES (
    v_clinic_id,
    'lumina-saude',
    'Instituto Lumina de Saúde Mental & Neurociências',
    'Psiquiatria de Precisão, Neurociências e Acolhimento Humano',
    'Centro especializado em psicometria digital avançada, neurociências e psiquiatria de precisão com corpo clínico multidisciplinar.',
    '#4c1d95',
    '#8b5cf6',
    'contato@lumina.med.br',
    '11988887777',
    'https://lumina.med.br',
    'Seja bem-vindo(a) ao Instituto Lumina de Saúde Mental & Neurociências. Este questionário personalizado organiza seus relatos clínicos antes da consulta, permitindo foco nas suas necessidades reais.',
    'Muito obrigado por preencher sua pré-triagem. Suas informações foram enviadas com sigilo ético ao corpo clínico do Instituto Lumina.',
    true
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    primary_color = EXCLUDED.primary_color,
    accent_color = EXCLUDED.accent_color,
    contact_email = EXCLUDED.contact_email,
    is_active = true,
    updated_at = now();

  -- 2. Provisionar assinatura no plano Clínica (R$ 2.400/mês) — corrigido
  -- em 2026-09-23: 'enterprise' e 'active' não são valores válidos de
  -- plan_code (FK pra public.plans.code) nem de status (CHECK), essa
  -- migração nunca rodou com sucesso como escrita originalmente — produção
  -- foi provisionada na mão. 'clinica' é o plano que já bate exatamente com
  -- o preço (R$2.400) e o público (até 6 unidades) descritos aqui.
  INSERT INTO public.clinic_subscriptions (
    id,
    clinic_id,
    plan_code,
    status,
    monthly_price_cents,
    notes,
    started_at,
    current_period_end
  ) VALUES (
    -- 's0000000...' não é hexadecimal válido para UUID (corrigido 2026-09-23)
    '50000000-0000-4000-8000-000000000002'::UUID,
    v_clinic_id,
    'clinica',
    'ativa',
    240000, -- R$ 2.400,00 em centavos
    'Plano Cockpit Enterprise contratado para até 5 médicos e auditoria contínua de IA',
    now(),
    now() + interval '1 year'
  )
  ON CONFLICT (id) DO UPDATE SET
    plan_code = EXCLUDED.plan_code,
    status = EXCLUDED.status,
    monthly_price_cents = EXCLUDED.monthly_price_cents,
    updated_at = now();

  -- 3. Inserir ou Vincular Usuários no Schema de Auth se compatível
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    -- Dr. Gustavo Mello (Admin)
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud
    ) VALUES (
      v_user_gustavo_id,
      '00000000-0000-0000-0000-000000000000'::UUID,
      'dr.gustavo@lumina.med.br',
      crypt('Lumina#2026!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Dr. Gustavo Mello","clinic_slug":"lumina-saude"}',
      now(),
      now(),
      'authenticated',
      'authenticated'
    ) ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      encrypted_password = EXCLUDED.encrypted_password,
      updated_at = now();

    -- Dra. Camila Nogueira (Doctor)
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud
    ) VALUES (
      v_user_camila_id,
      '00000000-0000-0000-0000-000000000000'::UUID,
      'dra.camila@lumina.med.br',
      crypt('Lumina#2026!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Dra. Camila Nogueira","clinic_slug":"lumina-saude"}',
      now(),
      now(),
      'authenticated',
      'authenticated'
    ) ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      encrypted_password = EXCLUDED.encrypted_password,
      updated_at = now();

    -- Recepção (Staff)
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud
    ) VALUES (
      v_user_recepcao_id,
      '00000000-0000-0000-0000-000000000000'::UUID,
      'triagem@lumina.med.br',
      crypt('Lumina#2026!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Equipe de Recepção Lumina","clinic_slug":"lumina-saude"}',
      now(),
      now(),
      'authenticated',
      'authenticated'
    ) ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      encrypted_password = EXCLUDED.encrypted_password,
      updated_at = now();
  END IF;

  -- 4. Inserir Perfis Médicos em doctor_profiles
  INSERT INTO public.doctor_profiles (
    id,
    clinic_id,
    user_id,
    display_name,
    specialty,
    is_listed
  ) VALUES (
    'd0000000-0000-4000-8000-000000000001'::UUID,
    v_clinic_id,
    v_user_gustavo_id,
    'Dr. Gustavo Mello',
    'CRM 198765-SP · Psiquiatria de Adultos & Neurociências',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    specialty = EXCLUDED.specialty,
    is_listed = true,
    updated_at = now();

  INSERT INTO public.doctor_profiles (
    id,
    clinic_id,
    user_id,
    display_name,
    specialty,
    is_listed
  ) VALUES (
    'd0000000-0000-4000-8000-000000000002'::UUID,
    v_clinic_id,
    v_user_camila_id,
    'Dra. Camila Nogueira',
    'CRM 234567-SP · Psiquiatria da Infância & Adolescência',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    specialty = EXCLUDED.specialty,
    is_listed = true,
    updated_at = now();

  -- 5. Atribuir Papéis em user_roles
  INSERT INTO public.user_roles (
    user_id,
    clinic_id,
    role
  ) VALUES
    (v_user_gustavo_id, v_clinic_id, 'admin'::public.app_role),
    (v_user_camila_id, v_clinic_id, 'doctor'::public.app_role),
    (v_user_recepcao_id, v_clinic_id, 'staff'::public.app_role)
  -- O índice único real é a expressão user_roles_user_role_clinic_uniq
  -- (user_id, role, COALESCE(clinic_id, '00000...'::uuid)), não um
  -- constraint simples em (user_id, role, clinic_id) — o ON CONFLICT
  -- precisa bater com a expressão exata pra Postgres conseguir inferir o
  -- índice, senão "there is no unique or exclusion constraint matching".
  ON CONFLICT (user_id, role, (COALESCE(clinic_id, '00000000-0000-0000-0000-000000000000'::uuid)))
  DO NOTHING;

END $$;
