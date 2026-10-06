/**
 * E-mails de acesso (recuperação de senha) — parte pura, em português.
 *
 * Substitui o modelo padrão do Supabase (em inglês e enviado por eles) por um
 * e-mail nosso, do domínio da clínica. Nunca inclui dado clínico: só o link.
 */

import { renderEmail } from "@/lib/email-layout";
import { buildFrom } from "@/lib/mail-sender";

export const RESET_LINK_VALIDITY_MINUTES = 60;

/** Link do nosso site (não do Supabase). O token é de uso único e vale ~1 h. */
export function buildResetLink(baseUrl: string, tokenHash: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  return `${base}/reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;
}

export function buildPasswordResetEmail(input: { link: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const { html, text } = renderEmail({
    preheader: "Crie uma nova senha de acesso.",
    title: "Redefinir sua senha",
    paragraphs: ["Recebemos um pedido para criar uma nova senha de acesso ao **Psiqway**."],
    button: { label: "Criar nova senha", href: input.link },
    notes: [`O link vale por ${RESET_LINK_VALIDITY_MINUTES} minutos e só pode ser usado uma vez.`],
    footnote: "Se você não pediu isso, pode ignorar este e-mail: sua senha continua a mesma.",
  });
  return { subject: "Redefinir sua senha — Psiqway", html, text };
}

/**
 * Remetente dos e-mails de acesso, derivado do remetente já configurado para o
 * alerta de risco (mesmo domínio verificado), trocando só a parte local.
 */
export function deriveAccessSender(riskAlertFrom: string | undefined): string | null {
  return buildFrom(riskAlertFrom, "acesso");
}
