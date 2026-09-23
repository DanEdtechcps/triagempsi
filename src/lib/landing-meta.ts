import type { LandingSettings } from "@/lib/landing-settings.functions";

export const LANDING_URL = "https://triagemmedica.lovable.app/";

export type MetaTag = { kind: "title" | "name" | "property" | "link"; key: string; value: string };

/** Acrescenta (ou substitui) o parâmetro de versão na URL da miniatura. */
export function versionedImageUrl(
  url: string | null | undefined,
  version: number | null | undefined,
): string | null {
  if (!url) return null;
  const v = Number(version ?? 1) || 1;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("v", String(v));
    return parsed.toString();
  } catch {
    const base = url
      .split("#")[0]
      .replace(/([?&])v=[^&]*/g, "$1")
      .replace(/[?&]$/, "");
    return `${base}${base.includes("?") ? "&" : "?"}v=${v}`;
  }
}

/** Fonte única das metatags da landing — usada pelo head() e pela tela de validação. */
export function buildLandingMeta(settings: Partial<LandingSettings> | null | undefined) {
  const title = settings?.share_title ?? "Triagem Psiquiátrica";
  const description = settings?.share_description ?? "";
  const image = versionedImageUrl(settings?.share_image_url, settings?.share_image_version);

  const meta = [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: LANDING_URL },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    ...(image
      ? [
          { property: "og:image", content: image },
          { name: "twitter:image", content: image },
        ]
      : []),
  ];

  const links = [{ rel: "canonical", href: LANDING_URL }];

  return { meta, links, title, description, image };
}

export function landingMetaTags(settings: Partial<LandingSettings> | null | undefined): MetaTag[] {
  const { meta, links } = buildLandingMeta(settings);
  const tags: MetaTag[] = [];
  for (const entry of meta as unknown as Array<Partial<Record<string, string>>>) {
    if (entry.title !== undefined) tags.push({ kind: "title", key: "title", value: entry.title });
    else if (entry.property)
      tags.push({ kind: "property", key: entry.property, value: entry.content ?? "" });
    else if (entry.name) tags.push({ kind: "name", key: entry.name, value: entry.content ?? "" });
  }
  for (const l of links) tags.push({ kind: "link", key: `rel="${l.rel}"`, value: l.href });
  return tags;
}

export function landingMetaHtml(settings: Partial<LandingSettings> | null | undefined): string {
  return landingMetaTags(settings)
    .map((t) => {
      const v = escapeHtml(t.value);
      if (t.kind === "title") return `<title>${v}</title>`;
      if (t.kind === "link") return `<link ${t.key} href="${v}" />`;
      return `<meta ${t.kind}="${t.key}" content="${v}" />`;
    })
    .join("\n");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type MetaIssue = { level: "erro" | "atencao"; message: string };

export function validateLandingMeta(
  settings: Partial<LandingSettings> | null | undefined,
): MetaIssue[] {
  const { title, description, image } = buildLandingMeta(settings);
  const issues: MetaIssue[] = [];

  if (!title.trim())
    issues.push({ level: "erro", message: "Título do compartilhamento está vazio." });
  else if (title.length > 60)
    issues.push({
      level: "atencao",
      message: `Título com ${title.length} caracteres — o ideal é até 60.`,
    });

  if (!description.trim())
    issues.push({ level: "erro", message: "Descrição do compartilhamento está vazia." });
  else if (description.length > 160)
    issues.push({
      level: "atencao",
      message: `Descrição com ${description.length} caracteres — o ideal é até 160.`,
    });

  if (!image)
    issues.push({
      level: "atencao",
      message: "Sem imagem de miniatura: o compartilhamento usará a captura automática do site.",
    });
  else if (!/^https?:\/\//i.test(image))
    issues.push({
      level: "erro",
      message: "A imagem precisa de um endereço absoluto (https://…).",
    });

  return issues;
}
