/**
 * Link pessoal do Estúdio de validação — parte pura (sem I/O), testável.
 * O token tem 256 bits aleatórios (43 caracteres base64url): adivinhar é inviável,
 * por isso não há limitador de tentativas. No banco guarda-se só o HASH (SHA-256).
 */

const FORMATO = /^[A-Za-z0-9_-]{43}$/;

/** 32 bytes aleatórios em base64url (43 caracteres, sem preenchimento). */
export function generateReviewToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function isWellFormedReviewToken(token: unknown): token is string {
  return typeof token === "string" && FORMATO.test(token);
}

/** SHA-256 em hexadecimal minúsculo (64 caracteres). */
export async function hashReviewToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Monta o link pessoal. O token vai no FRAGMENTO (#t=), que não chega ao servidor nem a logs. */
export function reviewLink(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/revisao/estudio#t=${token}`;
}

/** Lê o token do fragmento da URL (`#t=...`). Devolve null se não houver ou estiver malformado. */
export function tokenFromHash(hash: string): string | null {
  const m = /(?:^#|&)t=([^&]+)/.exec(hash);
  if (!m) return null;
  return isWellFormedReviewToken(m[1]) ? m[1] : null;
}
