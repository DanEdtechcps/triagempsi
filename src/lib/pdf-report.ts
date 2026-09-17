import { jsPDF } from "jspdf";
import { BRANDING, type Branding } from "@/config/branding";
import {
  getItemOptions,
  resolveScaleForAnswers,
  skippedItemIds,
} from "@/lib/scales-data";
import { computeSubscores } from "@/lib/scoring";
import { SYMPTOM_QUESTION } from "@/config/triage-tree";
import {
  buildDecisionSummary,
  type Decision,
  type IndicatedScale,
} from "@/lib/decision-narrative";


export type PdfScale = {
  scale_code: string;
  scale_name: string;
  score: number | null;
  band: string | null;
  band_level: number | null;
  risk: boolean;
  answers?: Record<string, number>;
};

export type PdfReportData = {
  respondent_name: string;
  respondent_age?: number | null;
  birth_date?: string | null;
  respondent_sex?: string | null;
  respondent_type?: "paciente" | "familiar" | null;
  informant_name?: string | null;
  informant_relation?: string | null;
  respondent_email?: string | null;
  respondent_phone?: string | null;
  main_complaint?: string | null;
  submitted_at?: string | null;
  symptoms?: string[];
  scales: PdfScale[];
  riskPathway?: boolean;
  riskFlags?: string[];
  decisions?: Decision[];
  indicated?: IndicatedScale[];
  ageBand?: string | null;
};


const MARGIN = 48;
const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - MARGIN * 2;

function symptomLabel(id: string) {
  return SYMPTOM_QUESTION.options.find((o) => o.id === id)?.label ?? id;
}

/** Monta a trilha de decisão + resumo em linguagem clara, se houver dados. */
function summarize(data: PdfReportData) {
  if (!data.decisions?.length) return null;
  return buildDecisionSummary({
    decisions: data.decisions,
    results: data.scales.map((s) => ({
      scale_code: s.scale_code,
      score: s.score,
      band: s.band,
      risk: s.risk,
    })),
    symptoms: data.symptoms ?? [],
    indicated: data.indicated ?? [],
    ageBand: data.ageBand,
    age: data.respondent_age,
    riskPathway: data.riskPathway,
  });
}


function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function fmtDay(value?: string | null) {
  if (!value) return "—";
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

class Doc {
  doc: jsPDF;
  y = MARGIN;
  constructor(private branding: Branding, private subtitle: string) {
    this.doc = new jsPDF({ unit: "pt", format: "a4" });
    this.header();
  }

  private header() {
    const d = this.doc;
    d.setFont("helvetica", "bold");
    d.setFontSize(14);
    d.text(this.branding.clinicName, MARGIN, this.y + 4);
    d.setFont("helvetica", "normal");
    d.setFontSize(10);
    d.setTextColor(110);
    d.text(this.subtitle, MARGIN, this.y + 20);
    d.setTextColor(0);
    this.y += 34;
    d.setDrawColor(210);
    d.line(MARGIN, this.y, PAGE_W - MARGIN, this.y);
    this.y += 20;
  }

  ensure(space: number) {
    if (this.y + space > PAGE_H - MARGIN - 24) {
      this.doc.addPage();
      this.y = MARGIN;
    }
  }

  title(text: string) {
    this.ensure(40);
    this.y += 8;
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(12);
    this.doc.text(text, MARGIN, this.y);
    this.y += 16;
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(10);
  }

  paragraph(text: string, opts?: { color?: number; size?: number }) {
    const d = this.doc;
    d.setFontSize(opts?.size ?? 10);
    d.setTextColor(opts?.color ?? 40);
    const lines = d.splitTextToSize(text, CONTENT_W) as string[];
    for (const line of lines) {
      this.ensure(16);
      d.text(line, MARGIN, this.y);
      this.y += 14;
    }
    d.setTextColor(0);
    this.y += 4;
  }

  field(label: string, value: string) {
    const d = this.doc;
    this.ensure(16);
    d.setFontSize(10);
    d.setTextColor(120);
    d.text(`${label}:`, MARGIN, this.y);
    d.setTextColor(20);
    const offset = 110;
    const lines = d.splitTextToSize(value || "—", CONTENT_W - offset) as string[];
    d.text(lines[0], MARGIN + offset, this.y);
    this.y += 14;
    for (const extra of lines.slice(1)) {
      this.ensure(16);
      d.text(extra, MARGIN + offset, this.y);
      this.y += 14;
    }
    d.setTextColor(0);
  }

  scaleRow(s: PdfScale) {
    const d = this.doc;
    this.ensure(30);
    d.setDrawColor(228);
    d.setFillColor(248, 250, 250);
    d.rect(MARGIN, this.y - 11, CONTENT_W, 26, "FD");
    d.setFont("helvetica", "bold");
    d.setFontSize(10);
    const name = `${s.scale_code} — ${s.scale_name}`;
    d.text(
      (d.splitTextToSize(name, CONTENT_W - 190) as string[])[0],
      MARGIN + 8,
      this.y + 5,
    );
    d.setFont("helvetica", "normal");
    d.setTextColor(70);
    const right = `${s.score ?? "—"} pts   ·   ${s.band ?? "—"}`;
    d.text(right, PAGE_W - MARGIN - 8, this.y + 5, { align: "right" });
    d.setTextColor(0);
    this.y += 32;
  }

  /**
   * Quadro por subescala (ex.: substâncias do ASSIST-Lite): uma linha por
   * subescala com escore, faixa e conduta recomendada.
   */
  subscoreBlock(s: PdfScale) {
    const scale = resolveScaleForAnswers(s.scale_code, s.answers);
    if (!scale?.subscales || !s.answers) return;
    const subs = computeSubscores(scale, s.answers) ?? [];
    const d = this.doc;
    d.setFontSize(8.5);
    for (const sub of subs) {
      const line = `${sub.label}: ${sub.score}/${sub.max} — ${sub.band}${sub.recommendation ? ` · ${sub.recommendation}` : ""}`;
      const lines = d.splitTextToSize(line, CONTENT_W - 24) as string[];
      this.ensure(lines.length * 11 + 4);
      d.setTextColor(70);
      lines.forEach((l, i) => d.text(l, MARGIN + 14, this.y + i * 11));
      this.y += lines.length * 11;
    }
    d.setTextColor(0);
    d.setFontSize(10);
    this.y += 6;
  }

  answers(s: PdfScale) {
    const scale = resolveScaleForAnswers(s.scale_code, s.answers);
    if (!scale || !s.answers) return;
    const skipped = skippedItemIds(scale, s.answers);
    const d = this.doc;
    d.setFontSize(9);
    for (const item of scale.items) {
      const v = s.answers[item.id];
      if (v == null) continue;
      const opt = getItemOptions(scale, item.id).find((o) => o.value === v);
      const lines = d.splitTextToSize(
        `${item.id}. ${item.text}`,
        CONTENT_W - 130,
      ) as string[];
      this.ensure(lines.length * 12 + 6);
      d.setTextColor(skipped.has(item.id) ? 150 : 45);
      lines.forEach((l, i) => d.text(l, MARGIN + 10, this.y + i * 12));
      d.setTextColor(100);
      d.text(
        skipped.has(item.id) ? "pulada — não se aplica" : `${opt?.label ?? v} (${v})`,
        PAGE_W - MARGIN,
        this.y,
        { align: "right" },
      );
      this.y += lines.length * 12 + 4;
    }
    d.setTextColor(0);
    d.setFontSize(10);
    this.y += 6;
  }

  riskBox(text: string) {
    const d = this.doc;
    d.setFont("helvetica", "bold");
    d.setFontSize(10);
    const lines = d.splitTextToSize(text, CONTENT_W - 24) as string[];
    const h = lines.length * 13 + 20;
    this.ensure(h + 10);
    d.setDrawColor(200, 60, 60);
    d.setFillColor(253, 240, 240);
    d.rect(MARGIN, this.y - 12, CONTENT_W, h, "FD");
    d.setTextColor(160, 30, 30);
    d.setFont("helvetica", "bold");
    lines.forEach((l, i) => d.text(l, MARGIN + 10, this.y + 4 + i * 13));
    d.setFont("helvetica", "normal");
    d.setTextColor(0);
    this.y += h + 8;
  }

  finish(footer: string) {
    const d = this.doc;
    const total = d.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      d.setPage(p);
      d.setFontSize(8);
      d.setTextColor(130);
      const lines = d.splitTextToSize(footer, CONTENT_W - 60) as string[];
      lines.slice(0, 2).forEach((l, i) =>
        d.text(l, MARGIN, PAGE_H - MARGIN + 8 + i * 10),
      );
      d.text(`${p}/${total}`, PAGE_W - MARGIN, PAGE_H - MARGIN + 8, {
        align: "right",
      });
    }
    d.setTextColor(0);
    return d;
  }
}

function safeName(name: string) {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "paciente"
  );
}

/** Relatório simplificado entregue ao paciente. Sem hipótese diagnóstica. */
export function buildPatientPdf(
  data: PdfReportData,
  branding: Branding = BRANDING,
) {
  const b = new Doc(branding, "Resumo da sua pré-avaliação");

  b.field("Nome", data.respondent_name);
  b.field("Data de envio", fmtDate(data.submitted_at ?? new Date().toISOString()));
  b.y += 6;

  b.paragraph(
    "Este documento resume as áreas avaliadas no questionário que você respondeu. " +
      "Os valores abaixo são pontuações de instrumentos de rastreio: eles NÃO são um diagnóstico " +
      "e só têm significado quando interpretados por um profissional de saúde na sua consulta.",
    { color: 70 },
  );

  if (data.symptoms?.length) {
    b.title("O que você relatou");
    b.paragraph(data.symptoms.map(symptomLabel).join(" · "), { color: 60 });
  }

  b.title("Questionários respondidos");
  if (data.scales.length === 0) {
    b.paragraph("Nenhuma escala foi aplicada nesta pré-avaliação.", { color: 90 });
  }
  for (const s of data.scales) {
    b.scaleRow(s);
    b.subscoreBlock(s);
  }

  const patientTrail = summarize(data);
  if (patientTrail) {
    b.title("Como o questionário foi montado para você");
    for (const p of patientTrail.narrative) b.paragraph(p, { color: 60 });
    if (patientTrail.rows.length) {
      patientTrail.rows.forEach((r, i) => {
        b.paragraph(`Passo ${i + 1}. ${r.plain}`, { color: 70, size: 9 });
      });
    }
  }



  if (data.riskPathway || data.riskFlags?.length) {
    b.y += 6;
    b.riskBox(
      `${branding.emergency.message} ${branding.emergency.cvvLabel}: ${branding.emergency.cvvPhone}. ` +
        `Emergência médica (SAMU): ${branding.emergency.samuPhone}.`,
    );
  }

  b.y += 4;
  b.paragraph(
    "Leve este resumo para a sua consulta. Ele ajuda o profissional a conduzir a avaliação com mais tempo para você.",
    { color: 70 },
  );

  return b.finish(branding.disclaimer);
}

/** Relatório completo para a equipe clínica / contratante. */
export function buildClinicianPdf(
  data: PdfReportData,
  branding: Branding = BRANDING,
) {
  const b = new Doc(branding, "Relatório de pré-triagem — uso clínico");

  if (data.riskPathway || data.riskFlags?.length) {
    b.riskBox(
      "ATENÇÃO: via de risco de suicídio acionada. Sinalizadores: " +
        (data.riskFlags?.join(", ") || "via de sintomas") +
        ". Orientação de emergência foi exibida ao paciente.",
    );
  }

  b.title("Identificação");
  b.field("Nome", data.respondent_name);
  b.field(
    "Idade",
    data.respondent_age != null ? `${data.respondent_age} anos` : "—",
  );
  b.field("Nascimento", fmtDay(data.birth_date));
  b.field("Sexo/gênero", data.respondent_sex || "—");
  b.field(
    "Quem respondeu",
    data.respondent_type === "familiar"
      ? `Familiar/responsável${data.informant_name ? ` — ${data.informant_name}` : ""}${
          data.informant_relation ? ` (${data.informant_relation})` : ""
        }`
      : "O próprio paciente",
  );
  b.field("E-mail", data.respondent_email || "—");
  b.field("Telefone", data.respondent_phone || "—");
  b.field("Enviado em", fmtDate(data.submitted_at));
  b.y += 6;

  if (data.main_complaint) {
    b.title("Queixa relatada");
    b.paragraph(data.main_complaint, { color: 40 });
  }

  if (data.symptoms?.length) {
    b.title("Caminho na árvore de sintomas");
    b.paragraph(data.symptoms.map(symptomLabel).join(" · "), { color: 40 });
  }

  const trail = summarize(data);
  if (trail) {
    b.title("Em resumo (linguagem clara)");
    for (const p of trail.narrative) b.paragraph(p, { color: 40 });

    if (trail.entradas.length) {
      b.title("Escalas abertas pela idade e pelos sintomas");
      trail.entradas.forEach((r, i) => {
        b.paragraph(`${i + 1}. ${r.trigger}${r.criterion ? ` — ${r.criterion}` : ""}`, {
          color: 20,
        });
        b.paragraph(r.plain, { color: 60, size: 9 });
        b.paragraph(`Regra técnica: ${r.rule}`, { color: 120, size: 8 });
      });
    }

    if (trail.escalonamentos.length) {
      b.title("Escalonamentos disparados pelos resultados");
      trail.escalonamentos.forEach((r, i) => {
        b.paragraph(`${i + 1}. ${r.trigger}${r.criterion ? ` — ${r.criterion}` : ""}`, {
          color: 20,
        });
        b.paragraph(r.plain, { color: 60, size: 9 });
        b.paragraph(`Regra técnica: ${r.rule}`, { color: 120, size: 8 });
      });
    }

    if (trail.rows.length) {
      b.title("Trilha completa, passo a passo");
      trail.rows.forEach((r, i) => {
        b.paragraph(
          `Passo ${i + 1} · ${r.kind === "entrada" ? "Entrada" : "Escalonamento"}${
            r.risk ? " · SINAL DE RISCO" : ""
          }`,
          { color: r.risk ? 170 : 110, size: 9 },
        );
        b.paragraph(r.plain, { color: 40 });
      });
    }

    b.title("Encaminhamento final");
    b.paragraph(
      data.riskPathway
        ? "Via de risco ativada — orientação de emergência exibida ao paciente e prioridade de agendamento."
        : "Sem critérios de risco imediato — seguir fluxo padrão de agendamento.",
      { color: data.riskPathway ? 170 : 40 },
    );
    if (data.indicated?.length) {
      b.paragraph("Escalas indicadas, não aplicadas online:", { color: 40 });
      for (const i of data.indicated) {
        b.paragraph(`• ${i.code} — ${i.reason}`, { color: 60, size: 9 });
      }
    }
  }

  b.title("Escores");
  if (data.scales.length === 0) {
    b.paragraph("Nenhuma escala aplicada.", { color: 90 });
  }
  for (const s of data.scales) {
    b.scaleRow(s);
    b.subscoreBlock(s);
  }


  const withAnswers = data.scales.filter((s) => s.answers);
  if (withAnswers.length) {
    b.title("Respostas item a item");
    for (const s of withAnswers) {
      b.ensure(28);
      b.doc.setFont("helvetica", "bold");
      b.doc.text(`${s.scale_code} — ${s.scale_name}`, MARGIN, b.y);
      b.doc.setFont("helvetica", "normal");
      b.y += 14;
      b.answers(s);
    }
  }

  return b.finish(
    `${branding.disclaimer} Documento gerado para anexo ao prontuário.`,
  );
}

export function downloadPatientPdf(data: PdfReportData, branding?: Branding) {
  buildPatientPdf(data, branding).save(
    `pre-avaliacao-${safeName(data.respondent_name)}.pdf`,
  );
}

export function downloadClinicianPdf(data: PdfReportData, branding?: Branding) {
  buildClinicianPdf(data, branding).save(
    `triagem-${safeName(data.respondent_name)}.pdf`,
  );
}
