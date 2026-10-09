import { describe, expect, it } from "vitest";
import {
  DECISION_LABEL,
  KIND_LABEL,
  MIN_VOTOS_PARA_LOTE,
  PROJETOS_DO_ESTUDIO,
  PROJETO_GERAL,
  REVIEW_DECISIONS,
  REVIEW_KINDS,
  consensoParaLote,
  participacao,
  projetoDoItem,
  type ReviewDecision,
  type ReviewResponse,
} from "./review-studio";
import {
  AJUDA_POR_TIPO,
  EXPLICACAO_DA_RESPOSTA,
  PASSOS,
  QUEM_VE_O_QUE,
  RESULTADOS,
} from "./review-textos";

function resp(
  reviewer: string,
  decision: ReviewDecision,
  choice: string | null = null,
): ReviewResponse {
  return {
    item_id: "i1",
    reviewer_id: reviewer,
    reviewer_name: reviewer,
    decision,
    choice,
    comment: decision === "ajusto" ? "mude" : null,
    revision: 1,
    updated_at: "2026-10-09T00:00:00Z",
  };
}

describe("projetos", () => {
  it("reconhece os quatro projetos e manda o resto para Geral", () => {
    for (const p of PROJETOS_DO_ESTUDIO) expect(projetoDoItem(p)).toBe(p);
    expect(projetoDoItem(null)).toBe(PROJETO_GERAL);
    expect(projetoDoItem(undefined)).toBe(PROJETO_GERAL);
    expect(projetoDoItem("Motor de escalas")).toBe(PROJETO_GERAL);
    expect(projetoDoItem("Psiqway, Caminhos, Corte 800 e Médico de Família")).toBe(PROJETO_GERAL);
    expect(projetoDoItem("  Psiqway ")).toBe("Psiqway");
  });
});

describe("aprovação em lote (consenso total)", () => {
  it("aceita quando todos aprovaram e há votos suficientes", () => {
    expect(consensoParaLote([resp("a", "aprovo"), resp("b", "aprovo")])).toEqual({
      decision: "aprovado",
      choice: null,
      votos: 2,
    });
  });

  it("aceita quando todos preferiram a mesma opção", () => {
    expect(consensoParaLote([resp("a", "prefiro", "A"), resp("b", "prefiro", "A")])).toEqual({
      decision: "escolhido",
      choice: "A",
      votos: 2,
    });
  });

  it("não aceita com um voto só (exige pelo menos o mínimo de pessoas)", () => {
    expect(MIN_VOTOS_PARA_LOTE).toBeGreaterThanOrEqual(2);
    expect(consensoParaLote([resp("a", "aprovo")])).toBeNull();
    // “sem opinião” não conta como voto
    expect(consensoParaLote([resp("a", "aprovo"), resp("b", "sem_opiniao")])).toBeNull();
  });

  it("deixa de fora ajuste, rejeição, divergência e opções diferentes", () => {
    expect(consensoParaLote([resp("a", "aprovo"), resp("b", "ajusto")])).toBeNull();
    expect(consensoParaLote([resp("a", "nao_uso"), resp("b", "nao_uso")])).toBeNull();
    expect(consensoParaLote([resp("a", "aprovo"), resp("b", "nao_uso")])).toBeNull();
    expect(consensoParaLote([resp("a", "prefiro", "A"), resp("b", "prefiro", "B")])).toBeNull();
    expect(consensoParaLote([])).toBeNull();
  });
});

describe("quem já participou", () => {
  const pessoas = [
    { id: "a", name: "Ana", role: "avaliador" as const, last_seen_at: null },
    { id: "b", name: "Bruno", role: "decisor" as const, last_seen_at: "2026-10-09T10:00:00Z" },
    { id: "c", name: "Carla", role: "avaliador" as const, last_seen_at: null },
  ];

  it("conta respostas por pessoa, inclui quem não respondeu e ordena por atividade e nome", () => {
    const r = [resp("b", "aprovo"), resp("b", "ajusto"), resp("c", "aprovo")];
    const out = participacao(pessoas, r).map((p) => [p.name, p.respondidos]);
    expect(out).toEqual([
      ["Bruno", 2],
      ["Carla", 1],
      ["Ana", 0],
    ]);
  });

  it("devolve lista vazia sem avaliadores", () => {
    expect(participacao([], [resp("x", "aprovo")])).toEqual([]);
  });
});

describe("textos explicativos", () => {
  const vazio = (t: string) => t.trim().length === 0;

  it("há ajuda para todos os tipos de item (criou um tipo novo? escreva aqui)", () => {
    for (const k of REVIEW_KINDS) {
      expect(AJUDA_POR_TIPO[k], `falta ajuda para o tipo ${k}`).toBeDefined();
      expect(vazio(AJUDA_POR_TIPO[k].oQueE), `${k}: oQueE vazio`).toBe(false);
      expect(vazio(AJUDA_POR_TIPO[k].comoResponder), `${k}: comoResponder vazio`).toBe(false);
      expect(KIND_LABEL[k]).toBeTruthy();
    }
  });

  it("há explicação para todos os botões de resposta", () => {
    for (const d of REVIEW_DECISIONS) {
      expect(vazio(EXPLICACAO_DA_RESPOSTA[d]), `falta explicar ${d}`).toBe(false);
      expect(DECISION_LABEL[d]).toBeTruthy();
    }
  });

  it("os passos, os papéis e os resultados têm texto", () => {
    expect(PASSOS.length).toBeGreaterThanOrEqual(3);
    for (const p of PASSOS) expect(vazio(p.titulo) || vazio(p.texto)).toBe(false);
    for (const papel of ["decisor", "avaliador"] as const) {
      expect(QUEM_VE_O_QUE[papel].length).toBeGreaterThan(0);
    }
    expect(RESULTADOS.aguardandoDecisao(0)).toContain("Nenhum");
    expect(RESULTADOS.aguardandoDecisao(1)).toContain("1 item tem");
    expect(RESULTADOS.aguardandoDecisao(3)).toContain("3 itens têm");
  });

  it("nenhum texto promete publicação nem usa a palavra rascunho para o leitor", () => {
    const tudo = JSON.stringify([AJUDA_POR_TIPO, EXPLICACAO_DA_RESPOSTA, PASSOS, QUEM_VE_O_QUE]);
    expect(tudo).not.toMatch(/RASCUNHO|TESTE/);
  });
});
