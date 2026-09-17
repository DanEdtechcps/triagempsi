#!/usr/bin/env node
/**
 * Registra uma entrega no roadmap sem edição manual.
 *
 *   bun run roadmap:add --title "Título" --detail "O que mudou" [--area Painel] [--version 1.4.0] [--impact "..."] [--link "Rótulo|/rota"] [--image "/print.png|Legenda"] [--date 2026-08-08] [--approved]
 *
 * Também aceita a forma curta:
 *   bun run roadmap:add "Título" "O que mudou" "Painel"
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const FILE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/config/deliveries.json",
);

function splitPair(value) {
  const idx = String(value).indexOf("|");
  return idx === -1
    ? [String(value).trim(), ""]
    : [String(value).slice(0, idx).trim(), String(value).slice(idx + 1).trim()];
}

function toList(values, map) {
  if (!values) return [];
  return values.map(map).filter(Boolean);
}

const argv = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith("--")) {
    const [k, ...rest] = a.slice(2).split("=");
    const value = rest.length ? rest.join("=") : argv[++i];
    if (k === "link" || k === "image") {
      flags[k] = [...(flags[k] ?? []), value];
    } else {
      flags[k] = value;
    }
  } else {
    positional.push(a);
  }
}

const title = flags.title ?? positional[0];
const detail = flags.detail ?? positional[1];
const area = flags.area ?? positional[2] ?? "Geral";
const version = flags.version ?? null;
const impact = flags.impact ?? null;
// --link "Rótulo|/rota" (repetível) e --image "/print.png|Legenda" (repetível)
const links = toList(flags.link, (v) => {
  const [label, url] = splitPair(v);
  return url ? { label, url } : null;
});
const images = toList(flags.image, (v) => {
  const [url, caption] = splitPair(v);
  return url ? (caption ? { url, caption } : { url }) : null;
});
const date = flags.date ?? new Date().toISOString().slice(0, 10);

if (!title || !detail) {
  console.error(
    'Uso: node scripts/roadmap-add.mjs --title "Título" --detail "Descrição" [--area Painel] [--version 1.4.0] [--impact "..."] [--link "Rótulo|/rota"] [--image "/print.png|Legenda"] [--date AAAA-MM-DD]',
  );
  process.exit(1);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error(`Data inválida: ${date} (use AAAA-MM-DD)`);
  process.exit(1);
}

const list = JSON.parse(readFileSync(FILE, "utf8"));
const duplicate = list.some((d) => d.title === title && d.date === date);
if (duplicate) {
  console.log(`Entrega já registrada em ${date}: ${title}`);
  process.exit(0);
}

const approved = flags.approved === true || flags.approved === "true";
const entry = { date, title, detail, area };
if (!approved) entry.status = "pendente";
if (version) entry.version = version;
if (impact) entry.impact = impact;
if (links.length) entry.links = links;
if (images.length) entry.images = images;
list.unshift(entry);
list.sort((a, b) => b.date.localeCompare(a.date));
writeFileSync(FILE, `${JSON.stringify(list, null, 2)}\n`, "utf8");
console.log(
  approved
    ? `Entrega registrada e aprovada (${date}): ${title}`
    : `Entrega registrada como PENDENTE de aprovação (${date}): ${title}\n  Aprovar: node scripts/roadmap-review.mjs --approve "${title}"`,
);
