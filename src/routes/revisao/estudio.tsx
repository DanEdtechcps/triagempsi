import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Download, MessageSquare, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MateriaisDoItem, Midia } from "@/components/revisao/materiais";
import { accessDeniedMessage, isAccessDenied } from "@/lib/access-error";
import { asFormato } from "@/lib/review-material";
import { tokenFromHash } from "@/lib/review-token";
import {
  CONSENSUS_LABEL,
  DECISION_KINDS,
  DECISION_KIND_LABEL,
  DECISION_LABEL,
  KIND_LABEL,
  REVIEW_DECISIONS,
  REVIEW_KINDS,
  consensusOf,
  decisionProblem,
  responseProblem,
  summarize,
  type DecisionKind,
  type JsonValue,
  type ReviewDecision,
  type ReviewFinalDecision,
  type ReviewItem,
  type ReviewKind,
  type ReviewResponse,
} from "@/lib/review-studio";
import {
  exportReviewData,
  listReviewCatalog,
  saveReviewDecision,
  saveReviewResponse,
  type ReviewCatalog,
} from "@/lib/review-studio.functions";

/**
 * Estúdio de validação — acesso por LINK PESSOAL (#t=<token>), sem conta no sistema.
 * Não aparece em navegação nem em sitemap. O token é lido do fragmento, guardado neste aparelho
 * e removido da barra de endereço.
 */
export const Route = createFileRoute("/revisao/estudio")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Estúdio de validação — Psiqway" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EstudioPage,
});

const STORAGE_KEY = "psiqway-review-token";

function lerToken(): string | null {
  try {
    const doHash = tokenFromHash(window.location.hash);
    if (doHash) {
      window.localStorage.setItem(STORAGE_KEY, doHash);
      window.history.replaceState(null, "", window.location.pathname);
      return doHash;
    }
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return tokenFromHash(window.location.hash);
  }
}

type Opcao = {
  id: string;
  nome: string;
  descricao?: string;
  media_url?: string;
  /** Objeto original da opção: traz midias, quiz, flashcards e mapa quando existirem. */
  fonte: { [key: string]: JsonValue };
};

function asStrings(v: JsonValue | undefined): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function asText(v: JsonValue | undefined): string {
  return typeof v === "string" ? v : "";
}

function asOpcoes(v: JsonValue | undefined): Opcao[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((o) => {
    if (!o || typeof o !== "object" || Array.isArray(o)) return [];
    const id = asText(o.id);
    if (!id) return [];
    return [
      {
        id,
        nome: asText(o.nome) || id,
        descricao: asText(o.descricao),
        media_url: asText(o.media_url),
        fonte: o,
      },
    ];
  });
}

const STATUS_TONE: Record<string, string> = {
  aprovado: "bg-emerald-100 text-emerald-900",
  escolhido: "bg-emerald-100 text-emerald-900",
  ajustes: "bg-amber-100 text-amber-900",
  rejeitado: "bg-red-100 text-red-900",
  divergencia: "bg-orange-100 text-orange-900",
  sem_respostas: "bg-muted text-muted-foreground",
};

function baixar(nome: string, conteudo: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

function EstudioPage() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  useEffect(() => setToken(lerToken()), []);
  const fetchCatalog = useServerFn(listReviewCatalog);
  const { data, isLoading, error } = useQuery({
    queryKey: ["review-catalog", token],
    queryFn: () => fetchCatalog({ data: { token: token ?? "" } }),
    enabled: Boolean(token),
    staleTime: 30_000,
    retry: false,
  });
  const [soFalta, setSoFalta] = useState(false);

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <header>
        <h1 className="font-serif text-2xl font-semibold">Estúdio de validação · Psiqway</h1>
        {data && (
          <p className="text-sm text-muted-foreground">
            {data.me.name} ·{" "}
            {data.me.role === "decisor" ? "decide a versão final" : "avaliador (aconselha)"}
          </p>
        )}
      </header>

      {token === undefined && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {token === null && (
        <Card className="p-4 text-sm">
          Abra o link pessoal que o senhor recebeu (ele termina com <code>#t=…</code>). Se não
          tiver, peça um novo a quem enviou este.
        </Card>
      )}
      {token && isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {token && error && (
        <Card className="p-4 text-sm">
          {isAccessDenied(error)
            ? accessDeniedMessage(error)
            : "Não foi possível carregar o estúdio agora. Tente novamente em instantes."}
        </Card>
      )}
      {data && data.items.length === 0 && (
        <Card className="p-4 text-sm">O catálogo ainda está vazio.</Card>
      )}
      {data && data.items.length > 0 && token && (
        <>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Veja, compare e opine. Cada resposta é salva na hora, com o seu nome. A opinião dos
            outros avaliadores só aparece depois que o senhor registra a sua, para um não
            influenciar o outro. Tudo aqui é rascunho: nada é publicado sem a decisão final.
          </p>
          <div className="flex items-center gap-2 text-sm">
            <Switch id="so-falta" checked={soFalta} onCheckedChange={setSoFalta} />
            <label htmlFor="so-falta">Mostrar só o que falta eu responder</label>
          </div>
          <Conteudo catalog={data} token={token} soFalta={soFalta} />
        </>
      )}
    </main>
  );
}

function Conteudo({
  catalog,
  token,
  soFalta,
}: {
  catalog: ReviewCatalog;
  token: string;
  soFalta: boolean;
}) {
  const kinds = REVIEW_KINDS.filter((k) => catalog.items.some((i) => i.kind === k));
  const decisor = catalog.me.role === "decisor";
  return (
    <Tabs defaultValue="resumo">
      <TabsList className="flex h-auto flex-wrap">
        <TabsTrigger value="resumo">Resumo</TabsTrigger>
        {kinds.map((k) => (
          <TabsTrigger key={k} value={k}>
            {KIND_LABEL[k]}
          </TabsTrigger>
        ))}
        {decisor && <TabsTrigger value="decidir">Decidir</TabsTrigger>}
      </TabsList>
      <TabsContent value="resumo">
        <Resumo catalog={catalog} />
      </TabsContent>
      {kinds.map((k) => (
        <TabsContent key={k} value={k}>
          <ListaPorTipo catalog={catalog} token={token} kind={k} soFalta={soFalta} />
        </TabsContent>
      ))}
      {decisor && (
        <TabsContent value="decidir">
          <Decidir catalog={catalog} token={token} />
        </TabsContent>
      )}
    </Tabs>
  );
}

function Resumo({ catalog }: { catalog: ReviewCatalog }) {
  const meus = catalog.responses.filter((r) => r.reviewer_id === catalog.me.id).length;
  const base = catalog.all_responses ?? catalog.responses;
  const s = useMemo(() => summarize(catalog.items, base), [catalog.items, base]);
  const pct = catalog.items.length ? Math.round((100 * meus) / catalog.items.length) : 0;
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <p className="text-sm font-medium">
          O senhor respondeu {meus} de {catalog.items.length} itens ({pct}%)
        </p>
        <div className="mt-2 h-2 w-full rounded bg-muted">
          <div className="h-2 rounded bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {catalog.decisions.length} itens já têm decisão final.
        </p>
      </Card>
      {catalog.all_responses && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {s.byKind.map((k) => (
              <Card key={k.kind} className="p-4">
                <p className="font-medium">{KIND_LABEL[k.kind]}</p>
                <p className="text-xs text-muted-foreground">
                  {k.total} itens · {k.semRespostas} sem resposta de ninguém
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(Object.keys(k.porStatus) as (keyof typeof k.porStatus)[])
                    .filter((st) => k.porStatus[st] > 0)
                    .map((st) => (
                      <Badge key={st} className={STATUS_TONE[st]} variant="secondary">
                        {CONSENSUS_LABEL[st]}: {k.porStatus[st]}
                      </Badge>
                    ))}
                </div>
              </Card>
            ))}
          </div>
          {s.divergentes.length > 0 && (
            <Card className="p-4">
              <p className="mb-2 flex items-center gap-2 font-medium">
                <Users className="h-4 w-4" aria-hidden="true" /> Onde os avaliadores divergem
              </p>
              <ul className="list-inside list-disc text-sm">
                {s.divergentes.slice(0, 30).map((i) => (
                  <li key={i.id}>
                    {KIND_LABEL[i.kind]}: {i.title}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function indexar(responses: ReviewResponse[]) {
  const m = new Map<string, ReviewResponse[]>();
  for (const r of responses) m.set(r.item_id, [...(m.get(r.item_id) ?? []), r]);
  return m;
}

function ListaPorTipo({
  catalog,
  token,
  kind,
  soFalta,
}: {
  catalog: ReviewCatalog;
  token: string;
  kind: ReviewKind;
  soFalta: boolean;
}) {
  const responsesByItem = useMemo(() => indexar(catalog.responses), [catalog.responses]);
  const decisionByItem = useMemo(
    () => new Map(catalog.decisions.map((d) => [d.item_id, d])),
    [catalog.decisions],
  );
  const items = catalog.items.filter((i) => i.kind === kind);
  const visiveis = soFalta
    ? items.filter(
        (i) => !(responsesByItem.get(i.id) ?? []).some((r) => r.reviewer_id === catalog.me.id),
      )
    : items;
  const grupos = useMemo(() => {
    const g = new Map<string, ReviewItem[]>();
    for (const i of visiveis) g.set(i.section ?? "", [...(g.get(i.section ?? "") ?? []), i]);
    return [...g.entries()];
  }, [visiveis]);

  if (visiveis.length === 0) {
    return <p className="text-sm text-muted-foreground">Nada pendente aqui. Obrigado!</p>;
  }
  return (
    <div className="space-y-6">
      {grupos.map(([secao, lista]) => (
        <section key={secao || "geral"} className="space-y-3">
          {secao && <h2 className="text-base font-semibold">{secao}</h2>}
          {lista.map((item) => (
            <CartaoItem
              key={item.id}
              item={item}
              token={token}
              me={catalog.me}
              responses={responsesByItem.get(item.id) ?? []}
              decision={decisionByItem.get(item.id)}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

function CartaoItem({
  item,
  token,
  me,
  responses,
  decision: final,
}: {
  item: ReviewItem;
  token: string;
  me: ReviewCatalog["me"];
  responses: ReviewResponse[];
  decision: ReviewFinalDecision | undefined;
}) {
  const queryClient = useQueryClient();
  const save = useServerFn(saveReviewResponse);
  const mine = responses.find((r) => r.reviewer_id === me.id);
  const others = responses.filter((r) => r.reviewer_id !== me.id);
  const consenso = consensusOf(responses);
  const opcoes = asOpcoes(item.body.opcoes);

  const [decision, setDecision] = useState<ReviewDecision | null>(mine?.decision ?? null);
  const [choice, setChoice] = useState<string>(mine?.choice ?? "");
  const [comment, setComment] = useState<string>(mine?.comment ?? "");
  const [aviso, setAviso] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (v: { decision: ReviewDecision; choice: string; comment: string }) =>
      save({
        data: {
          token,
          item_id: item.id,
          decision: v.decision,
          choice: v.choice || null,
          comment: v.comment || null,
        },
      }),
    onSuccess: () => {
      // Recarrega: ao responder, as opiniões dos outros neste item passam a ser visíveis (cego).
      void queryClient.invalidateQueries({ queryKey: ["review-catalog", token] });
      setAviso("Salvo.");
    },
    onError: (e) => setAviso(e instanceof Error ? e.message : "Não foi possível salvar."),
  });

  function enviar(d: ReviewDecision, c = choice, t = comment) {
    const problema = responseProblem(d, c, t);
    if (problema) {
      setAviso(problema);
      return;
    }
    setAviso(null);
    mutation.mutate({ decision: d, choice: c, comment: t });
  }

  const ficha = item.body.ficha as { [k: string]: JsonValue } | undefined;
  const tem = asStrings(ficha?.tem);
  const naoTem = asStrings(ficha?.nao_tem);
  const alertas = asStrings(ficha?.alertas);
  const trecho = asText(item.body.trecho);
  const fala = asText(item.body.fala);
  const classe = asText(item.body.classe);
  const nota = asText(item.body.nota);
  const pergunta = asText(item.body.pergunta);
  const contexto = asText(item.body.contexto);
  const arquivoDrive = asText(item.body.arquivo_drive);

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-medium">{item.title}</h3>
          {item.project && <p className="text-xs text-muted-foreground">{item.project}</p>}
        </div>
        <div className="flex flex-wrap gap-1">
          {final && (
            <Badge variant="default">Decisão final: {DECISION_KIND_LABEL[final.decision]}</Badge>
          )}
          {responses.length > 0 && (
            <Badge className={STATUS_TONE[consenso.status]} variant="secondary">
              {CONSENSUS_LABEL[consenso.status]}
            </Badge>
          )}
        </div>
      </div>

      {final && (
        <p className="rounded bg-muted p-2 text-sm">
          <span className="font-medium">{final.decided_by_name} decidiu:</span> {final.rationale}
        </p>
      )}

      {item.media_url && (
        <Midia url={item.media_url} titulo={item.title} formato={asFormato(item.body.formato)} />
      )}
      <MateriaisDoItem fonte={item.body} />
      {!item.media_url && arquivoDrive && (
        <p className="text-xs text-muted-foreground">
          Vídeo: arquivo <code>{arquivoDrive}</code> na pasta 1_VER do Drive.
        </p>
      )}

      {fala && (
        <p className="text-base">
          <span className="font-medium">Fala:</span> {fala}{" "}
          {classe && <Badge variant="outline">Classe {classe}</Badge>}
        </p>
      )}
      {trecho && (
        <blockquote className="border-l-2 pl-3 text-sm italic text-muted-foreground">
          {trecho}
        </blockquote>
      )}
      {nota && <p className="text-xs text-muted-foreground">{nota}</p>}
      {pergunta && <p className="text-sm font-medium">{pergunta}</p>}
      {contexto && <p className="text-sm text-muted-foreground">{contexto}</p>}

      {(tem.length > 0 || naoTem.length > 0) && (
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          {tem.length > 0 && (
            <div>
              <p className="font-medium">Tem</p>
              <ul className="list-inside list-disc">
                {tem.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}
          {naoTem.length > 0 && (
            <div>
              <p className="font-medium">Não tem</p>
              <ul className="list-inside list-disc">
                {naoTem.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {alertas.length > 0 && (
        <p className="text-xs text-amber-800">
          Alerta da avaliação automática (só de forma, não de conteúdo): {alertas.join("; ")}
        </p>
      )}

      {opcoes.length > 0 && (
        <div className={`grid gap-3 ${opcoes.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {opcoes.map((o) => {
            const escolhida = choice === o.id && decision === "prefiro";
            return (
              <div
                key={o.id}
                className={`flex flex-col gap-2 rounded-lg border p-3 text-sm ${escolhida ? "border-primary bg-primary/5" : ""}`}
              >
                <p className="font-medium">{o.id.length <= 2 ? `${o.id} · ${o.nome}` : o.nome}</p>
                {o.descricao && <p className="text-muted-foreground">{o.descricao}</p>}
                {o.media_url && <Midia url={o.media_url} titulo={o.nome} />}
                <MateriaisDoItem fonte={o.fonte} />
                <Button
                  type="button"
                  size="sm"
                  variant={escolhida ? "default" : "outline"}
                  aria-pressed={escolhida}
                  disabled={mutation.isPending}
                  className="mt-auto"
                  onClick={() => {
                    setChoice(o.id);
                    setDecision("prefiro");
                    enviar("prefiro", o.id);
                  }}
                >
                  {escolhida ? "Sua preferida" : "Prefiro esta"}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {REVIEW_DECISIONS.filter((d) => d !== "prefiro").map((d) => (
          <Button
            key={d}
            type="button"
            size="sm"
            variant={decision === d ? "default" : "outline"}
            aria-pressed={decision === d}
            disabled={mutation.isPending}
            onClick={() => {
              setDecision(d);
              if (d === "aprovo" || d === "nao_uso" || d === "sem_opiniao") enviar(d);
              else setAviso("Escreva o comentário e clique em Salvar.");
            }}
          >
            {DECISION_LABEL[d]}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Comentário (obrigatório se for pedir ajuste)"
          rows={2}
          maxLength={4000}
          aria-label={`Comentário sobre ${item.title}`}
        />
        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="sm"
            disabled={!decision || mutation.isPending}
            onClick={() => decision && enviar(decision)}
          >
            Salvar
          </Button>
          {aviso && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground" role="status">
              {aviso === "Salvo." ? (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {aviso}
            </span>
          )}
        </div>
      </div>

      {others.length > 0 && (
        <ul className="space-y-1 border-t pt-2 text-xs">
          {others.map((r) => (
            <li key={r.reviewer_id}>
              <span className="font-medium">{r.reviewer_name}</span>: {DECISION_LABEL[r.decision]}
              {r.choice ? ` (${r.choice})` : ""}
              {r.comment ? ` — ${r.comment}` : ""}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Aba só do decisor: todos os votos por item, divergência, e a decisão final com justificativa. */
function Decidir({ catalog, token }: { catalog: ReviewCatalog; token: string }) {
  const porItem = useMemo(() => indexar(catalog.all_responses ?? []), [catalog.all_responses]);
  const decisaoPorItem = useMemo(
    () => new Map(catalog.decisions.map((d) => [d.item_id, d])),
    [catalog.decisions],
  );
  const [soPendentes, setSoPendentes] = useState(true);
  const comVotos = catalog.items.filter((i) => (porItem.get(i.id) ?? []).length > 0);
  const lista = soPendentes ? comVotos.filter((i) => !decisaoPorItem.has(i.id)) : comVotos;
  const exportar = useServerFn(exportReviewData);
  const [exportando, setExportando] = useState(false);

  async function baixarTudo() {
    setExportando(true);
    try {
      const r = await exportar({ data: { token } });
      const dia = new Date().toISOString().slice(0, 10);
      baixar(`Ata_de_decisoes_${dia}.md`, r.ata, "text/markdown;charset=utf-8");
      baixar(`Itens_e_decisoes_${dia}.csv`, r.csv, "text/csv;charset=utf-8");
      baixar(`Copia_completa_${dia}.json`, r.json, "application/json");
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2 text-sm">
          <Switch id="so-pend" checked={soPendentes} onCheckedChange={setSoPendentes} />
          <label htmlFor="so-pend">Só o que tem votos e ainda não decidi</label>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={exportando}
          onClick={baixarTudo}
        >
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          Baixar ata, planilha e cópia
        </Button>
      </Card>
      {lista.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum item para decidir agora.</p>
      )}
      {lista.map((item) => (
        <CartaoDecisao
          key={item.id}
          item={item}
          token={token}
          votos={porItem.get(item.id) ?? []}
          atual={decisaoPorItem.get(item.id)}
        />
      ))}
    </div>
  );
}

function CartaoDecisao({
  item,
  token,
  votos,
  atual,
}: {
  item: ReviewItem;
  token: string;
  votos: ReviewResponse[];
  atual: ReviewFinalDecision | undefined;
}) {
  const queryClient = useQueryClient();
  const salvar = useServerFn(saveReviewDecision);
  const consenso = consensusOf(votos);
  const [decisao, setDecisao] = useState<DecisionKind>(atual?.decision ?? "aprovado");
  const [opcao, setOpcao] = useState(atual?.choice ?? "");
  const [justificativa, setJustificativa] = useState(atual?.rationale ?? "");
  const [aviso, setAviso] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      salvar({
        data: {
          token,
          item_id: item.id,
          decision: decisao,
          choice: opcao || null,
          rationale: justificativa,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["review-catalog", token] });
      setAviso("Decisão gravada.");
    },
    onError: (e) => setAviso(e instanceof Error ? e.message : "Não foi possível gravar."),
  });

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-medium">{item.title}</h3>
          <p className="text-xs text-muted-foreground">{KIND_LABEL[item.kind]}</p>
        </div>
        <Badge className={STATUS_TONE[consenso.status]} variant="secondary">
          {CONSENSUS_LABEL[consenso.status]}
        </Badge>
      </div>
      <ul className="space-y-1 text-sm">
        {votos.map((r) => (
          <li key={r.reviewer_id}>
            <span className="font-medium">{r.reviewer_name}</span>: {DECISION_LABEL[r.decision]}
            {r.choice ? ` (${r.choice})` : ""}
            {r.comment ? ` — ${r.comment}` : ""}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        {DECISION_KINDS.map((d) => (
          <Button
            key={d}
            type="button"
            size="sm"
            variant={decisao === d ? "default" : "outline"}
            aria-pressed={decisao === d}
            onClick={() => setDecisao(d)}
          >
            {DECISION_KIND_LABEL[d]}
          </Button>
        ))}
        {decisao === "escolhido" && (
          <input
            value={opcao}
            onChange={(e) => setOpcao(e.target.value)}
            placeholder="Qual opção? (A, B, C…)"
            maxLength={40}
            aria-label="Opção escolhida"
            className="h-8 rounded-md border px-2 text-sm"
          />
        )}
      </div>
      <Textarea
        value={justificativa}
        onChange={(e) => setJustificativa(e.target.value)}
        placeholder="Justificativa da decisão (obrigatória)"
        rows={2}
        maxLength={4000}
        aria-label={`Justificativa para ${item.title}`}
      />
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          disabled={mutation.isPending}
          onClick={() => {
            const p = decisionProblem(decisao, opcao, justificativa);
            if (p) setAviso(p);
            else {
              setAviso(null);
              mutation.mutate();
            }
          }}
        >
          {atual ? "Substituir decisão" : "Gravar decisão"}
        </Button>
        {aviso && (
          <span className="text-xs text-muted-foreground" role="status">
            {aviso}
          </span>
        )}
      </div>
    </Card>
  );
}
