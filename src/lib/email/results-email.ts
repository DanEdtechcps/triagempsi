/**
 * Template do e-mail com os resultados básicos da triagem.
 *
 * Renderiza HTML inline (sem dependências) para ser enviado assim que o
 * domínio de envio estiver ativo. Mostra:
 *  - quem preencheu (paciente ou familiar/responsável)
 *  - escalas aplicadas com escore e faixa
 *  - quadro por substância quando a escala tem subescalas (ASSIST-Lite)
 *  - resumo do ajuste por informante, quando aplicável
 *  - sinalizações de risco e orientações de emergência
 */

import { resolveScaleForAnswers } from "@/lib/scales-data";
import { computeSubscores, type SubscoreResult } from "@/lib/scoring";

export type EmailScaleResult = {
  scale_code: string;
  scale_name: string;
  score: number | null;
  score_adjusted?: number | null;
  band: string | null;
  risk?: boolean;
  informant_note?: string | null;
  answers?: Record<string, number> | null;
};

export type ResultsEmailInput = {
  clinicName: string;
  respondentName: string;
  submittedAt: string | Date;
  respondentType: "paciente" | "familiar";
  informantName?: string | null;
  informantRelation?: string | null;
  mainComplaint?: string | null;
  results: EmailScaleResult[];
  /** resumo em linguagem clara da trilha de decisão */
  summaryText?: string | null;
  /** destinatário: profissional recebe mais detalhe; paciente recebe versão simples */
  audience: "profissional" | "paciente";
};

const COLORS = {
  text: "#12312e",
  muted: "#5b7472",
  border: "#dbe7e5",
  brand: "#0f6b62",
  riskBg: "#fdecec",
  riskText: "#9b1c1c",
  soft: "#f4f9f8",
};

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

export function informantLine(input: ResultsEmailInput): string {
  if (input.respondentType !== "familiar") {
    return "Preenchido pelo próprio paciente.";
  }
  const who = input.informantName?.trim();
  const rel = input.informantRelation?.trim();
  const detail = [who, rel].filter(Boolean).join(" · ");
  return detail
    ? `Preenchido por familiar/responsável: ${detail}.`
    : "Preenchido por familiar/responsável.";
}

/** Resumo do ajuste aplicado quando o informante não é o próprio paciente. */
export function informantAdjustmentSummary(input: ResultsEmailInput) {
  if (input.respondentType !== "familiar") return null;
  const adjusted = input.results.filter(
    (r) =>
      r.informant_note ||
      (r.score_adjusted != null && r.score != null && r.score_adjusted !== r.score),
  );
  if (adjusted.length === 0) return null;
  return {
    intro:
      "Como a triagem foi respondida por familiar/responsável, escalas de autorrelato receberam uma margem de sensibilidade de 1 ponto no ponto de corte — sintomas internalizantes tendem a ser subnotificados por terceiros. Confirmar os achados com o paciente.",
    items: adjusted.map((r) => ({
      name: r.scale_name,
      raw: r.score,
      considered: r.score_adjusted ?? r.score,
      note: r.informant_note ?? null,
    })),
  };
}

/** Subescores de uma escala (ex.: ASSIST-Lite), quando houver respostas. */
function subscoresOf(r: EmailScaleResult): SubscoreResult[] {
  const scale = resolveScaleForAnswers(r.scale_code, r.answers ?? null);
  if (!scale?.subscales || !r.answers) return [];
  return computeSubscores(scale, r.answers) ?? [];
}

function subscoreLine(s: SubscoreResult, isPro: boolean): string {
  return `${s.label}: ${s.score}/${s.max} — ${s.band}${isPro && s.recommendation ? ` · ${s.recommendation}` : ""}`;
}

function scaleRows(results: EmailScaleResult[], showAdjusted: boolean, isPro: boolean) {
  return results
    .map((r) => {
      const value = showAdjusted ? (r.score_adjusted ?? r.score) : r.score;
      const changed =
        showAdjusted && r.score_adjusted != null && r.score != null && r.score_adjusted !== r.score;
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};font-size:14px;color:${COLORS.text}">
          ${esc(r.scale_name)} <span style="color:${COLORS.muted}">(${esc(r.scale_code)})</span>
          ${r.risk ? `<span style="display:inline-block;margin-left:6px;padding:2px 8px;border-radius:999px;background:${COLORS.riskBg};color:${COLORS.riskText};font-size:11px;font-weight:700">risco</span>` : ""}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};font-size:14px;color:${COLORS.text};text-align:right;white-space:nowrap">
          ${value ?? "—"}${changed ? `<span style="color:${COLORS.muted};font-size:12px"> (bruto ${esc(r.score)})</span>` : ""}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};font-size:14px;color:${COLORS.muted};text-align:right">
          ${esc(r.band ?? "—")}
        </td>
      </tr>${
        subscoresOf(r).length
          ? `<tr><td colspan="3" style="padding:6px 12px 10px 24px;border-bottom:1px solid ${COLORS.border};font-size:12px;line-height:1.6;color:${COLORS.muted}">${subscoresOf(r)
              .map((s) => esc(subscoreLine(s, isPro)))
              .join("<br>")}</td></tr>`
          : ""
      }`;
    })
    .join("");
}

export function buildResultsEmail(input: ResultsEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const isPro = input.audience === "profissional";
  const adjustment = informantAdjustmentSummary(input);
  const hasRisk = input.results.some((r) => r.risk);

  const subject = isPro
    ? `Triagem concluída — ${input.respondentName}${hasRisk ? " (sinalização de risco)" : ""}`
    : `${input.clinicName} — resumo da sua triagem`;

  const adjustmentBlock = adjustment
    ? `<div style="margin:20px 0;padding:14px 16px;border-radius:12px;background:${COLORS.soft};border:1px solid ${COLORS.border}">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:${COLORS.text}">Ajuste por informante</p>
        <p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:${COLORS.muted}">${esc(adjustment.intro)}</p>
        <ul style="margin:0;padding-left:18px;font-size:13px;color:${COLORS.text}">
          ${adjustment.items
            .map(
              (i) =>
                `<li style="margin-bottom:4px">${esc(i.name)}: escore bruto ${esc(i.raw ?? "—")}, considerado ${esc(i.considered ?? "—")} para rastreio.</li>`,
            )
            .join("")}
        </ul>
      </div>`
    : "";

  const resultsBlock = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:8px">
      <thead>
        <tr>
          <th align="left" style="padding:8px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:${COLORS.muted};border-bottom:1px solid ${COLORS.border}">Escala</th>
          <th align="right" style="padding:8px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:${COLORS.muted};border-bottom:1px solid ${COLORS.border}">Escore</th>
          <th align="right" style="padding:8px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:${COLORS.muted};border-bottom:1px solid ${COLORS.border}">Faixa</th>
        </tr>
      </thead>
      <tbody>${scaleRows(input.results, true, isPro)}</tbody>
    </table>`;

  const riskBlock = hasRisk
    ? `<div style="margin:20px 0;padding:14px 16px;border-radius:12px;background:${COLORS.riskBg};border:1px solid #f3c9c9">
        <p style="margin:0;font-size:13px;line-height:1.5;color:${COLORS.riskText}">
          <strong>Sinalização de risco identificada.</strong> ${
            isPro
              ? "Recomenda-se contato prioritário com o paciente."
              : "Em caso de risco imediato, ligue 188 (CVV, 24h) ou procure a emergência mais próxima."
          }
        </p>
      </div>`
    : "";

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${COLORS.text}">
  <div style="display:none;max-height:0;overflow:hidden">Resultados básicos da triagem de ${esc(input.respondentName)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff">
    <tr><td align="center" style="padding:24px 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;text-align:left">
        <tr><td style="padding:0 8px 8px">
          <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${COLORS.brand};font-weight:700">${esc(input.clinicName)}</p>
          <h1 style="margin:6px 0 0;font-size:22px;line-height:1.3;color:${COLORS.text}">${isPro ? "Resultados básicos da triagem" : "Recebemos sua triagem"}</h1>
        </td></tr>
        <tr><td style="padding:12px 8px 0">
          <p style="margin:0 0 6px;font-size:14px;color:${COLORS.muted}">Paciente: <strong style="color:${COLORS.text}">${esc(input.respondentName)}</strong></p>
          <p style="margin:0 0 6px;font-size:14px;color:${COLORS.muted}">Concluída em: ${esc(fmtDate(input.submittedAt))}</p>
          <p style="margin:0;font-size:14px;color:${COLORS.muted}">${esc(informantLine(input))}</p>
          ${input.mainComplaint ? `<p style="margin:6px 0 0;font-size:14px;color:${COLORS.muted}">Queixa principal: ${esc(input.mainComplaint)}</p>` : ""}
        </td></tr>
        <tr><td style="padding:16px 8px 0">
          <p style="margin:0;font-size:13px;font-weight:700;color:${COLORS.text}">Resultados básicos</p>
          ${resultsBlock}
          <p style="margin:10px 0 0;font-size:12px;color:${COLORS.muted}">Instrumento de rastreio — não constitui diagnóstico.</p>
        </td></tr>
        <tr><td style="padding:0 8px">${adjustmentBlock}${riskBlock}</td></tr>
        ${
          input.summaryText
            ? `<tr><td style="padding:0 8px 8px"><p style="margin:0;font-size:13px;font-weight:700;color:${COLORS.text}">Resumo</p><p style="margin:6px 0 0;font-size:13px;line-height:1.6;color:${COLORS.muted}">${esc(input.summaryText)}</p></td></tr>`
            : ""
        }
        <tr><td style="padding:20px 8px 0;border-top:1px solid ${COLORS.border}">
          <p style="margin:0;font-size:12px;line-height:1.5;color:${COLORS.muted}">Este e-mail foi enviado automaticamente por ${esc(input.clinicName)} após a conclusão da triagem.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    `${input.clinicName} — ${isPro ? "resultados básicos da triagem" : "resumo da sua triagem"}`,
    `Paciente: ${input.respondentName}`,
    `Concluída em: ${fmtDate(input.submittedAt)}`,
    informantLine(input),
    input.mainComplaint ? `Queixa principal: ${input.mainComplaint}` : "",
    "",
    "Resultados básicos:",
    ...input.results.flatMap((r) => [
      `- ${r.scale_name} (${r.scale_code}): ${r.score_adjusted ?? r.score ?? "—"}${
        r.score_adjusted != null && r.score != null && r.score_adjusted !== r.score
          ? ` (bruto ${r.score})`
          : ""
      } — ${r.band ?? "—"}${r.risk ? " [risco]" : ""}`,
      ...subscoresOf(r).map((s) => `    · ${subscoreLine(s, isPro)}`),
    ]),
    adjustment ? `\nAjuste por informante: ${adjustment.intro}` : "",
    hasRisk
      ? "\nSinalização de risco identificada. Em caso de risco imediato, ligue 188 (CVV, 24h)."
      : "",
    input.summaryText ? `\nResumo: ${input.summaryText}` : "",
    "\nInstrumento de rastreio — não constitui diagnóstico.",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
