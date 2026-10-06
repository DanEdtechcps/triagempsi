/**
 * Modelo visual único de todos os e-mails do Psiqway (acesso, avisos de segurança,
 * alerta de risco). Tabelas + CSS inline: é o que Gmail, Outlook e apps de celular
 * renderizam de forma confiável. Largura 560 px, fundo claro explícito (para o modo
 * escuro dos apps não inverter as cores do botão).
 *
 * Texto simples aceita **negrito**. Tudo é escapado; marcadores `{{ .Variavel }}` do
 * Supabase passam intactos (só têm chaves, ponto e letras).
 */

export const BRAND = {
  nome: "Psiqway",
  tagline: "Pré-triagem em saúde mental",
  cor: "#076b6f",
  corRisco: "#cc272e",
  texto: "#26343b",
  suave: "#5b6b73",
  borda: "#dbe5e6",
  fundo: "#eef4f4",
  avisoFundo: "#e3f6f7",
  riscoFundo: "#fdeeee",
} as const;

export type EmailTone = "primary" | "risk";

export type EmailSpec = {
  /** Linha de pré-visualização que o app de e-mail mostra ao lado do assunto. */
  preheader: string;
  title: string;
  /** Parágrafos em texto simples (com **negrito** opcional). */
  paragraphs: string[];
  button?: { label: string; href: string };
  /** Código grande (reautenticação). */
  code?: string;
  /** Caixa de destaque com orientações. */
  notes?: string[];
  /** Linha final, antes do rodapé fixo. */
  footnote?: string;
  tone?: EmailTone;
};

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Escapa e converte **negrito** em <strong>. */
function rich(s: string): string {
  return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function plain(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, "$1");
}

export function renderEmail(spec: EmailSpec): { html: string; text: string } {
  const accent = spec.tone === "risk" ? BRAND.corRisco : BRAND.cor;
  const boxBg = spec.tone === "risk" ? BRAND.riscoFundo : BRAND.avisoFundo;
  const font = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const serif = "Georgia,'Times New Roman',serif";

  const paragraphs = spec.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font:15px/1.65 ${font};color:${BRAND.texto}">${rich(p)}</p>`,
    )
    .join("");

  const code = spec.code
    ? `<p style="margin:6px 0 18px;font:700 30px/1.2 'Courier New',monospace;letter-spacing:6px;color:${accent}">${escapeHtml(spec.code)}</p>`
    : "";

  const button = spec.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px"><tr><td style="border-radius:8px;background:${accent}"><a href="${escapeHtml(spec.button.href)}" target="_blank" style="display:inline-block;padding:13px 26px;font:600 15px/1 ${font};color:#ffffff;text-decoration:none;border-radius:8px">${escapeHtml(spec.button.label)}</a></td></tr></table>
<p style="margin:0 0 18px;font:12px/1.5 ${font};color:${BRAND.suave}">Se o botão não abrir, copie e cole este endereço no navegador:<br><a href="${escapeHtml(spec.button.href)}" style="color:${accent};word-break:break-all">${escapeHtml(spec.button.href)}</a></p>`
    : "";

  const notes = spec.notes?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px"><tr><td style="background:${boxBg};border-radius:8px;padding:14px 16px;font:13px/1.6 ${font};color:${BRAND.texto}">${spec.notes
        .map((n) => `• ${rich(n)}`)
        .join("<br>")}</td></tr></table>`
    : "";

  const footnote = spec.footnote
    ? `<p style="margin:0;font:13px/1.6 ${font};color:${BRAND.suave}">${rich(spec.footnote)}</p>`
    : "";

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><title>${escapeHtml(spec.title)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.fundo}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(spec.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.fundo}"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px">
<tr><td style="padding:0 4px 14px"><span style="font:700 20px/1 ${serif};color:${accent}">${BRAND.nome}</span><br><span style="font:12px/1.8 ${font};color:${BRAND.suave};letter-spacing:.4px">${BRAND.tagline}</span></td></tr>
<tr><td style="background:#ffffff;border:1px solid ${BRAND.borda};border-top:4px solid ${accent};border-radius:12px;padding:30px 30px 26px">
<h1 style="margin:0 0 16px;font:600 23px/1.3 ${serif};color:${BRAND.texto}">${escapeHtml(spec.title)}</h1>
${paragraphs}${code}${button}${notes}${footnote}
</td></tr>
<tr><td style="padding:16px 8px 0;font:12px/1.6 ${font};color:${BRAND.suave};text-align:center">${BRAND.nome} · psiqway.com.br<br>Nunca pedimos sua senha por e-mail ou mensagem. Seus dados de saúde são tratados com sigilo, conforme a LGPD.</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    spec.title,
    "",
    ...spec.paragraphs.map(plain),
    ...(spec.code ? ["", spec.code] : []),
    ...(spec.button ? ["", `${spec.button.label}: ${spec.button.href}`] : []),
    ...(spec.notes?.length ? ["", ...spec.notes.map((n) => `- ${plain(n)}`)] : []),
    ...(spec.footnote ? ["", plain(spec.footnote)] : []),
    "",
    `${BRAND.nome} · psiqway.com.br`,
    "Nunca pedimos sua senha por e-mail ou mensagem.",
  ].join("\n");

  return { html, text };
}
