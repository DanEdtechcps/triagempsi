#!/usr/bin/env bun
/**
 * Roda os guardrails de conteúdo (src/lib/content-guardrails.ts) sobre uma pasta de
 * arquivos .md. A frente vem do cabeçalho `front:` do arquivo (psiqway | caminhos | corte800 | medfam).
 * O status (`status:`) é metadado do front-matter; a marca RASCUNHO/TESTE não pode aparecer no corpo.
 *
 *   bun scripts/content-guardrails.ts <pasta-ou-arquivo> [...]
 *
 * Sai com código 1 se houver qualquer erro. Avisos não reprovam.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { checkContent, isContentFront, parseFrontMatter } from "../src/lib/content-guardrails";

function walk(p: string): string[] {
  const st = statSync(p);
  if (st.isFile()) return p.endsWith(".md") ? [p] : [];
  return readdirSync(p).flatMap((n) => walk(join(p, n)));
}

const targets = process.argv.slice(2);
if (!targets.length) {
  console.error("Uso: bun scripts/content-guardrails.ts <pasta-ou-arquivo> [...]");
  process.exit(2);
}

let erros = 0;
let avisos = 0;
let arquivos = 0;
for (const f of targets.flatMap(walk)) {
  const raw = readFileSync(f, "utf8");
  const { meta, body } = parseFrontMatter(raw);
  if (!meta.front) continue; // só arquivos de conteúdo (com cabeçalho `front:`)
  arquivos++;
  if (!isContentFront(meta.front)) {
    console.error(`✖ ${f}: front inválido "${meta.front}"`);
    erros++;
    continue;
  }
  const r = checkContent({
    front: meta.front,
    text: body,
    authorizedEndorsement: meta.authorized_endorsement === "true",
    // status é metadado (front-matter), nunca texto: a marca dentro do corpo é erro.
    requireDraftMark: false,
  });
  if (!meta.status) {
    console.log(`✖ ${f} [STATUS] Falta \`status:\` no front-matter.`);
    erros++;
  }
  if (/RASCUNHO\s*\/\s*TESTE|em fase de teste/i.test(body)) {
    console.log(`✖ ${f} [STATUS_NO_TEXTO] "RASCUNHO/TESTE" aparece no corpo; deixe só no front-matter.`);
    erros++;
  }
  for (const v of r.violations) {
    const tag = v.severity === "erro" ? "✖" : "⚠";
    console.log(`${tag} ${f} [${v.rule}] ${v.message}${v.excerpt ? ` — «${v.excerpt}»` : ""}`);
    if (v.severity === "erro") erros++;
    else avisos++;
  }
}
console.log(`\n${arquivos} arquivo(s) verificado(s): ${erros} erro(s), ${avisos} aviso(s).`);
process.exit(erros ? 1 : 0);
