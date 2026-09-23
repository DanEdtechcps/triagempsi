export type PainelViewFilters = {
  busca: string;
  risco: "todos" | "risco" | "atencao" | "sem";
  escala: string;
  status: "todos" | "enviado" | "pendente";
  clinica: string;
  /** quem preencheu a triagem */
  informante?: "todos" | "paciente" | "familiar";
  ordem:
    | "submitted_desc"
    | "submitted_asc"
    | "created_desc"
    | "created_asc"
    | "nome_asc"
    | "nome_desc";
  porPagina: number;
  /** campo usado no filtro por período */
  campoData?: "submitted" | "created";
  /** AAAA-MM-DD */
  dataDe?: string;
  dataAte?: string;
};

export type SavedView = {
  id: string;
  name: string;
  filters: PainelViewFilters;
};

const KEY = "painel:saved-views:v1";

export function loadSavedViews(): SavedView[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedView[];
    return Array.isArray(parsed) ? parsed.filter((v) => v?.id && v?.name) : [];
  } catch {
    return [];
  }
}

export function persistSavedViews(views: SavedView[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(views));
  } catch {
    /* armazenamento indisponível */
  }
}

export function describeView(f: PainelViewFilters): string {
  const partes: string[] = [];
  if (f.risco !== "todos")
    partes.push(
      f.risco === "risco" ? "via de risco" : f.risco === "atencao" ? "atenção" : "sem alteração",
    );
  if (f.escala !== "todas") partes.push(f.escala);
  if (f.status !== "todos") partes.push(f.status === "enviado" ? "enviados" : "pendentes");
  if (f.clinica !== "todas") partes.push("clínica específica");
  if (f.informante && f.informante !== "todos")
    partes.push(
      f.informante === "paciente"
        ? "preenchido pelo paciente"
        : "preenchido por familiar/responsável",
    );
  if (f.dataDe || f.dataAte) {
    const campo = f.campoData === "created" ? "criação" : "envio";
    partes.push(
      `${campo} ${f.dataDe ? `de ${f.dataDe}` : ""}${f.dataAte ? ` até ${f.dataAte}` : ""}`.trim(),
    );
  }
  if (f.busca.trim()) partes.push(`busca "${f.busca.trim()}"`);
  return partes.length ? partes.join(" · ") : "sem filtros";
}

/* ---------- Última visão usada (retomar ao voltar ao painel) ---------- */

export type PainelSession = {
  filters: PainelViewFilters;
  /** alternador tabela (fila) / cartões */
  modo: "fila" | "cartoes";
  /** painel de filtros avançados expandido */
  filtrosAbertos: boolean;
};

const LAST_KEY = "painel:last-view:v1";

export function loadPainelSession(): PainelSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LAST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PainelSession;
    return parsed && parsed.filters ? parsed : null;
  } catch {
    return null;
  }
}

export function persistPainelSession(state: PainelSession) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_KEY, JSON.stringify(state));
  } catch {
    /* armazenamento indisponível */
  }
}
