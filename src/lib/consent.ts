/**
 * Prova de consentimento (LGPD) — helpers puros.
 *
 * O servidor, e não o cliente, é a fonte de verdade: o texto vem da clínica no
 * banco, o IP vem do cabeçalho do Cloudflare e o horário de recebimento é do
 * servidor. O `consent_at` declarado pelo cliente só é aceito se plausível.
 */

const MAX_AGE_MS = 24 * 60 * 60 * 1000; // consentiu há no máximo 24h (tempo do questionário)
const MAX_FUTURE_MS = 5 * 60 * 1000; // tolerância de relógio

/** Aceita o horário declarado pelo cliente só se for plausível; senão usa `now`. */
export function resolveConsentAt(clientIso: string | null | undefined, now: Date = new Date()): string {
  if (clientIso) {
    const t = Date.parse(clientIso);
    if (Number.isFinite(t)) {
      const delta = now.getTime() - t;
      if (delta <= MAX_AGE_MS && delta >= -MAX_FUTURE_MS) return new Date(t).toISOString();
    }
  }
  return now.toISOString();
}

/** SHA-256 hex do texto (Workers e Node 20 têm crypto.subtle). */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Primeiro IP de uma cadeia `x-forwarded-for` ("a, b, c") ou o valor puro.
 * Devolve null se vazio ou claramente inválido (evita gravar lixo/injeção).
 */
export function pickClientIp(raw: string | null | undefined): string | null {
  const first = (raw ?? "").split(",")[0]?.trim() ?? "";
  if (!first || first.length > 45) return null;
  return /^[0-9a-fA-F:.]+$/.test(first) ? first : null;
}

/** Rótulo sem nome de pessoa, seguro para auditoria. */
export function fillerLabel(respondentType: string | null | undefined): string {
  return respondentType === "familiar" ? "familiar/responsável" : "o próprio paciente";
}
