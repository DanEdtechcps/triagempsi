#!/usr/bin/env bun
/**
 * Carrega o catálogo do Estúdio de validação (review_items) a partir de uma pasta LOCAL.
 *
 *   REVIEW_CATALOG_DIR=/caminho/para/estudio bun scripts/seed-review-catalog.ts            # simula (padrão)
 *   REVIEW_CATALOG_DIR=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     bun scripts/seed-review-catalog.ts --apply                                           # grava
 *
 * Por que a pasta fica fora do git: o catálogo contém trechos literais da obra do Dr. Saraiva
 * (direitos autorais) e o repositório é público. A chave de serviço vem só do ambiente
 * (secret manager); nunca grave-a em arquivo rastreado.
 *
 * Idempotente: upsert por (kind, ref, version). Não desativa nem apaga itens ausentes.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createSupabaseFetch } from "../src/integrations/supabase/api-key-fetch";
import { REVIEW_KINDS } from "../src/lib/review-studio";

const jsonValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValue),
    z.record(z.string(), jsonValue),
  ]),
);

const itemSchema = z.object({
  kind: z.enum(REVIEW_KINDS),
  ref: z.string().min(1).max(120),
  title: z.string().min(1).max(200),
  project: z.string().nullable().optional(),
  section: z.string().nullable().optional(),
  version: z.string().min(1).max(20).default("v2"),
  body: z.record(z.string(), jsonValue).default({}),
  media_url: z.string().url().nullable().optional(),
  sort_order: z.number().int().default(0),
});

export type SeedItem = z.infer<typeof itemSchema>;

export function readCatalog(dir: string): SeedItem[] {
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) throw new Error(`Nenhum .json em ${dir}`);
  const items: SeedItem[] = [];
  for (const f of files) {
    const raw: unknown = JSON.parse(readFileSync(join(dir, f), "utf8"));
    const parsed = z.array(itemSchema).safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `${f}: ${parsed.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".")} ${i.message}`)
          .join("; ")}`,
      );
    }
    items.push(...parsed.data);
  }
  const vistos = new Set<string>();
  for (const i of items) {
    const k = `${i.kind}|${i.ref}|${i.version}`;
    if (vistos.has(k)) throw new Error(`Item duplicado no catálogo: ${k}`);
    vistos.add(k);
  }
  return items;
}

async function main() {
  const dir = process.env.REVIEW_CATALOG_DIR;
  if (!dir) throw new Error("Defina REVIEW_CATALOG_DIR (pasta local com os .json do catálogo).");
  const items = readCatalog(dir);
  const porTipo = items.reduce<Record<string, number>>(
    (acc, i) => ({ ...acc, [i.kind]: (acc[i.kind] ?? 0) + 1 }),
    {},
  );
  console.log(`Catálogo lido: ${items.length} itens`, porTipo);

  if (!process.argv.includes("--apply")) {
    console.log("Simulação: nada foi gravado. Use --apply para gravar.");
    return;
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("--apply exige SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  // Chaves no formato novo (sb_secret_) não são JWT: o projeto as envia com este fetch (ver api-key-fetch.ts).
  const db = createClient(url, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const LOTE = 100;
  for (let i = 0; i < items.length; i += LOTE) {
    const lote = items
      .slice(i, i + LOTE)
      .map((x) => ({ ...x, updated_at: new Date().toISOString() }));
    const { error } = await db
      .from("review_items")
      .upsert(lote, { onConflict: "kind,ref,version" });
    if (error) throw new Error(`Falha no lote ${i / LOTE + 1}: ${error.message}`);
  }
  console.log(`Gravado: ${items.length} itens em review_items.`);
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
