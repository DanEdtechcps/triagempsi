import { ROADMAP, ROADMAP_STATUS_LABEL, ROADMAP_VERSION } from "@/config/manual";
import {
  DELIVERIES,
  PENDING_DELIVERIES,
  formatDeliveryDate,
} from "@/config/deliveries";

function cell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

/** Monta o CSV do roadmap (itens por fase + registro de entregas). */
export function buildRoadmapCsv(): string {
  const header = [
    "Tipo",
    "Fase/Versão",
    "Horizonte/Data",
    "Título",
    "Situação",
    "Detalhe",
    "Valor/Impacto",
  ];

  const rows: string[][] = [];

  for (const phase of ROADMAP) {
    for (const item of phase.items) {
      rows.push([
        "Roadmap",
        phase.title,
        phase.horizon,
        item.title,
        ROADMAP_STATUS_LABEL[item.status],
        item.detail,
        item.value ?? "",
      ]);
    }
  }

  for (const d of DELIVERIES) {
    rows.push([
      "Entrega",
      d.version ? `v${d.version}` : (d.area ?? ""),
      formatDeliveryDate(d.date),
      d.title,
      "Aprovada",
      d.detail,
      d.impact ?? "",
    ]);
  }

  for (const d of PENDING_DELIVERIES) {
    rows.push([
      "Entrega",
      d.version ? `v${d.version}` : (d.area ?? ""),
      formatDeliveryDate(d.date),
      d.title,
      "Aguardando aprovação",
      d.detail,
      d.impact ?? "",
    ]);
  }

  return [header, ...rows]
    .map((r) => r.map(cell).join(";"))
    .join("\r\n");
}

/** Baixa o roadmap completo em CSV (UTF-8 com BOM, compatível com Excel). */
export function downloadRoadmapCsv() {
  const blob = new Blob(["\uFEFF" + buildRoadmapCsv()], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `roadmap-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  void ROADMAP_VERSION;
}
