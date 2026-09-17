/**
 * Erros de escopo de acesso (clínica/papel) marcados para que a interface
 * mostre uma mensagem clara em vez de "Erro ao carregar".
 */
export const ACCESS_DENIED_PREFIX = "ACESSO_NEGADO:";

export function accessDeniedError(message: string): Error {
  return new Error(`${ACCESS_DENIED_PREFIX} ${message}`);
}

export function isAccessDenied(error: unknown): boolean {
  const msg =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return msg.includes(ACCESS_DENIED_PREFIX);
}

/** Texto amigável, sem o marcador técnico. */
export function accessDeniedMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  const i = msg.indexOf(ACCESS_DENIED_PREFIX);
  const clean = i >= 0 ? msg.slice(i + ACCESS_DENIED_PREFIX.length).trim() : msg.trim();
  return clean || "Este conteúdo pertence a um consultório fora do seu acesso.";
}
