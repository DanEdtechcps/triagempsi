/**
 * Estúdio de validação — lógica pura (sem I/O), testável.
 * O médico curador e os sócios veem, comparam, escolhem e opinam; cada avaliador
 * tem UMA resposta atual por item. Aqui ficam os tipos e o cálculo de consenso.
 */

export const REVIEW_KINDS = [
  "video",
  "frase",
  "escala",
  "marca",
  "pendencia",
  "estilo",
  "infografico",
  "quiz",
  "flashcards",
  "slides",
  "mapa",
  "audio",
] as const;
export type ReviewKind = (typeof REVIEW_KINDS)[number];

export const KIND_LABEL: Record<ReviewKind, string> = {
  video: "Vídeos",
  frase: "Frases",
  escala: "Escalas",
  marca: "Marca",
  pendencia: "Pendências",
  estilo: "Estilo de vídeo",
  infografico: "Infográficos",
  quiz: "Quiz",
  flashcards: "Flashcards",
  slides: "Slides",
  mapa: "Mapas mentais",
  audio: "Áudios",
};

export const REVIEW_DECISIONS = ["aprovo", "ajusto", "nao_uso", "prefiro", "sem_opiniao"] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export const DECISION_LABEL: Record<ReviewDecision, string> = {
  aprovo: "Aprovo",
  ajusto: "Ajusto",
  nao_uso: "Não uso",
  prefiro: "Prefiro esta",
  sem_opiniao: "Sem opinião",
};

/** JSON serializável (o TanStack Start só trafega tipos serializáveis). */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type ReviewItem = {
  id: string;
  kind: ReviewKind;
  ref: string;
  title: string;
  project: string | null;
  section: string | null;
  version: string;
  body: { [key: string]: JsonValue };
  media_url: string | null;
  sort_order: number;
};

export type ReviewResponse = {
  item_id: string;
  reviewer_id: string;
  reviewer_name: string;
  decision: ReviewDecision;
  choice: string | null;
  comment: string | null;
  revision: number;
  updated_at: string;
};

export type ConsensusStatus =
  | "sem_respostas"
  | "aprovado"
  | "rejeitado"
  | "ajustes"
  | "escolhido"
  | "divergencia";

export type ItemConsensus = {
  status: ConsensusStatus;
  reviewers: number;
  counts: Record<ReviewDecision, number>;
  /** Quando status = "escolhido": a opção escolhida por todos que escolheram. */
  choice: string | null;
};

export const CONSENSUS_LABEL: Record<ConsensusStatus, string> = {
  sem_respostas: "Sem respostas",
  aprovado: "Aprovado",
  rejeitado: "Não usar",
  ajustes: "Aprovado com ajustes",
  escolhido: "Opção escolhida",
  divergencia: "Avaliadores divergem",
};

function emptyCounts(): Record<ReviewDecision, number> {
  return { aprovo: 0, ajusto: 0, nao_uso: 0, prefiro: 0, sem_opiniao: 0 };
}

/**
 * Consenso de UM item. "sem_opiniao" não conta como voto.
 * - todos aprovam → aprovado; todos recusam → rejeitado;
 * - alguém pede ajuste e ninguém recusa → ajustes;
 * - aprovação e recusa juntas → divergência;
 * - "prefiro" com a mesma opção em todos → escolhido; com opções diferentes → divergência.
 */
export function consensusOf(responses: ReviewResponse[]): ItemConsensus {
  const counts = emptyCounts();
  for (const r of responses) counts[r.decision] += 1;
  const votes = responses.filter((r) => r.decision !== "sem_opiniao");
  const base = { reviewers: votes.length, counts };
  if (votes.length === 0) return { ...base, status: "sem_respostas", choice: null };

  const prefer = votes.filter((r) => r.decision === "prefiro");
  if (prefer.length > 0) {
    const choices = new Set(prefer.map((r) => (r.choice ?? "").trim()).filter(Boolean));
    const others = votes.length - prefer.length;
    if (others === 0 && choices.size === 1) {
      return { ...base, status: "escolhido", choice: [...choices][0] };
    }
    return { ...base, status: "divergencia", choice: null };
  }

  if (counts.aprovo > 0 && counts.nao_uso > 0)
    return { ...base, status: "divergencia", choice: null };
  if (counts.nao_uso > 0) return { ...base, status: "rejeitado", choice: null };
  if (counts.ajusto > 0) return { ...base, status: "ajustes", choice: null };
  return { ...base, status: "aprovado", choice: null };
}

export type KindSummary = {
  kind: ReviewKind;
  total: number;
  semRespostas: number;
  porStatus: Record<ConsensusStatus, number>;
};

export type ReviewSummary = {
  byKind: KindSummary[];
  divergentes: ReviewItem[];
  pendentes: ReviewItem[];
  totalItens: number;
  totalRespondidos: number;
};

/** Resumo geral: quanto já foi decidido, o que diverge e o que falta. */
export function summarize(items: ReviewItem[], responses: ReviewResponse[]): ReviewSummary {
  const byItem = new Map<string, ReviewResponse[]>();
  for (const r of responses) {
    const arr = byItem.get(r.item_id);
    if (arr) arr.push(r);
    else byItem.set(r.item_id, [r]);
  }
  const kinds = new Map<ReviewKind, KindSummary>();
  const divergentes: ReviewItem[] = [];
  const pendentes: ReviewItem[] = [];
  let respondidos = 0;
  for (const item of items) {
    const c = consensusOf(byItem.get(item.id) ?? []);
    let ks = kinds.get(item.kind);
    if (!ks) {
      ks = {
        kind: item.kind,
        total: 0,
        semRespostas: 0,
        porStatus: {
          sem_respostas: 0,
          aprovado: 0,
          rejeitado: 0,
          ajustes: 0,
          escolhido: 0,
          divergencia: 0,
        },
      };
      kinds.set(item.kind, ks);
    }
    ks.total += 1;
    ks.porStatus[c.status] += 1;
    if (c.status === "sem_respostas") {
      ks.semRespostas += 1;
      pendentes.push(item);
    } else {
      respondidos += 1;
    }
    if (c.status === "divergencia") divergentes.push(item);
  }
  const byKind = REVIEW_KINDS.map((k) => kinds.get(k)).filter((x): x is KindSummary => Boolean(x));
  return {
    byKind,
    divergentes,
    pendentes,
    totalItens: items.length,
    totalRespondidos: respondidos,
  };
}

export const DECISION_KINDS = ["aprovado", "ajustar", "descartado", "escolhido"] as const;
export type DecisionKind = (typeof DECISION_KINDS)[number];

export const DECISION_KIND_LABEL: Record<DecisionKind, string> = {
  aprovado: "Aprovado",
  ajustar: "Ajustar",
  descartado: "Descartado",
  escolhido: "Opção escolhida",
};

export type ReviewerRole = "decisor" | "avaliador";

/** Decisão FINAL de um item, gravada pelo decisor com a foto dos votos daquele momento. */
export type ReviewFinalDecision = {
  item_id: string;
  decision: DecisionKind;
  choice: string | null;
  rationale: string;
  decided_by_name: string;
  decided_at: string;
  votes_snapshot: {
    reviewer: string;
    decision: string;
    choice: string | null;
    comment: string | null;
  }[];
};

/**
 * Cego até responder: a opinião dos outros só aparece nos itens em que o avaliador
 * JÁ gravou a própria resposta (evita que um influencie o outro). As respostas do
 * próprio avaliador sempre aparecem. Esta função é a regra; o servidor a aplica antes
 * de enviar qualquer coisa ao navegador.
 */
export function visibleResponses(all: ReviewResponse[], meId: string): ReviewResponse[] {
  const answered = new Set(all.filter((r) => r.reviewer_id === meId).map((r) => r.item_id));
  return all.filter((r) => r.reviewer_id === meId || answered.has(r.item_id));
}

/** Regra de publicação: só item com decisão FINAL do decisor, aprovado ou com opção escolhida. */
export function publishableByDecision(decision: ReviewFinalDecision | null | undefined): boolean {
  return decision?.decision === "aprovado" || decision?.decision === "escolhido";
}

/** Regra para aceitar uma decisão final: justificativa mínima; "escolhido" exige a opção. */
export function decisionProblem(
  decision: DecisionKind,
  choice: string | null | undefined,
  rationale: string | null | undefined,
): string | null {
  if ((rationale ?? "").trim().length < 3) {
    return "Escreva a justificativa da decisão (mínimo de 3 caracteres).";
  }
  if (decision === "escolhido" && (choice ?? "").trim().length === 0) {
    return "Diga qual opção foi escolhida.";
  }
  return null;
}

/**
 * Regras para aceitar uma resposta: "ajusto" precisa de comentário (senão ninguém sabe o que ajustar)
 * e "prefiro" precisa dizer QUAL opção. Retorna a mensagem do problema ou null.
 */
export function responseProblem(
  decision: ReviewDecision,
  choice: string | null | undefined,
  comment: string | null | undefined,
): string | null {
  if (decision === "ajusto" && (comment ?? "").trim().length < 3) {
    return "Para pedir ajuste, escreva o que mudar no campo de comentário.";
  }
  if (decision === "prefiro" && (choice ?? "").trim().length === 0) {
    return "Diga qual opção o senhor prefere.";
  }
  return null;
}

function csvCell(v: string | number | null | undefined): string {
  const t = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export type ReviewExport = { csv: string; ata: string };

/**
 * Exportação para guardar fora do banco (Drive) e para eu aplicar as decisões:
 * CSV (uma linha por item) e ata em Markdown (decisões, o que falta decidir, divergências).
 * `responses` aqui é o conjunto COMPLETO (só o decisor exporta).
 */
export function buildExport(
  items: ReviewItem[],
  responses: ReviewResponse[],
  decisions: ReviewFinalDecision[],
  geradoEm: string,
): ReviewExport {
  const respByItem = new Map<string, ReviewResponse[]>();
  for (const r of responses) respByItem.set(r.item_id, [...(respByItem.get(r.item_id) ?? []), r]);
  const decByItem = new Map(decisions.map((d) => [d.item_id, d]));

  const linhas = [
    [
      "tipo",
      "ref",
      "titulo",
      "secao",
      "consenso",
      "aprovo",
      "ajusto",
      "nao_uso",
      "prefiro",
      "decisao_final",
      "opcao",
      "justificativa",
      "decidido_por",
      "decidido_em",
    ].join(","),
  ];
  for (const it of items) {
    const rs = respByItem.get(it.id) ?? [];
    const c = consensusOf(rs);
    const d = decByItem.get(it.id);
    linhas.push(
      [
        it.kind,
        it.ref,
        it.title,
        it.section,
        CONSENSUS_LABEL[c.status],
        c.counts.aprovo,
        c.counts.ajusto,
        c.counts.nao_uso,
        c.counts.prefiro,
        d ? DECISION_KIND_LABEL[d.decision] : "",
        d?.choice ?? "",
        d?.rationale ?? "",
        d?.decided_by_name ?? "",
        d?.decided_at ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }

  const decididos = items.filter((i) => decByItem.has(i.id));
  const semDecisao = items.filter(
    (i) =>
      !decByItem.has(i.id) && consensusOf(respByItem.get(i.id) ?? []).status !== "sem_respostas",
  );
  const semResposta = items.filter(
    (i) => (respByItem.get(i.id) ?? []).length === 0 && !decByItem.has(i.id),
  );
  const ata: string[] = [
    "# Ata de decisões do Estúdio de validação",
    "",
    `Gerada em ${geradoEm}. Rascunho: nada foi publicado. Decide o médico curador; os demais avaliadores aconselham.`,
    "",
    `**Itens:** ${items.length} · **decididos:** ${decididos.length} · **com votos e sem decisão:** ${semDecisao.length} · **sem nenhuma resposta:** ${semResposta.length}`,
    "",
    "## Decisões finais",
  ];
  if (decididos.length === 0) ata.push("", "Nenhuma decisão registrada ainda.");
  for (const kind of REVIEW_KINDS) {
    const doTipo = decididos.filter((i) => i.kind === kind);
    if (doTipo.length === 0) continue;
    ata.push("", `### ${KIND_LABEL[kind]}`);
    for (const it of doTipo) {
      const d = decByItem.get(it.id)!;
      const escolha = d.choice ? ` (opção ${d.choice})` : "";
      ata.push(
        `- **${it.title}**: ${DECISION_KIND_LABEL[d.decision]}${escolha}. ${d.rationale} _(${d.decided_by_name}, ${d.decided_at.slice(0, 10)})_`,
      );
      const comentarios = (respByItem.get(it.id) ?? []).filter((r) => r.comment);
      for (const r of comentarios)
        ata.push(`  - ${r.reviewer_name} (${DECISION_LABEL[r.decision]}): ${r.comment}`);
    }
  }
  ata.push("", "## Com votos e ainda sem decisão do decisor");
  if (semDecisao.length === 0) ata.push("", "Nenhum.");
  for (const it of semDecisao) {
    const c = consensusOf(respByItem.get(it.id) ?? []);
    ata.push(`- ${KIND_LABEL[it.kind]}: **${it.title}**: ${CONSENSUS_LABEL[c.status]}`);
  }
  ata.push("", "## Sem nenhuma resposta");
  if (semResposta.length === 0) ata.push("", "Nenhum.");
  else
    ata.push(
      "",
      `${semResposta.length} itens. Primeiros: ${semResposta
        .slice(0, 15)
        .map((i) => i.title)
        .join("; ")}.`,
    );
  return { csv: linhas.join("\n"), ata: ata.join("\n") };
}
