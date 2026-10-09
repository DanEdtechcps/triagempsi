import { useState } from "react";
import { HelpCircle, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AJUDA_POR_TIPO,
  COMO_DECIDIMOS,
  PROJETOS_TEXTO,
  EXPLICACAO_DA_RESPOSTA,
  PASSOS,
  QUEM_VE_O_QUE,
  RESULTADOS,
} from "@/lib/review-textos";
import {
  DECISION_LABEL,
  KIND_LABEL,
  type Participante,
  type ReviewDecision,
  type ReviewItem,
  type ReviewKind,
  type ReviewerRole,
} from "@/lib/review-studio";

/** As quatro respostas que valem para qualquer item (“Prefiro esta” aparece só onde há opções). */
const RESPOSTAS_GERAIS: ReviewDecision[] = ["aprovo", "ajusto", "nao_uso", "sem_opiniao"];

function LegendaDasRespostas() {
  return (
    <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
      {RESPOSTAS_GERAIS.map((d) => (
        <div key={d} className="flex gap-1">
          <dt className="font-medium">{DECISION_LABEL[d]}:</dt>
          <dd className="text-muted-foreground">{EXPLICACAO_DA_RESPOSTA[d]}</dd>
        </div>
      ))}
      <div className="flex gap-1 sm:col-span-2">
        <dt className="font-medium">{DECISION_LABEL.prefiro}:</dt>
        <dd className="text-muted-foreground">{EXPLICACAO_DA_RESPOSTA.prefiro}</dd>
      </div>
    </dl>
  );
}

/** Painel “Como funciona”: aberto na primeira visita (quando ainda não há resposta), recolhido depois. */
export function ComoFunciona({
  papel,
  abertoNoInicio,
  titulo,
}: {
  papel: ReviewerRole;
  abertoNoInicio: boolean;
  titulo: string;
}) {
  const [aberto, setAberto] = useState(abertoNoInicio);
  return (
    <details
      open={aberto}
      onToggle={(e) => setAberto(e.currentTarget.open)}
      className="rounded-lg border bg-card p-4"
    >
      <summary className="flex cursor-pointer items-center gap-2 font-medium">
        <HelpCircle className="h-4 w-4" aria-hidden="true" /> {titulo}
      </summary>
      <div className="mt-3 space-y-4 text-sm">
        <ol className="grid gap-3 sm:grid-cols-3">
          {PASSOS.map((p, i) => (
            <li key={p.titulo} className="rounded border p-3">
              <p className="font-medium">
                {i + 1}. {p.titulo}
              </p>
              <p className="mt-1 text-muted-foreground">{p.texto}</p>
            </li>
          ))}
        </ol>
        <div>
          <p className="mb-1 font-medium">O que cada botão quer dizer</p>
          <LegendaDasRespostas />
        </div>
        <div>
          <p className="mb-1 font-medium">Como chegamos a uma decisão, sem reunião</p>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            {COMO_DECIDIMOS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 font-medium">Quem vê o quê</p>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            {QUEM_VE_O_QUE[papel].map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}

/** Cabeçalho de cada aba: o que há ali e o que fazer. */
export function AjudaDaAba({ kind }: { kind: ReviewKind }) {
  const a = AJUDA_POR_TIPO[kind];
  return (
    <div className="mb-4 space-y-1 rounded-lg border-l-4 border-primary bg-muted/40 p-3 text-sm">
      <p className="font-medium">{KIND_LABEL[kind]}</p>
      <p>{a.oQueE}</p>
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">O que fazer: </span>
        {a.comoResponder}
      </p>
    </div>
  );
}

function dataCurta(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
}

/** Bloco “Resultados” do Resumo, só para o decisor. */
export function BlocoResultados({
  participantes,
  totalItens,
  aguardando,
  divergentes,
  onIrParaDecidir,
}: {
  participantes: Participante[];
  totalItens: number;
  aguardando: number;
  divergentes: ReviewItem[];
  onIrParaDecidir: () => void;
}) {
  return (
    <Card className="space-y-4 p-4">
      <div>
        <p className="flex items-center gap-2 font-medium">
          <Users className="h-4 w-4" aria-hidden="true" /> {RESULTADOS.titulo}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{RESULTADOS.explicacao}</p>
      </div>

      <div>
        <p className="mb-1 text-sm font-medium">{RESULTADOS.participacaoTitulo}</p>
        {participantes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{RESULTADOS.participacaoVazia}</p>
        ) : (
          <ul className="divide-y rounded border text-sm">
            {participantes.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-2">
                <span>
                  <span className="font-medium">{p.name}</span>{" "}
                  <Badge variant="outline">{p.role === "decisor" ? "decisor" : "avaliador"}</Badge>
                </span>
                <span className="text-muted-foreground">
                  {p.respondidos === 0
                    ? RESULTADOS.semResposta
                    : `${p.respondidos} de ${totalItens} respondidos`}
                  {p.last_seen_at ? ` · último acesso ${dataCurta(p.last_seen_at)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p>{RESULTADOS.aguardandoDecisao(aguardando)}</p>
        {aguardando > 0 && (
          <Button type="button" size="sm" onClick={onIrParaDecidir}>
            {RESULTADOS.irParaDecidir}
          </Button>
        )}
      </div>

      <div>
        <p className="mb-1 text-sm font-medium">{RESULTADOS.divergenciaTitulo}</p>
        {divergentes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{RESULTADOS.nenhumaDivergencia}</p>
        ) : (
          <ul className="list-inside list-disc text-sm">
            {divergentes.slice(0, 30).map((i) => (
              <li key={i.id}>
                {KIND_LABEL[i.kind]}: {i.title}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{RESULTADOS.baixarAta}</p>
    </Card>
  );
}

export type LinhaDeProjeto = {
  valor: string;
  rotulo: string;
  total: number;
  respondidos: number;
  /** Frase curta sobre o público do projeto (vem da identidade cadastrada). */
  paraQuem?: string;
};

/** Escolha do projeto: “Todos” ou um dos quatro (e “Geral”, quando houver itens). */
export function SeletorDeProjeto({
  linhas,
  valor,
  onChange,
}: {
  linhas: LinhaDeProjeto[];
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{PROJETOS_TEXTO.titulo}</p>
      <div className="flex flex-wrap gap-2">
        {linhas.map((l) => (
          <Button
            key={l.valor}
            type="button"
            size="sm"
            variant={valor === l.valor ? "default" : "outline"}
            aria-pressed={valor === l.valor}
            onClick={() => onChange(l.valor)}
          >
            {l.rotulo} <span className="ml-1 opacity-70">({l.total})</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

/** Visão “Todos os projetos”: um cartão por projeto, com público e andamento. */
export function CartoesDeProjeto({
  linhas,
  onAbrir,
}: {
  linhas: LinhaDeProjeto[];
  onAbrir: (valor: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="max-w-3xl text-sm text-muted-foreground">{PROJETOS_TEXTO.explicacao}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {linhas.map((l) => {
          const pct = l.total ? Math.round((100 * l.respondidos) / l.total) : 0;
          return (
            <Card key={l.valor} className="flex flex-col gap-2 p-4">
              <p className="font-medium">{l.rotulo}</p>
              <p className="text-sm text-muted-foreground">
                {l.paraQuem ?? PROJETOS_TEXTO.geralDescricao}
              </p>
              <div className="h-2 w-full rounded bg-muted">
                <div className="h-2 rounded bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">
                {PROJETOS_TEXTO.itens(l.total)} ·{" "}
                {PROJETOS_TEXTO.respondidos(l.respondidos, l.total)}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-auto"
                onClick={() => onAbrir(l.valor)}
              >
                {PROJETOS_TEXTO.abrir}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
