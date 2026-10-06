#!/usr/bin/env bun
/**
 * Gera e carrega os e-mails do Supabase Auth (português, modelo TriagemPsi).
 *
 *   bun scripts/supabase-auth-emails.ts write   → grava supabase/templates/*.html
 *   bun scripts/supabase-auth-emails.ts push    → PATCH /v1/projects/{ref}/config/auth
 *
 * `push` lê SUPABASE_ACCESS_TOKEN (e, opcionalmente, RESEND_SMTP_KEY para ligar o SMTP do
 * Resend) do ambiente ou de ~/.credentials/supabase.env. Antes de alterar, guarda um backup
 * da configuração atual em ~/.credentials/ (fora do repositório). Nunca imprime segredos.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  AUTH_EMAIL_KEYS,
  authConfigPayload,
  renderAuthEmail,
} from "../src/lib/supabase-auth-emails";

const REF = process.env.SUPABASE_PROJECT_ID ?? "ffyjjkouscnabyxjxexu";
const API = `https://api.supabase.com/v1/projects/${REF}/config/auth`;
const SMTP_FROM = process.env.AUTH_SMTP_FROM ?? "acesso@mail.psiqway.com.br";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

function write() {
  const dir = join(import.meta.dir, "..", "supabase", "templates");
  mkdirSync(dir, { recursive: true });
  for (const key of AUTH_EMAIL_KEYS) {
    const { html } = renderAuthEmail(key);
    writeFileSync(join(dir, `${key}.html`), html + "\n");
  }
  console.log(`${AUTH_EMAIL_KEYS.length} modelos gravados em supabase/templates/`);
}

async function push() {
  loadEnvFile(join(homedir(), ".credentials", "supabase.env"));
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error("Falta SUPABASE_ACCESS_TOKEN (ambiente ou ~/.credentials/supabase.env).");
    process.exit(2);
  }
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const cur = await fetch(API, { headers });
  if (!cur.ok) {
    console.error(`Não consegui ler a configuração atual (HTTP ${cur.status}).`);
    process.exit(3);
  }
  const current = (await cur.json()) as Record<string, unknown>;
  const backup: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(current)) {
    if ((k.startsWith("mailer_") || k.startsWith("smtp_")) && k !== "smtp_pass") backup[k] = v;
  }
  mkdirSync(join(homedir(), ".credentials"), { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(homedir(), ".credentials", `supabase-auth-backup-${stamp}.json`);
  writeFileSync(backupPath, JSON.stringify(backup, null, 2), { mode: 0o600 });

  const payload: Record<string, unknown> = authConfigPayload();
  if (process.env.RESEND_SMTP_KEY) {
    Object.assign(payload, {
      smtp_host: "smtp.resend.com",
      smtp_port: "465",
      smtp_user: "resend",
      smtp_pass: process.env.RESEND_SMTP_KEY,
      smtp_admin_email: SMTP_FROM,
      smtp_sender_name: "TriagemPsi",
    });
  }

  const res = await fetch(API, { method: "PATCH", headers, body: JSON.stringify(payload) });
  if (!res.ok) {
    console.error(`PATCH recusado (HTTP ${res.status}): ${(await res.text()).slice(0, 300)}`);
    process.exit(4);
  }
  const after = (await res.json()) as Record<string, unknown>;
  const ok = AUTH_EMAIL_KEYS.every(
    (k) => after[`mailer_subjects_${k}`] === payload[`mailer_subjects_${k}`],
  );
  console.log(`HTTP ${res.status} — modelos conferidos na resposta: ${ok ? "OK" : "DIFERENTES"}`);
  console.log(
    `SMTP próprio: ${after.smtp_host ? `ligado (${after.smtp_host})` : "NÃO configurado"}`,
  );
  console.log(`Backup da configuração anterior: ${backupPath}`);
}

const mode = process.argv[2];
if (mode === "write") write();
else if (mode === "push") await push();
else {
  console.error("Uso: bun scripts/supabase-auth-emails.ts write|push");
  process.exit(1);
}
