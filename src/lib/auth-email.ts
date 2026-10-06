/**
 * E-mails de acesso (recuperação de senha) — parte pura, em português.
 *
 * Substitui o modelo padrão do Supabase (em inglês e enviado por eles) por um
 * e-mail nosso, do domínio da clínica. Nunca inclui dado clínico: só o link.
 */

export const RESET_LINK_VALIDITY_MINUTES = 60;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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
  const subject = "Redefinir sua senha — TriagemPsi";
  const text = [
    "Olá,",
    "",
    "Recebemos um pedido para criar uma nova senha de acesso ao TriagemPsi.",
    "Abra o link abaixo para escolher a nova senha:",
    "",
    input.link,
    "",
    `O link vale por ${RESET_LINK_VALIDITY_MINUTES} minutos e só pode ser usado uma vez.`,
    "Se você não pediu isso, pode ignorar este e-mail: sua senha continua a mesma.",
    "",
    "TriagemPsi",
  ].join("\n");
  const html = `<!doctype html><html lang="pt-BR"><body style="font-family:Arial,sans-serif;line-height:1.55;color:#111;max-width:520px">
<h2 style="margin:0 0 12px">Redefinir sua senha</h2>
<p>Recebemos um pedido para criar uma nova senha de acesso ao <strong>TriagemPsi</strong>.</p>
<p><a href="${escapeHtml(input.link)}" style="display:inline-block;background:#0f6b6b;color:#fff;padding:11px 18px;border-radius:6px;text-decoration:none">Criar nova senha</a></p>
<p style="color:#555;font-size:13px">O link vale por ${RESET_LINK_VALIDITY_MINUTES} minutos e só pode ser usado uma vez.<br>Se você não pediu isso, pode ignorar este e-mail: sua senha continua a mesma.</p>
<p style="color:#888;font-size:12px">Se o botão não abrir, copie e cole este endereço no navegador:<br>${escapeHtml(input.link)}</p>
</body></html>`;
  return { subject, html, text };
}

/**
 * Remetente dos e-mails de acesso, derivado do remetente já configurado para o
 * alerta de risco (mesmo domínio verificado), trocando só a parte local.
 * "TriagemPsi <alertas@mail.x.com>" -> "TriagemPsi <acesso@mail.x.com>".
 */
export function deriveAccessSender(riskAlertFrom: string | undefined): string | null {
  const raw = (riskAlertFrom ?? "").trim();
  if (!raw) return null;
  const m = raw.match(/^(.*?)<\s*[^@<>\s]+@([^<>\s]+)\s*>$/);
  if (m) return `${m[1].trim() || "TriagemPsi"} <acesso@${m[2]}>`;
  const bare = raw.match(/^[^@<>\s]+@([^<>\s]+)$/);
  if (bare) return `TriagemPsi <acesso@${bare[1]}>`;
  return null;
}
