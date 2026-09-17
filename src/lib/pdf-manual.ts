import { jsPDF } from "jspdf";
import { BRANDING, type Branding } from "@/config/branding";
import {
  MANUAL_SECTIONS,
  MANUAL_VERSION,
  ROADMAP,
  ROADMAP_STATUS_LABEL,
  ROADMAP_VERSION,
  type ManualBlock,
} from "@/config/manual";
import { DELIVERIES, formatDeliveryDate } from "@/config/deliveries";

const MARGIN = 48;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - MARGIN * 2;

/** Escritor sequencial simples em A4, com quebra automática de página. */
class Sheet {
  doc: jsPDF;
  y = MARGIN;

  constructor(
    private branding: Branding,
    private subtitle: string,
    private version: string,
  ) {
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
    d.text(this.version, MARGIN, this.y + 34);
    d.setTextColor(0);
    this.y += 48;
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

  heading(text: string) {
    this.ensure(46);
    this.y += 10;
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(12);
    const lines = this.doc.splitTextToSize(text, CONTENT_W) as string[];
    for (const line of lines) {
      this.ensure(18);
      this.doc.text(line, MARGIN, this.y);
      this.y += 15;
    }
    this.y += 3;
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(10);
  }

  paragraph(text: string, opts?: { color?: number; italic?: boolean }) {
    const d = this.doc;
    d.setFont("helvetica", opts?.italic ? "italic" : "normal");
    d.setFontSize(10);
    d.setTextColor(opts?.color ?? 40);
    const lines = d.splitTextToSize(text, CONTENT_W) as string[];
    for (const line of lines) {
      this.ensure(16);
      d.text(line, MARGIN, this.y);
      this.y += 14;
    }
    d.setTextColor(0);
    d.setFont("helvetica", "normal");
    this.y += 6;
  }

  bullets(items: string[], ordered = false) {
    const d = this.doc;
    d.setFontSize(10);
    d.setTextColor(40);
    items.forEach((item, i) => {
      const marker = ordered ? `${i + 1}.` : "•";
      const lines = d.splitTextToSize(item, CONTENT_W - 18) as string[];
      lines.forEach((line, idx) => {
        this.ensure(16);
        if (idx === 0) d.text(marker, MARGIN, this.y);
        d.text(line, MARGIN + 18, this.y);
        this.y += 14;
      });
      this.y += 2;
    });
    d.setTextColor(0);
    this.y += 4;
  }

  table(head: string[], rows: string[][]) {
    const d = this.doc;
    const cols = head.length;
    const widths = head.map(() => CONTENT_W / cols);
    const drawRow = (cells: string[], bold: boolean) => {
      d.setFont("helvetica", bold ? "bold" : "normal");
      d.setFontSize(9);
      const wrapped = cells.map(
        (c, i) => d.splitTextToSize(c, widths[i]! - 10) as string[],
      );
      const height = Math.max(...wrapped.map((w) => w.length)) * 12 + 8;
      this.ensure(height + 4);
      if (bold) {
        d.setFillColor(240, 240, 240);
        d.rect(MARGIN, this.y - 10, CONTENT_W, height, "F");
      }
      wrapped.forEach((lines, i) => {
        const x = MARGIN + widths.slice(0, i).reduce((a, b) => a + b, 0) + 5;
        lines.forEach((line, li) => d.text(line, x, this.y + li * 12));
      });
      this.y += height;
      d.setDrawColor(225);
      d.line(MARGIN, this.y - 8, PAGE_W - MARGIN, this.y - 8);
    };
    drawRow(head, true);
    rows.forEach((r) => drawRow(r, false));
    d.setFont("helvetica", "normal");
    d.setFontSize(10);
    this.y += 8;
  }

  alert(text: string) {
    const d = this.doc;
    d.setFontSize(10);
    const lines = d.splitTextToSize(text, CONTENT_W - 24) as string[];
    const height = lines.length * 14 + 16;
    this.ensure(height + 6);
    d.setFillColor(253, 243, 240);
    d.setDrawColor(220, 160, 150);
    d.rect(MARGIN, this.y - 10, CONTENT_W, height, "FD");
    d.setTextColor(150, 40, 30);
    lines.forEach((line, i) => d.text(line, MARGIN + 12, this.y + 6 + i * 14));
    d.setTextColor(0);
    this.y += height + 6;
  }

  save(filename: string) {
    const total = this.doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      this.doc.setPage(p);
      this.doc.setFontSize(8);
      this.doc.setTextColor(140);
      this.doc.text(
        `${this.branding.clinicName} · ${this.subtitle} · página ${p} de ${total}`,
        MARGIN,
        PAGE_H - 24,
      );
    }
    this.doc.save(filename);
  }
}

function renderBlock(sheet: Sheet, block: ManualBlock) {
  if (block.kind === "p") sheet.paragraph(block.text);
  else if (block.kind === "list") sheet.bullets(block.items);
  else if (block.kind === "steps") sheet.bullets(block.items, true);
  else if (block.kind === "table") sheet.table(block.head, block.rows);
  else sheet.alert(block.text);
}

/** Manual de uso do painel para a equipe clínica. */
export function downloadManualPdf(branding: Branding = BRANDING) {
  const sheet = new Sheet(
    branding,
    "Manual do profissional — pré-triagem em saúde mental",
    MANUAL_VERSION,
  );
  sheet.paragraph(
    "Guia de uso do painel clínico: fluxo de trabalho, leitura de escores, sinalizações de risco e recursos disponíveis.",
    { color: 100 },
  );
  sheet.heading("Sumário");
  sheet.bullets(MANUAL_SECTIONS.map((s) => `${s.title} — ${s.summary}`));
  for (const section of MANUAL_SECTIONS) {
    sheet.heading(section.title);
    for (const block of section.blocks) renderBlock(sheet, block);
  }
  sheet.paragraph(
    "Documento de apoio. Não substitui avaliação clínica nem protocolos internos da instituição.",
    { color: 120, italic: true },
  );
  sheet.save("manual-do-profissional.pdf");
}

/** Roadmap do projeto para equipe e contratante. */
export function downloadRoadmapPdf(branding: Branding = BRANDING) {
  const sheet = new Sheet(
    branding,
    "Roadmap do projeto de pré-triagem",
    ROADMAP_VERSION,
  );
  sheet.paragraph(
    "Panorama do que já está entregue, do que está em andamento e das oportunidades priorizadas por impacto clínico e operacional.",
    { color: 100 },
  );
  if (DELIVERIES.length) {
    sheet.heading("Registro de entregas");
    sheet.table(
      ["Data", "Entrega", "Descrição"],
      DELIVERIES.map((d) => [
        formatDeliveryDate(d.date),
        d.area ? `${d.title} (${d.area})` : d.title,
        d.detail,
      ]),
    );
  }
  for (const phase of ROADMAP) {
    sheet.heading(`${phase.title} (${phase.horizon})`);
    sheet.table(
      ["Item", "Status", "Descrição"],
      phase.items.map((i) => [
        i.title,
        ROADMAP_STATUS_LABEL[i.status],
        i.value ? `${i.detail} Impacto: ${i.value}` : i.detail,
      ]),
    );
  }
  sheet.save("roadmap-pre-triagem.pdf");
}
