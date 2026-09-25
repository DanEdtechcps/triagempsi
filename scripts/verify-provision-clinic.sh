#!/usr/bin/env bash
# Verificação de ponta a ponta de provision_new_clinic() contra um Postgres
# descartável (Docker) — não toca no banco de produção.
#
# Roadmap 2026-09-24, item #3: prova que o fluxo de provisionamento cria
# clinics + clinic_subscriptions + clinic_psychoeducation_settings numa
# única chamada, e que uma falha em qualquer etapa desfaz tudo (atomicidade
# real, não só "parece atômico"). Não é um vitest — este projeto mantém
# 100% dos testes automatizados como lógica pura sem I/O (ver
# src/**/*.test.ts); rodar um Postgres real via Docker deixaria `bun run
# test` dependente de Docker estar disponível pra todo commit, o que é um
# custo alto demais pra um item de dívida técnica pontual. Este script é uma
# ferramenta de verificação manual, reexecutável sempre que
# provision_new_clinic() for alterada de novo.
#
# Uso: bash scripts/verify-provision-clinic.sh
# Requer: Docker rodando localmente.

set -euo pipefail

MIGRATION_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/supabase/migrations/20260925090000_provision_new_clinic_atomic_v3.sql"
CONTAINER_NAME="triagem-verify-provision-$$"
PGPORT=15432

if ! docker info >/dev/null 2>&1; then
  echo "Docker não está disponível — pule esta verificação ou rode-a numa máquina com Docker." >&2
  exit 1
fi

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "==> Subindo Postgres descartável ($CONTAINER_NAME)..."
docker run -d --name "$CONTAINER_NAME" \
  -e POSTGRES_PASSWORD=postgres \
  -p "${PGPORT}:5432" \
  postgres:16-alpine >/dev/null

psql_exec() {
  docker exec -i "$CONTAINER_NAME" psql -U postgres -v ON_ERROR_STOP=1 -q "$@"
}

echo "==> Aguardando o banco aceitar conexões..."
for _ in $(seq 1 30); do
  if docker exec "$CONTAINER_NAME" pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "==> Aplicando schema mínimo (só as tabelas que provision_new_clinic toca)..."
psql_exec <<'SQL'
CREATE SCHEMA IF NOT EXISTS auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';
CREATE ROLE service_role;

CREATE TABLE public.clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text,
  primary_color text,
  accent_color text,
  contact_email text,
  contact_phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  monthly_price_cents integer,
  max_professionals integer,
  max_units integer
);
INSERT INTO public.plans (code, name, monthly_price_cents, max_professionals, max_units) VALUES
  ('consultorio', 'Consultório', 89000, 2, 1),
  ('clinica', 'Clínica', 240000, NULL, 6);

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

CREATE TABLE public.psychoeducation_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true
);
INSERT INTO public.psychoeducation_topics (slug, title, sort_order) VALUES
  ('t1','Tema 1',1), ('t2','Tema 2',2), ('t3','Tema 3',3), ('t4','Tema 4',4),
  ('t5','Tema 5',5), ('t6','Tema 6',6), ('t7','Tema 7',7), ('t8','Tema 8',8),
  ('t9','Tema 9',9), ('t10','Tema 10',10), ('t11-nao-deveria-entrar','Tema 11',11);

CREATE TABLE public.clinic_psychoeducation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.psychoeducation_topics(id) ON DELETE CASCADE,
  is_enabled boolean DEFAULT true,
  auto_trigger boolean DEFAULT true,
  UNIQUE(clinic_id, topic_id)
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid,
  actor_user_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
SQL

echo "==> Aplicando a migration real (provision_new_clinic v3)..."
docker exec -i "$CONTAINER_NAME" psql -U postgres -v ON_ERROR_STOP=1 -q < "$MIGRATION_FILE"

FAIL=0

echo "==> Teste 1: chamada única cria clinics + clinic_subscriptions + 10 clinic_psychoeducation_settings"
RESULT=$(psql_exec -t <<'SQL'
SELECT provision_new_clinic('teste-e2e', 'Clínica Teste E2E', 'Tagline', '#111111', '#222222', 'a@b.com', '11999998888');
SQL
)
CLINIC_ID=$(echo "$RESULT" | xargs)
echo "    clinic_id = $CLINIC_ID"

CLINIC_COUNT=$(psql_exec -t -c "SELECT count(*) FROM public.clinics WHERE id = '$CLINIC_ID';" | xargs)
SUB_COUNT=$(psql_exec -t -c "SELECT count(*) FROM public.clinic_subscriptions WHERE clinic_id = '$CLINIC_ID';" | xargs)
TOPIC_COUNT=$(psql_exec -t -c "SELECT count(*) FROM public.clinic_psychoeducation_settings WHERE clinic_id = '$CLINIC_ID';" | xargs)

echo "    clinics=$CLINIC_COUNT subscriptions=$SUB_COUNT psychoeducation_settings=$TOPIC_COUNT (esperado: 1, 1, 10)"
if [ "$CLINIC_COUNT" != "1" ] || [ "$SUB_COUNT" != "1" ] || [ "$TOPIC_COUNT" != "10" ]; then
  echo "    FALHOU"
  FAIL=1
else
  echo "    OK"
fi

echo "==> Teste 2: slug duplicado aborta com 23505 e NÃO cria uma segunda linha"
if psql_exec -c "SELECT provision_new_clinic('teste-e2e', 'Outra', 'X');" 2>/tmp/verify-provision-err.log; then
  echo "    FALHOU: deveria ter dado erro de slug duplicado"
  FAIL=1
else
  if grep -q "duplicate key value violates unique constraint" /tmp/verify-provision-err.log; then
    echo "    OK (erro de unicidade conforme esperado)"
  else
    echo "    FALHOU: erro inesperado:"
    cat /tmp/verify-provision-err.log
    FAIL=1
  fi
fi
CLINIC_COUNT_AFTER=$(psql_exec -t -c "SELECT count(*) FROM public.clinics WHERE slug = 'teste-e2e';" | xargs)
echo "    clinics com slug teste-e2e após a tentativa duplicada = $CLINIC_COUNT_AFTER (esperado: 1)"
[ "$CLINIC_COUNT_AFTER" = "1" ] || { echo "    FALHOU"; FAIL=1; }

echo "==> Teste 3: atomicidade real — se a última etapa (vínculo de temas) falhar, clinics/subscription NÃO ficam órfãos"
# Renomeia a tabela-alvo da última etapa pra forçar uma falha ali dentro da
# mesma chamada de função, sem quebrar FKs de linhas já existentes (o teste
# anterior já criou uma clínica cujo plano/assinatura não podem ser tocados).
psql_exec -c "ALTER TABLE public.clinic_psychoeducation_settings RENAME TO clinic_psychoeducation_settings_tmp;" >/dev/null
if psql_exec -c "SELECT provision_new_clinic('teste-atomicidade', 'Clínica Atomicidade', 'X');" 2>/tmp/verify-provision-err2.log; then
  echo "    FALHOU: deveria ter dado erro (tabela de temas indisponível)"
  FAIL=1
else
  echo "    erro obtido conforme esperado: $(grep -m1 ERROR /tmp/verify-provision-err2.log || head -1 /tmp/verify-provision-err2.log)"
fi
psql_exec -c "ALTER TABLE public.clinic_psychoeducation_settings_tmp RENAME TO clinic_psychoeducation_settings;" >/dev/null

ORPHAN_CLINIC=$(psql_exec -t -c "SELECT count(*) FROM public.clinics WHERE slug = 'teste-atomicidade';" | xargs)
ORPHAN_SUB=$(psql_exec -t -c "SELECT count(*) FROM public.clinic_subscriptions cs JOIN public.clinics c ON c.id = cs.clinic_id WHERE c.slug = 'teste-atomicidade';" | xargs)
echo "    clinics=$ORPHAN_CLINIC subscriptions=$ORPHAN_SUB para o slug teste-atomicidade após a falha (esperado: 0, 0 — nada de órfão)"
if [ "$ORPHAN_CLINIC" != "0" ] || [ "$ORPHAN_SUB" != "0" ]; then
  echo "    FALHOU: sobrou linha órfã mesmo com a última etapa falhando — NÃO é atômico"
  FAIL=1
else
  echo "    OK — rollback completo confirmado (nem a clínica nem a assinatura sobreviveram à falha)"
fi

echo ""
if [ "$FAIL" = "0" ]; then
  echo "=== TODOS OS TESTES PASSARAM ==="
  exit 0
else
  echo "=== FALHAS ENCONTRADAS ==="
  exit 1
fi
