import { Button } from "@/components/ui/button";
import { describeView, type SavedView } from "@/lib/saved-views";

const selectCls =
  "min-h-11 rounded-md border border-border bg-card px-3 text-sm text-foreground";

/** Bloco de visualizações salvas — usado no cartão de filtros (desktop) e na gaveta (mobile). */
export function PainelViews({
  views,
  viewAtiva,
  novoNome,
  onNovoNome,
  onSalvar,
  onAplicar,
  onRemover,
}: {
  views: SavedView[];
  viewAtiva: string | null;
  novoNome: string;
  onNovoNome: (v: string) => void;
  onSalvar: () => void;
  onAplicar: (v: SavedView) => void;
  onRemover: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">
        Visualizações salvas
      </div>
      {views.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Configure os filtros abaixo e salve para reutilizar depois.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {views.map((v) => (
            <span
              key={v.id}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                viewAtiva === v.id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              <button
                type="button"
                onClick={() => onAplicar(v)}
                title={describeView(v.filters)}
                className="max-w-[16rem] truncate py-1 hover:text-foreground"
              >
                {v.name}
              </button>
              <button
                type="button"
                onClick={() => onRemover(v.id)}
                aria-label={`Remover visualização ${v.name}`}
                className="px-1 text-muted-foreground hover:text-destructive"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <label htmlFor="nova-view" className="sr-only">
          Nome da visualização
        </label>
        <input
          id="nova-view"
          value={novoNome}
          onChange={(e) => onNovoNome(e.target.value)}
          placeholder="Nome da visualização (ex.: Risco pendente)"
          className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm text-foreground"
        />
        <Button
          variant="outline"
          size="sm"
          disabled={!novoNome.trim()}
          onClick={onSalvar}
        >
          Salvar filtros atuais
        </Button>
      </div>
    </div>
  );
}

export type PainelFiltrosProps = {
  risco: string;
  onRisco: (v: "todos" | "risco" | "atencao" | "sem") => void;
  escala: string;
  onEscala: (v: string) => void;
  escalasDisponiveis: string[];
  status: string;
  onStatus: (v: "todos" | "enviado" | "pendente") => void;
  informante: string;
  onInformante: (v: "todos" | "paciente" | "familiar") => void;
  medico: string;
  onMedico: (v: string) => void;
  medicosDisponiveis: [string, string][];
  multiClinica: boolean;
  clinica: string;
  onClinica: (v: string) => void;
  clinics: { id: string; name: string }[];
  campoData: "submitted" | "created";
  onCampoData: (v: "submitted" | "created") => void;
  dataDe: string;
  onDataDe: (v: string) => void;
  dataAte: string;
  onDataAte: (v: string) => void;
  ordem: string;
  onOrdem: (
    v:
      | "submitted_desc"
      | "submitted_asc"
      | "created_desc"
      | "created_asc"
      | "nome_asc"
      | "nome_desc",
  ) => void;
  porPagina: number;
  onPorPagina: (n: number) => void;
};

/** Grade completa de filtros — renderizada inline no desktop e na gaveta no mobile. */
export function PainelFiltros(p: PainelFiltrosProps) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="risco" className="text-xs text-muted-foreground">
            Nível de risco
          </label>
          <select
            id="risco"
            value={p.risco}
            onChange={(e) => p.onRisco(e.target.value as never)}
            className={selectCls}
          >
            <option value="todos">Todos</option>
            <option value="risco">Via de risco</option>
            <option value="atencao">Atenção (moderado ou grave)</option>
            <option value="sem">Sem alteração relevante</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="escala" className="text-xs text-muted-foreground">
            Escala acionada
          </label>
          <select
            id="escala"
            value={p.escala}
            onChange={(e) => p.onEscala(e.target.value)}
            className={selectCls}
          >
            <option value="todas">Todas</option>
            {p.escalasDisponiveis.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-xs text-muted-foreground">
            Status
          </label>
          <select
            id="status"
            value={p.status}
            onChange={(e) => p.onStatus(e.target.value as never)}
            className={selectCls}
          >
            <option value="todos">Todos</option>
            <option value="enviado">Enviado (concluído)</option>
            <option value="pendente">Pendente (em andamento)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="informante" className="text-xs text-muted-foreground">
            Quem preencheu
          </label>
          <select
            id="informante"
            value={p.informante}
            onChange={(e) => p.onInformante(e.target.value as never)}
            className={selectCls}
          >
            <option value="todos">Todos</option>
            <option value="paciente">O próprio paciente</option>
            <option value="familiar">Familiar / responsável</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="medico" className="text-xs text-muted-foreground">
            Profissional destino
          </label>
          <select
            id="medico"
            value={p.medico}
            onChange={(e) => p.onMedico(e.target.value)}
            className={selectCls}
          >
            <option value="todos">Todos</option>
            <option value="nenhum">Sem direcionamento</option>
            {p.medicosDisponiveis.map(([id, nome]) => (
              <option key={id} value={id}>
                {nome}
              </option>
            ))}
          </select>
        </div>

        {p.multiClinica && (
          <div className="flex flex-col gap-1">
            <label htmlFor="clinica" className="text-xs text-muted-foreground">
              Clínica
            </label>
            <select
              id="clinica"
              value={p.clinica}
              onChange={(e) => p.onClinica(e.target.value)}
              className={selectCls}
            >
              <option value="todas">Todas</option>
              {p.clinics.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="campoData" className="text-xs text-muted-foreground">
            Período por
          </label>
          <select
            id="campoData"
            value={p.campoData}
            onChange={(e) => p.onCampoData(e.target.value as "submitted" | "created")}
            className={selectCls}
          >
            <option value="submitted">Data de envio</option>
            <option value="created">Data de criação</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="dataDe" className="text-xs text-muted-foreground">
            De
          </label>
          <input
            id="dataDe"
            type="date"
            value={p.dataDe}
            max={p.dataAte || undefined}
            onChange={(e) => p.onDataDe(e.target.value)}
            className={selectCls}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="dataAte" className="text-xs text-muted-foreground">
            Até
          </label>
          <input
            id="dataAte"
            type="date"
            value={p.dataAte}
            min={p.dataDe || undefined}
            onChange={(e) => p.onDataAte(e.target.value)}
            className={selectCls}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="ordem" className="text-xs text-muted-foreground">
            Ordenar por
          </label>
          <select
            id="ordem"
            value={p.ordem}
            onChange={(e) => p.onOrdem(e.target.value as never)}
            className={selectCls}
          >
            <option value="submitted_desc">Data de envio (mais recente)</option>
            <option value="submitted_asc">Data de envio (mais antiga)</option>
            <option value="created_desc">Data de criação (mais recente)</option>
            <option value="created_asc">Data de criação (mais antiga)</option>
            <option value="nome_asc">Nome do paciente (A–Z)</option>
            <option value="nome_desc">Nome do paciente (Z–A)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="porPagina" className="text-xs text-muted-foreground">
            Itens por página
          </label>
          <select
            id="porPagina"
            value={p.porPagina}
            onChange={(e) => p.onPorPagina(Number(e.target.value))}
            className={selectCls}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
    </div>
  );
}
