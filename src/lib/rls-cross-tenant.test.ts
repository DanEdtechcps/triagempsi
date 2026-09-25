import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client, type QueryResult } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Primeiro teste de integração de isolamento cross-tenant real deste
// projeto (achado #1 do roadmap de 24/09/2026, prioridade máxima): "zero
// testes de integração verificam isolamento cross-tenant de ponta a ponta
// hoje". Os outros testes com RLS no nome (tenant-context.test.ts,
// assessment.functions.test.ts) testam lógica pura em memória — nunca uma
// query real contra Postgres com RLS avaliado pelo motor de banco.
//
// Sobe um Postgres efêmero via Docker, replaya as MESMAS migrations de
// supabase/migrations/*.sql (incluindo a mais recente, que unifica os dois
// padrões de RLS que existiam em paralelo — ver
// 20260925090000_unify_rls_to_inline_subquery.sql) e ataca o banco como um
// usuário `authenticated` de verdade (role trocado + claim de JWT via
// `set_config`, exatamente como o PostgREST/Supavisor fazem antes de cada
// query chegar no Postgres). auth.uid()/auth.jwt() são stubs equivalentes
// aos reais do Supabase (ver rls-cross-tenant.bootstrap.sql) — a RLS
// avaliada aqui é a policy real, não uma simulação.
//
// Requer Docker. Se Docker não estiver disponível, a suíte inteira é
// pulada (com aviso) em vez de quebrar `bun run test` em máquinas sem
// Docker — mas roda de verdade em qualquer CI/dev com Docker (a imagem
// `postgres:15-alpine` é pequena e o setup todo leva poucos segundos).

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const MIGRATIONS_DIR = join(REPO_ROOT, "supabase", "migrations");
const BOOTSTRAP_SQL_PATH = join(__dirname, "rls-cross-tenant.bootstrap.sql");

// Migration antiga que insere doctor_profiles pra uma clínica de produção
// (18a5eb6b-...) nunca criada por nenhuma migration (provisionada na mão —
// ver achado do roadmap sobre duplicação saraiva/padrao). Precisamos criar
// essa clínica-placeholder ANTES dela rodar, mas só DEPOIS que a migration
// que cria a tabela public.clinics já rodou.
const CLINICS_TABLE_MIGRATION = "20260728115644_b6218b4c-4342-4dfc-bc4b-1072b2d7c3d1.sql";
const LEGACY_CLINIC_PLACEHOLDER_ID = "18a5eb6b-f0b8-4f44-ac7b-e66b551727cf";

// Achado novo (confirmado ao construir este teste, não estava no roadmap):
// 20260919200000_provision_lumina_saude.sql declara
// `v_user_gustavo_id UUID := 'u0000000-0000-4000-8000-000000000001'::UUID`
// — 'u' não é dígito hexadecimal válido, então esse ::UUID cast SEMPRE
// falhou com "invalid input syntax for type uuid", abortando o bloco DO
// inteiro (e com ele, atomicamente, o INSERT da própria clínica Lumina que
// vem ANTES dos usuários no mesmo bloco). Ou seja: esta migração nunca
// gravou nada em produção — nem a clínica, nem os usuários — reforçando
// (com mais uma causa raiz) o que 20260923080200 já documentava ("não
// existe nenhuma linha em clinic_subscriptions pra Lumina em produção
// hoje"). Consequência prática pra este teste: não há como usar a
// clínica/usuários "reais" da Lumina a partir do replay das migrations —
// tratamos essa migração como falha esperada (idêntico ao que já
// acontece em produção) e criamos um tenant "Lumina" sintético, do mesmo
// jeito que já fazemos para "Saraiva". Consertar a arquitetura de
// provisionamento de clínica é o item #3 do roadmap, não o #1 (RLS) —
// fica registrado aqui como evidência para essa sessão futura.
const LUMINA_SEED_MIGRATION = "20260919200000_provision_lumina_saude.sql";

function dockerAvailable(): boolean {
  try {
    execFileSync("docker", ["info"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const hasDocker = dockerAvailable();
if (!hasDocker) {
  // eslint-disable-next-line no-console
  console.warn(
    "[rls-cross-tenant.test] Docker indisponível — suíte de isolamento RLS cross-tenant pulada. " +
      "Rode com Docker disponível (local ou CI) para exercitar o teste de verdade.",
  );
}

type ActingUser = { id: string; email: string };

type Outcome = { result?: QueryResult; error?: { code?: string; message: string } };

async function runAsUser(
  client: Client,
  actingUser: ActingUser,
  sql: string,
  params: unknown[] = [],
): Promise<Outcome> {
  await client.query("BEGIN");
  try {
    await client.query("SET LOCAL ROLE authenticated");
    await client.query("SELECT set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: actingUser.id, email: actingUser.email, role: "authenticated" }),
    ]);
    const result = await client.query(sql, params);
    return { result };
  } catch (err) {
    const pgErr = err as { code?: string; message?: string };
    return { error: { code: pgErr.code, message: pgErr.message ?? String(err) } };
  } finally {
    await client.query("ROLLBACK");
  }
}

/** Nem leu, nem escreveu: 0 linhas afetadas OU erro de permissão/RLS (42501). */
function expectNoCrossTenantEffect(outcome: Outcome): void {
  if (outcome.error) {
    expect(outcome.error.code).toBe("42501");
    return;
  }
  expect(outcome.result?.rowCount ?? 0).toBe(0);
}

function expectOwnTenantReadWorks(outcome: Outcome): void {
  expect(outcome.error).toBeUndefined();
  expect(outcome.result?.rowCount ?? 0).toBeGreaterThan(0);
}

describe.skipIf(!hasDocker)(
  "Isolamento RLS cross-tenant real (Postgres efêmero, Saraiva-fixture vs Lumina-fixture)",
  () => {
    const containerName = `triagem-rls-test-${randomUUID().slice(0, 8)}`;
    let client: Client;

    const saraivaClinicId = randomUUID();
    const luminaClinicId = randomUUID();
    const saraivaAdmin: ActingUser = { id: randomUUID(), email: "admin@saraiva-fixture.invalid" };
    const luminaAdmin: ActingUser = { id: randomUUID(), email: "admin@lumina-fixture.invalid" };

    const ids = {
      saraiva: {
        contact: randomUUID(),
        invitation: randomUUID(),
        assessment: randomUUID(),
        scaleResult: randomUUID(),
        note: randomUUID(),
        longitudinal: randomUUID(),
        subscription: randomUUID(),
        psychoSetting: randomUUID(),
        assessmentPsycho: randomUUID(),
      },
      lumina: {
        contact: randomUUID(),
        invitation: randomUUID(),
        assessment: randomUUID(),
        scaleResult: randomUUID(),
        note: randomUUID(),
        longitudinal: randomUUID(),
        subscription: randomUUID(),
        psychoSetting: randomUUID(),
        assessmentPsycho: randomUUID(),
      },
    };

    let topicId: string;

    beforeAll(async () => {
      try {
        execFileSync("docker", ["rm", "-f", containerName], { stdio: "ignore" });
      } catch {
        // container não existia — esperado na maioria das execuções.
      }

      execFileSync("docker", [
        "run",
        "-d",
        "--name",
        containerName,
        "-e",
        "POSTGRES_PASSWORD=postgres",
        "-P",
        "postgres:15-alpine",
      ]);

      const portMapping = execFileSync("docker", ["port", containerName, "5432/tcp"])
        .toString()
        .trim();
      const port = portMapping.split(":").pop();
      if (!port) {
        throw new Error(
          `Não foi possível descobrir a porta publicada do container ${containerName}`,
        );
      }
      const connectionString = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;

      // Espera o Postgres aceitar conexões (imagem alpine sobe rápido, mas
      // não é instantâneo).
      let lastError: unknown;
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const probe = new Client({ connectionString });
        try {
          await probe.connect();
          await probe.end();
          lastError = undefined;
          break;
        } catch (err) {
          lastError = err;
          await probe.end().catch(() => {});
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
      if (lastError) {
        throw new Error(`Postgres efêmero não ficou pronto a tempo: ${String(lastError)}`);
      }

      const psql = (sqlFile: string) =>
        execFileSync("psql", [connectionString, "-v", "ON_ERROR_STOP=1", "-q", "-f", sqlFile], {
          stdio: ["ignore", "pipe", "pipe"],
        });

      psql(BOOTSTRAP_SQL_PATH);

      const migrationFiles = readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith(".sql"))
        .sort();

      client = new Client({ connectionString });
      await client.connect();

      for (const file of migrationFiles) {
        if (file === LUMINA_SEED_MIGRATION) {
          // Falha esperada — ver o comentário grande acima de
          // LUMINA_SEED_MIGRATION. Reproduz exatamente o que acontece
          // contra o banco de produção real: o bloco DO $$ aborta e nada é
          // persistido. Confirmamos que não deixa a conexão em estado
          // inconsistente (nada fica commitado) e seguimos o replay.
          try {
            psql(join(MIGRATIONS_DIR, file));
            throw new Error(
              `${file} rodou sem erro neste replay — o bug do UUID inválido ('u0000000-...') ` +
                `pode ter sido corrigido na migration; revise o comentário de LUMINA_SEED_MIGRATION ` +
                `e os fixtures sintéticos de Lumina abaixo, que assumem que ela ainda falha.`,
            );
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (!message.includes("invalid input syntax for type uuid")) {
              throw err;
            }
          }
          continue;
        }

        psql(join(MIGRATIONS_DIR, file));

        if (file === CLINICS_TABLE_MIGRATION) {
          // Placeholder pra clínica de produção nunca criada por migration
          // (ver comentário no topo do arquivo) — só existe pra satisfazer
          // a FK da migration seguinte, não participa das asserções.
          await client.query(
            `INSERT INTO public.clinics (id, slug, name, tagline, primary_color, accent_color, intro_copy, done_copy, is_active)
             VALUES ($1, 'legacy-seed-fixture-placeholder', 'Legacy Seed Fixture', 'placeholder', '#000000', '#000000', 'placeholder', 'placeholder', true)
             ON CONFLICT (id) DO NOTHING`,
            [LEGACY_CLINIC_PLACEHOLDER_ID],
          );
        }
      }

      // ================================================================
      // Fixtures do tenant "Saraiva" (sintético — não existe migration
      // reproduzível pra clínica real de produção, ver roadmap).
      // ================================================================
      await client.query(
        `INSERT INTO public.clinics (id, slug, name, tagline, primary_color, accent_color, intro_copy, done_copy, is_active)
         VALUES ($1, 'saraiva-rls-test', 'Saraiva Clínica de Psiquiatria (fixture de teste)', 't', '#1e4d5c', '#3d8b8b', 'i', 'd', true)`,
        [saraivaClinicId],
      );
      await client.query(`INSERT INTO auth.users (id, email) VALUES ($1, $2)`, [
        saraivaAdmin.id,
        saraivaAdmin.email,
      ]);
      await client.query(
        `INSERT INTO public.user_roles (user_id, role, clinic_id) VALUES ($1, 'admin', $2)`,
        [saraivaAdmin.id, saraivaClinicId],
      );
      await client.query(
        `INSERT INTO public.contacts (id, name, email, clinic_id) VALUES ($1, 'Paciente Saraiva Fixture', 'paciente-saraiva@fixture.invalid', $2)`,
        [ids.saraiva.contact, saraivaClinicId],
      );
      await client.query(
        `INSERT INTO public.invitations (id, token, contact_id, clinic_id) VALUES ($1, $2, $3, $4)`,
        [ids.saraiva.invitation, randomUUID(), ids.saraiva.contact, saraivaClinicId],
      );
      await client.query(
        `INSERT INTO public.assessments (id, invitation_id, contact_id, clinic_id, respondent_name, respondent_email, consent_lgpd, status)
         VALUES ($1, $2, $3, $4, 'Paciente Saraiva Fixture', 'paciente-saraiva@fixture.invalid', true, 'completed')`,
        [ids.saraiva.assessment, ids.saraiva.invitation, ids.saraiva.contact, saraivaClinicId],
      );
      await client.query(
        `INSERT INTO public.scale_results (id, assessment_id, scale_code, scale_name, score)
         VALUES ($1, $2, 'PHQ9', 'PHQ-9', 5)`,
        [ids.saraiva.scaleResult, ids.saraiva.assessment],
      );
      await client.query(
        `INSERT INTO public.doctor_profiles (clinic_id, user_id, display_name, specialty)
         VALUES ($1, $2, 'Dr. Saraiva Fixture', 'Psiquiatria')`,
        [saraivaClinicId, saraivaAdmin.id],
      );
      await client.query(
        `INSERT INTO public.assessment_notes (id, assessment_id, clinic_id, author_user_id, author_email, body)
         VALUES ($1, $2, $3, $4, $5, 'Parecer fixture Saraiva')`,
        [
          ids.saraiva.note,
          ids.saraiva.assessment,
          saraivaClinicId,
          saraivaAdmin.id,
          saraivaAdmin.email,
        ],
      );
      await client.query(
        `INSERT INTO public.patient_longitudinal_records (id, clinic_id, patient_email, patient_name, assessment_id, scale_code, score)
         VALUES ($1, $2, 'paciente-saraiva@fixture.invalid', 'Paciente Saraiva Fixture', $3, 'PHQ9', 5)`,
        [ids.saraiva.longitudinal, saraivaClinicId, ids.saraiva.assessment],
      );
      await client.query(
        `INSERT INTO public.clinic_subscriptions (id, clinic_id, plan_code, status)
         VALUES ($1, $2, 'consultorio', 'trial')`,
        [ids.saraiva.subscription, saraivaClinicId],
      );

      const topicResult = await client.query<{ id: string }>(
        `SELECT id FROM public.psychoeducation_topics WHERE slug = 'depressao-humor' LIMIT 1`,
      );
      topicId = topicResult.rows[0]?.id;
      if (!topicId) {
        throw new Error(
          "Fixture: tópico de psicoeducação 'depressao-humor' não encontrado (seed da migration 20260917230000 não rodou?)",
        );
      }

      await client.query(
        `INSERT INTO public.clinic_psychoeducation_settings (id, clinic_id, topic_id) VALUES ($1, $2, $3)`,
        [ids.saraiva.psychoSetting, saraivaClinicId, topicId],
      );
      await client.query(
        `INSERT INTO public.assessment_psychoeducation (id, assessment_id, topic_id) VALUES ($1, $2, $3)`,
        [ids.saraiva.assessmentPsycho, ids.saraiva.assessment, topicId],
      );

      // ================================================================
      // Fixtures do tenant "Lumina" (sintético — a migration real de
      // provisionamento nunca gravou nada em produção, ver o comentário de
      // LUMINA_SEED_MIGRATION no topo do arquivo).
      // ================================================================
      await client.query(
        `INSERT INTO public.clinics (id, slug, name, tagline, primary_color, accent_color, intro_copy, done_copy, is_active)
         VALUES ($1, 'lumina-rls-test', 'Instituto Lumina (fixture de teste)', 't', '#4c1d95', '#8b5cf6', 'i', 'd', true)`,
        [luminaClinicId],
      );
      await client.query(`INSERT INTO auth.users (id, email) VALUES ($1, $2)`, [
        luminaAdmin.id,
        luminaAdmin.email,
      ]);
      await client.query(
        `INSERT INTO public.user_roles (user_id, role, clinic_id) VALUES ($1, 'admin', $2)`,
        [luminaAdmin.id, luminaClinicId],
      );
      await client.query(
        `INSERT INTO public.contacts (id, name, email, clinic_id) VALUES ($1, 'Paciente Lumina Fixture', 'paciente-lumina@fixture.invalid', $2)`,
        [ids.lumina.contact, luminaClinicId],
      );
      await client.query(
        `INSERT INTO public.invitations (id, token, contact_id, clinic_id) VALUES ($1, $2, $3, $4)`,
        [ids.lumina.invitation, randomUUID(), ids.lumina.contact, luminaClinicId],
      );
      await client.query(
        `INSERT INTO public.assessments (id, invitation_id, contact_id, clinic_id, respondent_name, respondent_email, consent_lgpd, status)
         VALUES ($1, $2, $3, $4, 'Paciente Lumina Fixture', 'paciente-lumina@fixture.invalid', true, 'completed')`,
        [ids.lumina.assessment, ids.lumina.invitation, ids.lumina.contact, luminaClinicId],
      );
      await client.query(
        `INSERT INTO public.scale_results (id, assessment_id, scale_code, scale_name, score)
         VALUES ($1, $2, 'PHQ9', 'PHQ-9', 8)`,
        [ids.lumina.scaleResult, ids.lumina.assessment],
      );
      await client.query(
        `INSERT INTO public.doctor_profiles (clinic_id, user_id, display_name, specialty)
         VALUES ($1, $2, 'Dr. Lumina Fixture', 'Psiquiatria')`,
        [luminaClinicId, luminaAdmin.id],
      );
      await client.query(
        `INSERT INTO public.assessment_notes (id, assessment_id, clinic_id, author_user_id, author_email, body)
         VALUES ($1, $2, $3, $4, $5, 'Parecer fixture Lumina')`,
        [ids.lumina.note, ids.lumina.assessment, luminaClinicId, luminaAdmin.id, luminaAdmin.email],
      );
      await client.query(
        `INSERT INTO public.patient_longitudinal_records (id, clinic_id, patient_email, patient_name, assessment_id, scale_code, score)
         VALUES ($1, $2, 'paciente-lumina@fixture.invalid', 'Paciente Lumina Fixture', $3, 'PHQ9', 8)`,
        [ids.lumina.longitudinal, luminaClinicId, ids.lumina.assessment],
      );
      await client.query(
        `INSERT INTO public.clinic_subscriptions (id, clinic_id, plan_code, status)
         VALUES ($1, $2, 'consultorio', 'trial')`,
        [ids.lumina.subscription, luminaClinicId],
      );
      await client.query(
        `INSERT INTO public.clinic_psychoeducation_settings (id, clinic_id, topic_id) VALUES ($1, $2, $3)`,
        [ids.lumina.psychoSetting, luminaClinicId, topicId],
      );
      await client.query(
        `INSERT INTO public.assessment_psychoeducation (id, assessment_id, topic_id) VALUES ($1, $2, $3)`,
        [ids.lumina.assessmentPsycho, ids.lumina.assessment, topicId],
      );
    }, 180_000);

    afterAll(async () => {
      await client?.end().catch(() => {});
      try {
        execFileSync("docker", ["rm", "-f", containerName], { stdio: "ignore" });
      } catch {
        // já removido / nunca chegou a subir — nada a fazer.
      }
    });

    type TableCase = {
      table: string;
      readColumn: string; // coluna usada pra filtrar por dono na leitura
      ownIdSaraiva: string;
      ownIdLumina: string;
      writableColumn: string; // coluna não-chave livre pra tentar um UPDATE
      writableValue: string;
    };

    const cases: TableCase[] = [
      {
        table: "contacts",
        readColumn: "id",
        ownIdSaraiva: ids.saraiva.contact,
        ownIdLumina: ids.lumina.contact,
        writableColumn: "name",
        writableValue: "hacked",
      },
      {
        table: "invitations",
        readColumn: "id",
        ownIdSaraiva: ids.saraiva.invitation,
        ownIdLumina: ids.lumina.invitation,
        writableColumn: "status",
        writableValue: "hacked",
      },
      {
        table: "assessments",
        readColumn: "id",
        ownIdSaraiva: ids.saraiva.assessment,
        ownIdLumina: ids.lumina.assessment,
        writableColumn: "status",
        writableValue: "hacked",
      },
      {
        table: "scale_results",
        readColumn: "id",
        ownIdSaraiva: ids.saraiva.scaleResult,
        ownIdLumina: ids.lumina.scaleResult,
        writableColumn: "notes",
        writableValue: "hacked",
      },
      {
        table: "patient_longitudinal_records",
        readColumn: "id",
        ownIdSaraiva: ids.saraiva.longitudinal,
        ownIdLumina: ids.lumina.longitudinal,
        writableColumn: "band",
        writableValue: "hacked",
      },
      {
        table: "clinic_psychoeducation_settings",
        readColumn: "id",
        ownIdSaraiva: ids.saraiva.psychoSetting,
        ownIdLumina: ids.lumina.psychoSetting,
        writableColumn: "custom_intro",
        writableValue: "hacked",
      },
      {
        table: "assessment_psychoeducation",
        readColumn: "id",
        ownIdSaraiva: ids.saraiva.assessmentPsycho,
        ownIdLumina: ids.lumina.assessmentPsycho,
        writableColumn: "trigger_reason",
        writableValue: "hacked",
      },
    ];

    describe.each(cases)("$table", (tc) => {
      it("clínica A não lê a linha da clínica B", async () => {
        const outcome = await runAsUser(
          client,
          saraivaAdmin,
          `SELECT ${tc.readColumn} FROM public.${tc.table} WHERE ${tc.readColumn} = $1`,
          [tc.ownIdLumina],
        );
        expectNoCrossTenantEffect(outcome);
      });

      it("clínica B não lê a linha da clínica A", async () => {
        const outcome = await runAsUser(
          client,
          luminaAdmin,
          `SELECT ${tc.readColumn} FROM public.${tc.table} WHERE ${tc.readColumn} = $1`,
          [tc.ownIdSaraiva],
        );
        expectNoCrossTenantEffect(outcome);
      });

      it("controle positivo: clínica A lê a própria linha", async () => {
        const outcome = await runAsUser(
          client,
          saraivaAdmin,
          `SELECT ${tc.readColumn} FROM public.${tc.table} WHERE ${tc.readColumn} = $1`,
          [tc.ownIdSaraiva],
        );
        expectOwnTenantReadWorks(outcome);
      });

      it("controle positivo: clínica B lê a própria linha", async () => {
        const outcome = await runAsUser(
          client,
          luminaAdmin,
          `SELECT ${tc.readColumn} FROM public.${tc.table} WHERE ${tc.readColumn} = $1`,
          [tc.ownIdLumina],
        );
        expectOwnTenantReadWorks(outcome);
      });

      it("clínica A não escreve na linha da clínica B", async () => {
        const outcome = await runAsUser(
          client,
          saraivaAdmin,
          `UPDATE public.${tc.table} SET ${tc.writableColumn} = $1 WHERE ${tc.readColumn} = $2`,
          [tc.writableValue, tc.ownIdLumina],
        );
        expectNoCrossTenantEffect(outcome);
      });

      it("clínica B não escreve na linha da clínica A", async () => {
        const outcome = await runAsUser(
          client,
          luminaAdmin,
          `UPDATE public.${tc.table} SET ${tc.writableColumn} = $1 WHERE ${tc.readColumn} = $2`,
          [tc.writableValue, tc.ownIdSaraiva],
        );
        expectNoCrossTenantEffect(outcome);
      });
    });

    // doctor_profiles: usa user_id em vez de um id de linha próprio pros
    // dois lados (a fixture da Saraiva usa o próprio admin como "médico").
    describe("doctor_profiles", () => {
      it("clínica A não lê o perfil de médico da clínica B", async () => {
        const outcome = await runAsUser(
          client,
          saraivaAdmin,
          `SELECT id FROM public.doctor_profiles WHERE clinic_id = $1`,
          [luminaClinicId],
        );
        expectNoCrossTenantEffect(outcome);
      });

      it("clínica B não lê o perfil de médico da clínica A", async () => {
        const outcome = await runAsUser(
          client,
          luminaAdmin,
          `SELECT id FROM public.doctor_profiles WHERE clinic_id = $1`,
          [saraivaClinicId],
        );
        expectNoCrossTenantEffect(outcome);
      });

      it("controle positivo: cada clínica lê o próprio perfil de médico", async () => {
        const asSaraiva = await runAsUser(
          client,
          saraivaAdmin,
          `SELECT id FROM public.doctor_profiles WHERE clinic_id = $1`,
          [saraivaClinicId],
        );
        expectOwnTenantReadWorks(asSaraiva);

        const asLumina = await runAsUser(
          client,
          luminaAdmin,
          `SELECT id FROM public.doctor_profiles WHERE clinic_id = $1`,
          [luminaClinicId],
        );
        expectOwnTenantReadWorks(asLumina);
      });
    });

    // clinic_subscriptions: só existe policy de leitura pra staff (a
    // escrita é reservada a admin global via is_global_admin/subquery
    // equivalente) — testamos leitura cross-tenant, que é o que importa
    // pro isolamento de dado de billing entre clínicas.
    describe("clinic_subscriptions", () => {
      it("clínica A não lê a assinatura da clínica B", async () => {
        const outcome = await runAsUser(
          client,
          saraivaAdmin,
          `SELECT id FROM public.clinic_subscriptions WHERE clinic_id = $1`,
          [luminaClinicId],
        );
        expectNoCrossTenantEffect(outcome);
      });

      it("clínica B não lê a assinatura da clínica A", async () => {
        const outcome = await runAsUser(
          client,
          luminaAdmin,
          `SELECT id FROM public.clinic_subscriptions WHERE clinic_id = $1`,
          [saraivaClinicId],
        );
        expectNoCrossTenantEffect(outcome);
      });

      it("controle positivo: cada clínica lê a própria assinatura", async () => {
        const asSaraiva = await runAsUser(
          client,
          saraivaAdmin,
          `SELECT id FROM public.clinic_subscriptions WHERE clinic_id = $1`,
          [saraivaClinicId],
        );
        expectOwnTenantReadWorks(asSaraiva);

        const asLumina = await runAsUser(
          client,
          luminaAdmin,
          `SELECT id FROM public.clinic_subscriptions WHERE clinic_id = $1`,
          [luminaClinicId],
        );
        expectOwnTenantReadWorks(asLumina);
      });
    });

    // assessment_notes: além do isolamento cross-tenant (leitura), cobre o
    // achado do roadmap "assessment_notes tem SELECT/INSERT mas nenhuma
    // policy de UPDATE/DELETE, apesar de ter trigger de updated_at —
    // provável lacuna funcional". Confirmamos aqui com uma tentativa real
    // de UPDATE feita pelo PRÓPRIO admin dono da nota (não é cross-tenant):
    // se a tabela realmente não tem GRANT/policy de UPDATE, isso falha com
    // 42501 pra QUALQUER usuário autenticado, inclusive o dono — ou seja,
    // não é uma lacuna de isolamento (a nota já é protegida de todo mundo),
    // e sim o comportamento pretendido pelo próprio código da aplicação
    // (`notes.functions.ts` chama a nota de "histórico imutável" — nunca
    // expõe update/delete). Ver documentação viva/02_BANCO_DE_DADOS_E_MIGRACOES.md.
    describe("assessment_notes", () => {
      it("clínica A não lê a nota da clínica B", async () => {
        const outcome = await runAsUser(
          client,
          saraivaAdmin,
          `SELECT id FROM public.assessment_notes WHERE id = $1`,
          [ids.lumina.note],
        );
        expectNoCrossTenantEffect(outcome);
      });

      it("clínica B não lê a nota da clínica A", async () => {
        const outcome = await runAsUser(
          client,
          luminaAdmin,
          `SELECT id FROM public.assessment_notes WHERE id = $1`,
          [ids.saraiva.note],
        );
        expectNoCrossTenantEffect(outcome);
      });

      it("controle positivo: cada clínica lê a própria nota", async () => {
        const asSaraiva = await runAsUser(
          client,
          saraivaAdmin,
          `SELECT id FROM public.assessment_notes WHERE id = $1`,
          [ids.saraiva.note],
        );
        expectOwnTenantReadWorks(asSaraiva);

        const asLumina = await runAsUser(
          client,
          luminaAdmin,
          `SELECT id FROM public.assessment_notes WHERE id = $1`,
          [ids.lumina.note],
        );
        expectOwnTenantReadWorks(asLumina);
      });

      it("nem o próprio autor consegue alterar a nota — imutabilidade por design, não é a lacuna que o roadmap suspeitava", async () => {
        const outcome = await runAsUser(
          client,
          saraivaAdmin,
          `UPDATE public.assessment_notes SET body = 'editado' WHERE id = $1`,
          [ids.saraiva.note],
        );
        // Sem GRANT de UPDATE pra `authenticated` (confirmado nas
        // migrations) — bloqueado pra todo mundo, não só cross-tenant.
        expect(outcome.error?.code).toBe("42501");
      });

      it("nem o próprio autor consegue apagar a nota", async () => {
        const outcome = await runAsUser(
          client,
          saraivaAdmin,
          `DELETE FROM public.assessment_notes WHERE id = $1`,
          [ids.saraiva.note],
        );
        expect(outcome.error?.code).toBe("42501");
      });
    });
  },
);
