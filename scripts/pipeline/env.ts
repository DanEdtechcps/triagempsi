/**
 * env.ts — Centralização de variáveis de ambiente dos scripts de pipeline.
 *
 * REGRA: Nenhum caminho absoluto aqui. Tudo parametrizado via env ou relativo
 * ao diretório de execução do script (process.cwd()).
 *
 * Uso: import { env } from "./env";
 */

import { join } from "node:path";

function require_env(key: string): string {
  const val = process.env[key];
  if (!val || !val.trim()) {
    throw new Error(
      `[pipeline/env] Variável de ambiente obrigatória não encontrada: ${key}\n` +
        `  → Copie .env.example → .env.local e preencha o valor.`,
    );
  }
  return val.trim();
}

function optional_env(key: string, fallback: string): string {
  return (process.env[key] ?? "").trim() || fallback;
}

export const env = {
  // ── Supabase ────────────────────────────────────────────────────────────────
  SUPABASE_URL: require_env("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: require_env("SUPABASE_SERVICE_ROLE_KEY"),

  // ── Diretórios (relativos ao CWD ou absolutos via env — NUNCA hardcoded) ───
  INPUT_DIR: optional_env("INPUT_DIR", join(process.cwd(), "data", "saraiva-material")),
  OUTPUT_DIR: optional_env("OUTPUT_DIR", join(process.cwd(), "data", "processed")),

  // ── Storage ─────────────────────────────────────────────────────────────────
  STORAGE_BUCKET: optional_env("STORAGE_BUCKET", "clinical-assets"),

  // ── Config do batch ─────────────────────────────────────────────────────────
  /** Máximo de registros por batch para não estourar rate-limit do Supabase */
  BATCH_SIZE: parseInt(optional_env("BATCH_SIZE", "50"), 10),
} as const;
