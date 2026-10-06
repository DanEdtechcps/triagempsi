/**
 * Alerta ativo de triagem com risco — parte pura (sem I/O), testável.
 *
 * O e-mail NUNCA carrega dados do paciente (nome, contato, respostas): só diz
 * que existe uma triagem com sinal de risco e leva ao painel autenticado. E-mail
 * não é canal seguro para PHI.
 */

import { renderEmail } from "@/lib/email-layout";

export const MAX_ALERT_RECIPIENTS = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isRiskSubmission(data: {
  risk_pathway?: boolean;
  risk_flags?: string[];
  summary?: { risk_pathway?: boolean; risk_flags?: string[] };
  results?: { risk: boolean }[];
}): boolean {
  const s = data.summary ?? data;
  return Boolean(
    s.risk_pathway || (s.risk_flags?.length ?? 0) > 0 || (data.results ?? []).some((r) => r.risk),
  );
}

/** Normaliza, valida, remove duplicatas e limita a lista de destinatários. */
export function normalizeRecipients(raw: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  for (const r of raw) {
    const e = (r ?? "").trim().toLowerCase();
    if (e && EMAIL_RE.test(e)) seen.add(e);
    if (seen.size >= MAX_ALERT_RECIPIENTS) break;
  }
  return [...seen];
}

export function buildRiskAlertEmail(input: {
  clinicName: string;
  assessmentId: string;
  baseUrl: string;
}): { subject: string; html: string; text: string; link: string } {
  const base = input.baseUrl.replace(/\/+$/, "");
  const link = `${base}/painel/${encodeURIComponent(input.assessmentId)}`;
  const clinic = input.clinicName.trim() || "sua clínica";
  const subject = `[Prioridade] Nova triagem com sinal de risco — ${clinic}`;
  const { html, text } = renderEmail({
    tone: "risk",
    preheader: "Abra o painel para ver e decidir a conduta.",
    title: "Nova triagem com sinal de risco",
    paragraphs: [
      `Uma nova triagem com sinal de risco foi enviada para **${clinic}**.`,
      "Abra o painel para ver os detalhes e decidir a conduta:",
    ],
    button: { label: "Abrir no painel", href: link },
    notes: [
      "Este aviso não contém dados do paciente. Entre no painel com seu login.",
      "Se for emergência: CVV 188 (24h) ou SAMU 192.",
    ],
  });
  return { subject, html, text, link };
}
