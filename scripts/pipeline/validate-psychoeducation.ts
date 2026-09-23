#!/usr/bin/env bun
/**
 * validate-psychoeducation.ts
 *
 * Valida um arquivo JSON de tópicos de psicoeducação contra o schema esperado
 * pela tabela `psychoeducation_topics` / `psychoeducation_contents` antes de
 * qualquer push ao banco.
 *
 * Uso:
 *   bun scripts/pipeline/validate-psychoeducation.ts [--file <caminho.json>]
 *
 * Padrão: lê de OUTPUT_DIR/psychoeducation_topics.json (ver env.ts)
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { env } from "./env";

// ── Tipos esperados ────────────────────────────────────────────────────────────

interface PsychoeducationContent {
  version: string;
  level: "resumo" | "completo" | "crise";
  title: string;
  body_md: string;
  summary_pdf?: string;
  external_links?: string[];
  video_urls?: string[];
}

interface PsychoeducationTopic {
  slug: string;
  title: string;
  short_title?: string;
  description?: string;
  icon?: string;
  sort_order?: number;
  contents: PsychoeducationContent[];
}

// ── Validação ─────────────────────────────────────────────────────────────────

function validateTopic(topic: unknown, idx: number): string[] {
  const errors: string[] = [];
  if (typeof topic !== "object" || !topic) {
    return [`[${idx}] Não é um objeto válido`];
  }
  const t = topic as Record<string, unknown>;

  if (!t.slug || typeof t.slug !== "string") errors.push(`[${idx}] 'slug' obrigatório (string)`);
  if (!t.title || typeof t.title !== "string") errors.push(`[${idx}] 'title' obrigatório (string)`);
  if (!Array.isArray(t.contents) || t.contents.length === 0) {
    errors.push(`[${idx}/${t.slug}] 'contents' deve ser array não-vazio`);
    return errors;
  }

  const validLevels = ["resumo", "completo", "crise"];
  for (const [ci, c] of (t.contents as unknown[]).entries()) {
    const co = c as Record<string, unknown>;
    if (!co.level || !validLevels.includes(co.level as string)) {
      errors.push(`[${idx}/${t.slug}/content[${ci}]] 'level' inválido: ${co.level}`);
    }
    if (!co.title || typeof co.title !== "string") {
      errors.push(`[${idx}/${t.slug}/content[${ci}]] 'title' obrigatório`);
    }
    if (!co.body_md || typeof co.body_md !== "string" || (co.body_md as string).length < 50) {
      errors.push(`[${idx}/${t.slug}/content[${ci}]] 'body_md' muito curto (mín. 50 chars)`);
    }
  }

  return errors;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const fileArg = process.argv.indexOf("--file");
const filePath =
  fileArg !== -1 ? process.argv[fileArg + 1] : join(env.OUTPUT_DIR, "psychoeducation_topics.json");

if (!existsSync(filePath)) {
  console.error(`❌ Arquivo não encontrado: ${filePath}`);
  console.error(`   Defina OUTPUT_DIR no .env.local ou passe --file <caminho>`);
  process.exit(1);
}

let topics: unknown[];
try {
  topics = JSON.parse(readFileSync(filePath, "utf-8"));
} catch (e) {
  console.error(`❌ JSON inválido em: ${filePath}`);
  console.error(e);
  process.exit(1);
}

if (!Array.isArray(topics)) {
  console.error("❌ O arquivo deve conter um array de tópicos no nível raiz.");
  process.exit(1);
}

const allErrors: string[] = [];
for (const [i, topic] of topics.entries()) {
  allErrors.push(...validateTopic(topic, i));
}

if (allErrors.length > 0) {
  console.error(`❌ Validação falhou com ${allErrors.length} erro(s):\n`);
  allErrors.forEach((e) => console.error("  •", e));
  process.exit(1);
}

console.log(`✅ ${topics.length} tópico(s) válido(s) em: ${filePath}`);
console.log(`   Pronto para: bun scripts/pipeline/batch-upload-topics.ts`);
