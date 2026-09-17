#!/usr/bin/env node
/**
 * Revisão/aprovação de entregas do roadmap.
 *
 *   node scripts/roadmap-review.mjs --list
 *   node scripts/roadmap-review.mjs --approve "Título" [--by "Dr. Fulano"]
 *   node scripts/roadmap-review.mjs --approve-all [--by "..."]
 *   node scripts/roadmap-review.mjs --reject "Título" --note "Ajustar a descrição"
 *   node scripts/roadmap-review.mjs --edit "Título" [--new-title "..."] [--detail "..."] [--impact "..."] [--area "..."] [--version "1.5.0"]
 *
 * Entregas pendentes não aparecem no roadmap público nem no changelog.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const FILE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/config/deliveries.json",
);

const argv = process.argv.slice(2);
const flags = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith("--")) continue;
  const [k, ...rest] = a.slice(2).split("=");
  const next = argv[i + 1];
  if (rest.length) flags[k] = rest.join("=");
  else if (!next || next.startsWith("--")) flags[k] = true;
  else flags[k] = argv[++i];
}

const list = JSON.parse(readFileSync(FILE, "utf8"));
const isPending = (d) => d.status === "pendente";
const save = () => {
  list.sort((a, b) => b.date.localeCompare(a.date));
  writeFileSync(FILE, `${JSON.stringify(list, null, 2)}\n`, "utf8");
};

function findEntry(title) {
  const needle = String(title).trim().toLowerCase();
  const found = list.filter((d) => d.title.trim().toLowerCase() === needle);
  if (found.length) return found[0];
  const partial = list.filter((d) => d.title.toLowerCase().includes(needle));
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) {
    console.error(`Título ambíguo: ${title}`);
    process.exit(1);
  }
  console.error(`Entrega não encontrada: ${title}`);
  process.exit(1);
}

if (flags.list) {
  const pending = list.filter(isPending);
  if (!pending.length) {
    console.log("Nenhuma entrega aguardando aprovação.");
  } else {
    console.log(`${pending.length} entrega(s) aguardando aprovação:\n`);
    for (const d of pending) {
      console.log(`- [${d.date}] ${d.title}${d.version ? ` (v${d.version})` : ""}`);
      console.log(`  ${d.detail}`);
      if (d.impact) console.log(`  Impacto: ${d.impact}`);
      if (d.review_note) console.log(`  Ajuste pedido: ${d.review_note}`);
      console.log("");
    }
  }
  process.exit(0);
}

const by = typeof flags.by === "string" ? flags.by : null;
const now = new Date().toISOString();

if (flags["approve-all"]) {
  const pending = list.filter(isPending);
  for (const d of pending) {
    d.status = "aprovada";
    d.approved_at = now;
    if (by) d.approved_by = by;
    delete d.review_note;
  }
  save();
  console.log(`${pending.length} entrega(s) aprovada(s).`);
  process.exit(0);
}

if (typeof flags.approve === "string") {
  const entry = findEntry(flags.approve);
  entry.status = "aprovada";
  entry.approved_at = now;
  if (by) entry.approved_by = by;
  delete entry.review_note;
  save();
  console.log(`Entrega aprovada: ${entry.title}`);
  process.exit(0);
}

if (typeof flags.reject === "string") {
  const entry = findEntry(flags.reject);
  entry.status = "pendente";
  delete entry.approved_at;
  delete entry.approved_by;
  if (typeof flags.note === "string") entry.review_note = flags.note;
  save();
  console.log(`Entrega devolvida para ajuste: ${entry.title}`);
  process.exit(0);
}

if (typeof flags.edit === "string") {
  const entry = findEntry(flags.edit);
  if (typeof flags["new-title"] === "string") entry.title = flags["new-title"];
  for (const key of ["detail", "impact", "area", "version"]) {
    if (typeof flags[key] === "string") entry[key] = flags[key];
  }
  save();
  console.log(`Entrega atualizada: ${entry.title}`);
  process.exit(0);
}

console.error(
  'Uso: node scripts/roadmap-review.mjs --list | --approve "Título" | --approve-all | --reject "Título" --note "..." | --edit "Título" --detail "..."',
);
process.exit(1);
