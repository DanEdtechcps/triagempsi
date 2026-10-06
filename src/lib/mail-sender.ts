/**
 * Remetentes dos e-mails enviados pelo app (parte pura).
 *
 * Todos saem do mesmo domínio verificado no Resend (o de RISK_ALERT_FROM), variando só a
 * parte local (alertas@, acesso@, resultados@) e o nome exibido. O nome padrão é o da
 * plataforma (Psiqway); e-mails de uma clínica passam o nome dela (white-label).
 */

export const PLATFORM_NAME = "Psiqway";

function cleanName(name: string): string {
  // Sem caracteres que quebrem o cabeçalho From (< > " e controles).
  // eslint-disable-next-line no-control-regex
  return name
    .replace(/[<>"\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export function parseSender(
  raw: string | undefined,
): { name: string | null; domain: string } | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  const withName = v.match(/^(.*?)<\s*[^@<>\s]+@([^<>\s]+)\s*>$/);
  if (withName) return { name: cleanName(withName[1]) || null, domain: withName[2].toLowerCase() };
  const bare = v.match(/^[^@<>\s]+@([^<>\s]+)$/);
  if (bare) return { name: null, domain: bare[1].toLowerCase() };
  return null;
}

export function senderDomainOf(raw: string | undefined): string | null {
  return parseSender(raw)?.domain ?? null;
}

/**
 * Monta o cabeçalho From: `Nome <local@dominio>`. `displayName` vence o nome da base.
 * Sem base válida devolve null (o chamador trata como "e-mail não configurado").
 */
export function buildFrom(
  base: string | undefined,
  local: string,
  displayName?: string | null,
): string | null {
  const p = parseSender(base);
  if (!p) return null;
  const name = cleanName(displayName ?? "") || p.name || PLATFORM_NAME;
  return `${name} <${local}@${p.domain}>`;
}
