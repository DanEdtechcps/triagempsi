#!/usr/bin/env bun
/**
 * batch-upload-topics.ts
 *
 * Faz upload em lote de tópicos de psicoeducação para o Supabase.
 * Requer SUPABASE_SERVICE_ROLE_KEY (operação administrativa — server-side only).
 *
 * Uso:
 *   bun scripts/pipeline/batch-upload-topics.ts [--file <caminho.json>] [--dry-run]
 *
 * Flags:
 *   --dry-run   Valida e exibe o que seria inserido sem tocar no banco.
 *   --file      Caminho do JSON (padrão: OUTPUT_DIR/psychoeducation_topics.json)
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

// ── Helpers ───────────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// ── Init ─────────────────────────────────────────────────────────────────────

const isDryRun = process.argv.includes("--dry-run");
const fileArg = process.argv.indexOf("--file");
const filePath =
  fileArg !== -1
    ? process.argv[fileArg + 1]
    : join(env.OUTPUT_DIR, "psychoeducation_topics.json");

if (!existsSync(filePath)) {
  console.error(`❌ Arquivo não encontrado: ${filePath}`);
  process.exit(1);
}

const topics = JSON.parse(readFileSync(filePath, "utf-8")) as Array<{
  slug: string;
  title: string;
  short_title?: string;
  description?: string;
  icon?: string;
  sort_order?: number;
  contents: Array<{
    version?: string;
    level: string;
    title: string;
    body_md: string;
    summary_pdf?: string;
    external_links?: string[];
    video_urls?: string[];
  }>;
}>;

if (isDryRun) {
  console.log(`🔍 DRY-RUN — ${topics.length} tópico(s) seriam inseridos/atualizados:`);
  topics.forEach((t, i) =>
    console.log(`  [${i + 1}] ${t.slug} — "${t.title}" (${t.contents.length} conteúdo(s))`),
  );
  process.exit(0);
}

// ── Supabase Admin ────────────────────────────────────────────────────────────

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Upload ────────────────────────────────────────────────────────────────────

console.log(`🚀 Iniciando upload de ${topics.length} tópico(s)...`);
let topicsOk = 0;
let contentsOk = 0;
let errors = 0;

for (const batch of chunk(topics, env.BATCH_SIZE)) {
  // 1. Upsert tópicos (sem contents)
  const topicRows = batch.map((t) => ({
    slug: t.slug,
    title: t.title,
    short_title: t.short_title ?? null,
    description: t.description ?? null,
    icon: t.icon ?? null,
    sort_order: t.sort_order ?? 0,
    is_active: true,
  }));

  const { data: insertedTopics, error: tErr } = await supabase
    .from("psychoeducation_topics")
    .upsert(topicRows, { onConflict: "slug" })
    .select("id, slug");

  if (tErr || !insertedTopics) {
    console.error(`❌ Erro ao inserir tópicos:`, tErr?.message);
    errors++;
    continue;
  }

  topicsOk += insertedTopics.length;

  // 2. Upsert conteúdos ligados ao topic_id
  const slugToId = Object.fromEntries(insertedTopics.map((r) => [r.slug, r.id]));

  const contentRows = batch.flatMap((t) =>
    (t.contents ?? []).map((c) => ({
      topic_id: slugToId[t.slug],
      version: c.version ?? "v1",
      level: c.level,
      title: c.title,
      body_md: c.body_md,
      summary_pdf: c.summary_pdf ?? null,
      external_links: c.external_links ?? [],
      video_urls: c.video_urls ?? [],
      is_published: true,
    })),
  );

  if (contentRows.length > 0) {
    for (const contentBatch of chunk(contentRows, env.BATCH_SIZE)) {
      const { error: cErr } = await supabase
        .from("psychoeducation_contents")
        .upsert(contentBatch, { onConflict: "topic_id,version,level" });

      if (cErr) {
        console.error(`❌ Erro ao inserir conteúdos:`, cErr.message);
        errors++;
      } else {
        contentsOk += contentBatch.length;
      }
    }
  }
}

console.log(`\n📊 Resultado:`);
console.log(`   ✅ Tópicos inseridos/atualizados: ${topicsOk}`);
console.log(`   ✅ Conteúdos inseridos/atualizados: ${contentsOk}`);
if (errors > 0) {
  console.log(`   ❌ Batches com erro: ${errors}`);
  process.exit(1);
}
console.log(`\n🎉 Upload concluído com sucesso.`);
