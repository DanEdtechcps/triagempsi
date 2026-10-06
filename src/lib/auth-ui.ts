/** Utilitários puros da interface de acesso (recuperação de senha). */

/** Espera antes de permitir reenviar o e-mail de recuperação. */
export const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Esconde a parte local do e-mail na confirmação ("c***@gmail.com"): confirma
 * para a pessoa onde olhar, sem estampar o endereço inteiro na tela.
 */
export function maskEmail(email: string): string {
  const e = (email ?? "").trim();
  const at = e.lastIndexOf("@");
  if (at < 1 || at === e.length - 1) return e;
  return `${e[0]}***${e.slice(at)}`;
}

/** Rótulo do botão de reenvio durante a espera. */
export function resendLabel(secondsLeft: number): string {
  return secondsLeft > 0 ? `Reenviar em ${secondsLeft} s` : "Reenviar e-mail";
}
