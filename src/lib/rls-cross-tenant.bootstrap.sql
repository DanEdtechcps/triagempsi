-- Bootstrap SÓ PARA TESTE — nunca é aplicado em produção, nunca vive em
-- supabase/migrations/. Roda uma única vez, antes de replayar as migrations
-- reais, contra um container Postgres efêmero e descartável
-- (src/lib/rls-cross-tenant.test.ts).
--
-- Stuba as partes da plataforma Supabase de que as policies de RLS
-- dependem (schema `auth` com auth.uid()/auth.jwt()/auth.role() e a tabela
-- auth.users, schema `storage` com storage.objects) e os papéis de banco
-- (`anon`, `authenticated`, `service_role`) — o suficiente pra rodar as
-- MESMAS migrations e policies que rodam em produção, com RLS de verdade
-- sendo avaliado pelo Postgres (não mockado).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ====================================================================
-- Schema auth (stub mínimo, compatível com o real)
-- ====================================================================
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  instance_id uuid,
  email text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  role text,
  aud text
);

-- Mesma semântica da implementação real do Supabase: lê a claim do JWT que
-- o PostgREST/Supavisor injeta como GUC de sessão antes de rodar a query.
-- Aqui quem faz esse papel é o helper de teste `runAsUser` (set_config).
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', 'anon');
$$;

-- ====================================================================
-- Papéis de banco usados pelas policies (TO authenticated / TO anon / grants)
-- ====================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.jwt() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.role() TO anon, authenticated, service_role;
GRANT SELECT ON auth.users TO anon, authenticated, service_role;

-- ====================================================================
-- Schema storage (stub mínimo — só o necessário pra migration
-- 20260812020233, que cria policies em storage.objects pro bucket 'landing',
-- e pra 20260927020000, que faz INSERT em storage.buckets pro bucket
-- 'psychoeducation-media')
-- ====================================================================
CREATE SCHEMA IF NOT EXISTS storage;
CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text
);
CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text,
  public boolean DEFAULT false
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT ALL ON storage.objects TO service_role;
GRANT ALL ON storage.buckets TO service_role;

-- ====================================================================
-- Placeholders para UUIDs de produção hardcoded em migrations antigas que
-- assumem usuários já existentes fora do controle das migrations (criados
-- manualmente no dashboard do Supabase / via Auth signup, nunca por
-- migration). Sem isso, o replay das migrations reais abortaria em
-- violação de FK num banco local do zero:
--   - 20260728221437 e 20260729010842 inserem user_roles de admin global
--     pra 2 UUIDs de usuário reais de produção.
--   - 20260812223345 insere doctor_profiles pra 2 UUIDs de usuário reais
--     de produção, numa clínica (18a5eb6b-...) que também nunca foi criada
--     por nenhuma migration (provisionada manualmente — ver achado do
--     roadmap sobre duplicação de clínica saraiva/padrao).
-- Nenhuma dessas linhas participa das asserções de isolamento cross-tenant
-- deste teste — existem só pra permitir o replay fiel das migrations reais.
INSERT INTO auth.users (id, email) VALUES
  ('4b5a4876-971c-4344-a210-1e638ec9ccb5', 'legacy-global-admin-1@fixture.invalid'),
  ('9d27e879-8f90-4abc-bfaa-34c187c29f2d', 'legacy-global-admin-2@fixture.invalid'),
  ('913446ae-9894-4bdc-a2bb-a0d76dca8b20', 'legacy-doctor-1@fixture.invalid'),
  ('6bb7bf26-7889-4b51-a465-d5fe2acf472d', 'legacy-doctor-2@fixture.invalid')
ON CONFLICT (id) DO NOTHING;
