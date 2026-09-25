/**
 * Lógica pura da fila do painel clínico (filtros, ordenação, seleção e
 * classificação de risco), extraída de `painel.index.tsx` para ser testável
 * sem depender de React/JSX.
 */
import type { AssessmentListItem } from "@/lib/painel.functions";

export type RiscoFiltro = "todos" | "risco" | "atencao" | "sem";
export type StatusFiltro = "todos" | "enviado" | "pendente";
export type InformanteFiltro = "todos" | "paciente" | "familiar";
export type CampoDataFiltro = "submitted" | "created";
export type OrdemFiltro =
  | "submitted_desc"
  | "submitted_asc"
  | "created_desc"
  | "created_asc"
  | "nome_asc"
  | "nome_desc";

export type PainelFilterState = {
  clinicFilter: string;
  busca: string;
  riscoFilter: RiscoFiltro;
  escalaFilter: string;
  statusFilter: StatusFiltro;
  informanteFilter: InformanteFiltro;
  medicoFilter: string;
  campoData: CampoDataFiltro;
  dataDe: string;
  dataAte: string;
};

/** Uma triagem está na "via de risco" — o sinal clínico mais grave da fila. */
export function isRiskFlagged(
  a: Pick<AssessmentListItem, "risk_flags" | "summary">,
): boolean {
  return a.risk_flags.length > 0 || a.summary?.risk_pathway === true;
}

/** Alguma escala aplicada bateu banda de atenção (nível >= 2), sem ser via de risco. */
export function isAttentionFlagged(a: Pick<AssessmentListItem, "scales">): boolean {
  return a.scales.some((s) => (s.band_level ?? 0) >= 2);
}

export function filterAssessments<T extends AssessmentListItem>(
  items: T[],
  filters: PainelFilterState,
): T[] {
  const termo = filters.busca.trim().toLowerCase();

  return items.filter((a) => {
    if (filters.clinicFilter !== "todas" && a.clinic_id !== filters.clinicFilter) return false;

    const risco = isRiskFlagged(a);
    const atencao = isAttentionFlagged(a);
    if (filters.riscoFilter === "risco" && !risco) return false;
    if (filters.riscoFilter === "atencao" && (risco || !atencao)) return false;
    if (filters.riscoFilter === "sem" && (risco || atencao)) return false;

    if (
      filters.escalaFilter !== "todas" &&
      !a.scales.some((s) => s.scale_code === filters.escalaFilter)
    )
      return false;

    if (filters.dataDe || filters.dataAte) {
      const bruto = filters.campoData === "created" ? a.created_at : a.submitted_at;
      const dia = new Date(bruto).toLocaleDateString("sv-SE");
      if (filters.dataDe && dia < filters.dataDe) return false;
      if (filters.dataAte && dia > filters.dataAte) return false;
    }

    if (filters.informanteFilter !== "todos" && a.respondent_type !== filters.informanteFilter)
      return false;

    if (filters.medicoFilter === "nenhum" && a.doctor_id) return false;
    if (
      filters.medicoFilter !== "todos" &&
      filters.medicoFilter !== "nenhum" &&
      a.doctor_id !== filters.medicoFilter
    )
      return false;

    const enviado = a.status === "completed";
    if (filters.statusFilter === "enviado" && !enviado) return false;
    if (filters.statusFilter === "pendente" && enviado) return false;

    if (termo) {
      const alvo = [
        a.respondent_name,
        a.respondent_email ?? "",
        a.clinic_name ?? "",
        a.informant_name ?? "",
        a.informant_relation ?? "",
        a.respondent_type === "familiar" ? "familiar responsavel" : "paciente",
        ...a.scales.map((s) => s.scale_code),
      ]
        .join(" ")
        .toLowerCase();
      if (!alvo.includes(termo)) return false;
    }

    return true;
  });
}

export function sortAssessments<T extends AssessmentListItem>(items: T[], ordem: OrdemFiltro): T[] {
  return [...items].sort((a, b) => {
    switch (ordem) {
      case "submitted_asc":
        return a.submitted_at.localeCompare(b.submitted_at);
      case "created_desc":
        return b.created_at.localeCompare(a.created_at);
      case "created_asc":
        return a.created_at.localeCompare(b.created_at);
      case "nome_asc":
        return a.respondent_name.localeCompare(b.respondent_name, "pt-BR");
      case "nome_desc":
        return b.respondent_name.localeCompare(a.respondent_name, "pt-BR");
      default:
        return b.submitted_at.localeCompare(a.submitted_at);
    }
  });
}

export type PainelQueueCounts = {
  total: number;
  risco: number;
  atencao: number;
  revisados: number;
};

export function computeQueueCounts<T extends AssessmentListItem>(
  base: T[],
  revisadosIds: string[],
): PainelQueueCounts {
  return {
    total: base.length,
    risco: base.filter(isRiskFlagged).length,
    atencao: base.filter((a) => !isRiskFlagged(a) && isAttentionFlagged(a)).length,
    revisados: base.filter((a) => revisadosIds.includes(a.id)).length,
  };
}

export function getEscalasDisponiveis(items: AssessmentListItem[]): string[] {
  return Array.from(new Set(items.flatMap((a) => a.scales.map((s) => s.scale_code)))).sort();
}

export function getMedicosDisponiveis(items: AssessmentListItem[]): [string, string][] {
  return Array.from(
    new Map(
      items
        .filter((a) => a.doctor_id && a.doctor_name)
        .map((a) => [a.doctor_id as string, a.doctor_name as string]),
    ),
  ).sort((x, y) => x[1].localeCompare(y[1], "pt-BR"));
}

export function toggleSelection(selected: string[], id: string): string[] {
  return selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
}

export function toggleAllSelection(selected: string[], idsNaPagina: string[]): string[] {
  const todosSelecionados =
    idsNaPagina.length > 0 && idsNaPagina.every((id) => selected.includes(id));
  return todosSelecionados
    ? selected.filter((id) => !idsNaPagina.includes(id))
    : Array.from(new Set([...selected, ...idsNaPagina]));
}
