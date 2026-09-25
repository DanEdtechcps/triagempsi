import { describe, it, expect } from "vitest";
import type { AssessmentListItem } from "@/lib/painel.functions";
import {
  isRiskFlagged,
  isAttentionFlagged,
  filterAssessments,
  sortAssessments,
  computeQueueCounts,
  getEscalasDisponiveis,
  getMedicosDisponiveis,
  toggleSelection,
  toggleAllSelection,
  type PainelFilterState,
} from "@/lib/painel-fila";

function makeItem(overrides: Partial<AssessmentListItem> & { id: string }): AssessmentListItem {
  return {
    respondent_name: "Paciente Teste",
    respondent_age: 30,
    respondent_email: "paciente@example.com",
    respondent_type: "paciente",
    informant_name: null,
    informant_relation: null,
    submitted_at: "2026-01-01T10:00:00.000Z",
    created_at: "2026-01-01T09:00:00.000Z",
    status: "completed",
    risk_flags: [],
    summary: {},
    scales: [],
    clinic_id: "clinic-a",
    clinic_name: "Clínica A",
    doctor_id: null,
    doctor_name: null,
    ...overrides,
  };
}

const baseFilters: PainelFilterState = {
  clinicFilter: "todas",
  busca: "",
  riscoFilter: "todos",
  escalaFilter: "todas",
  statusFilter: "todos",
  informanteFilter: "todos",
  medicoFilter: "todos",
  campoData: "submitted",
  dataDe: "",
  dataAte: "",
};

describe("isRiskFlagged", () => {
  it("retorna true quando há risk_flags", () => {
    expect(isRiskFlagged(makeItem({ id: "1", risk_flags: ["phq9_item9"] }))).toBe(true);
  });

  it("retorna true quando summary.risk_pathway é true mesmo sem risk_flags", () => {
    expect(
      isRiskFlagged(makeItem({ id: "1", risk_flags: [], summary: { risk_pathway: true } })),
    ).toBe(true);
  });

  it("retorna false sem risk_flags e sem risk_pathway", () => {
    expect(isRiskFlagged(makeItem({ id: "1", risk_flags: [], summary: {} }))).toBe(false);
  });
});

describe("isAttentionFlagged", () => {
  it("retorna true quando alguma escala tem band_level >= 2", () => {
    expect(
      isAttentionFlagged(
        makeItem({ id: "1", scales: [{ scale_code: "PHQ9", score: 12, band: "moderado", band_level: 2, risk: false }] }),
      ),
    ).toBe(true);
  });

  it("retorna false quando todas as escalas têm band_level < 2", () => {
    expect(
      isAttentionFlagged(
        makeItem({ id: "1", scales: [{ scale_code: "PHQ9", score: 3, band: "leve", band_level: 1, risk: false }] }),
      ),
    ).toBe(false);
  });

  it("trata band_level nulo como 0 (sem atenção)", () => {
    expect(
      isAttentionFlagged(
        makeItem({ id: "1", scales: [{ scale_code: "PHQ9", score: null, band: null, band_level: null, risk: false }] }),
      ),
    ).toBe(false);
  });
});

describe("filterAssessments — risco não pode sumir sem querer", () => {
  const risco = makeItem({ id: "risco", risk_flags: ["phq9_item9"] });
  const atencaoSemRisco = makeItem({
    id: "atencao",
    scales: [{ scale_code: "GAD7", score: 15, band: "grave", band_level: 3, risk: false }],
  });
  const riscoQueTambemBateAtencao = makeItem({
    id: "risco-e-atencao",
    risk_flags: ["cssrs_positive"],
    scales: [{ scale_code: "PHQ9", score: 20, band: "grave", band_level: 3, risk: true }],
  });
  const semNada = makeItem({ id: "sem" });
  const todos = [risco, atencaoSemRisco, riscoQueTambemBateAtencao, semNada];

  it("filtro 'todos' (padrão) mantém os casos de risco na lista", () => {
    const resultado = filterAssessments(todos, baseFilters);
    expect(resultado.map((a) => a.id)).toContain("risco");
    expect(resultado.map((a) => a.id)).toContain("risco-e-atencao");
    expect(resultado).toHaveLength(4);
  });

  it("filtro 'risco' retorna só os casos com sinalização de risco", () => {
    const resultado = filterAssessments(todos, { ...baseFilters, riscoFilter: "risco" });
    expect(resultado.map((a) => a.id).sort()).toEqual(["risco", "risco-e-atencao"]);
  });

  it("filtro 'atencao' exclui casos de risco mesmo que também batam banda de atenção", () => {
    const resultado = filterAssessments(todos, { ...baseFilters, riscoFilter: "atencao" });
    expect(resultado.map((a) => a.id)).toEqual(["atencao"]);
  });

  it("filtro 'sem' exclui tanto risco quanto atenção", () => {
    const resultado = filterAssessments(todos, { ...baseFilters, riscoFilter: "sem" });
    expect(resultado.map((a) => a.id)).toEqual(["sem"]);
  });

  it("busca por nome/e-mail/escala não esconde um caso de risco que bate o termo", () => {
    const comNome = makeItem({ id: "risco-nome", risk_flags: ["x"], respondent_name: "Maria Risco" });
    const resultado = filterAssessments([comNome, semNada], { ...baseFilters, busca: "maria" });
    expect(resultado.map((a) => a.id)).toEqual(["risco-nome"]);
  });
});

describe("filterAssessments — demais filtros", () => {
  const itens = [
    makeItem({ id: "a", clinic_id: "clinic-a", status: "completed", respondent_type: "paciente", doctor_id: "doc-1", doctor_name: "Dra. Ana", scales: [{ scale_code: "PHQ9", score: 5, band: "leve", band_level: 1, risk: false }] }),
    makeItem({ id: "b", clinic_id: "clinic-b", status: "pending", respondent_type: "familiar", doctor_id: null, doctor_name: null, scales: [{ scale_code: "GAD7", score: 8, band: "moderado", band_level: 2, risk: false }] }),
  ];

  it("filtra por clínica", () => {
    const resultado = filterAssessments(itens, { ...baseFilters, clinicFilter: "clinic-b" });
    expect(resultado.map((a) => a.id)).toEqual(["b"]);
  });

  it("filtra por escala aplicada", () => {
    const resultado = filterAssessments(itens, { ...baseFilters, escalaFilter: "GAD7" });
    expect(resultado.map((a) => a.id)).toEqual(["b"]);
  });

  it("filtra por status enviado/pendente", () => {
    expect(filterAssessments(itens, { ...baseFilters, statusFilter: "enviado" }).map((a) => a.id)).toEqual(["a"]);
    expect(filterAssessments(itens, { ...baseFilters, statusFilter: "pendente" }).map((a) => a.id)).toEqual(["b"]);
  });

  it("filtra por informante (paciente/familiar)", () => {
    expect(
      filterAssessments(itens, { ...baseFilters, informanteFilter: "familiar" }).map((a) => a.id),
    ).toEqual(["b"]);
  });

  it("filtra por médico responsável, incluindo o caso 'nenhum'", () => {
    expect(filterAssessments(itens, { ...baseFilters, medicoFilter: "doc-1" }).map((a) => a.id)).toEqual(["a"]);
    expect(filterAssessments(itens, { ...baseFilters, medicoFilter: "nenhum" }).map((a) => a.id)).toEqual(["b"]);
  });

  it("filtra por intervalo de datas no campo selecionado", () => {
    const comDatas = [
      makeItem({ id: "antigo", submitted_at: "2026-01-01T10:00:00.000Z" }),
      makeItem({ id: "recente", submitted_at: "2026-02-15T10:00:00.000Z" }),
    ];
    const resultado = filterAssessments(comDatas, {
      ...baseFilters,
      dataDe: "2026-02-01",
      dataAte: "2026-02-28",
    });
    expect(resultado.map((a) => a.id)).toEqual(["recente"]);
  });
});

describe("sortAssessments", () => {
  const itens = [
    makeItem({ id: "b", respondent_name: "Bruno", submitted_at: "2026-01-02T00:00:00.000Z", created_at: "2026-01-05T00:00:00.000Z" }),
    makeItem({ id: "a", respondent_name: "Ana", submitted_at: "2026-01-03T00:00:00.000Z", created_at: "2026-01-04T00:00:00.000Z" }),
  ];

  it("ordena por envio decrescente (padrão)", () => {
    expect(sortAssessments(itens, "submitted_desc").map((a) => a.id)).toEqual(["a", "b"]);
  });

  it("ordena por envio crescente", () => {
    expect(sortAssessments(itens, "submitted_asc").map((a) => a.id)).toEqual(["b", "a"]);
  });

  it("ordena por criação decrescente e crescente", () => {
    expect(sortAssessments(itens, "created_desc").map((a) => a.id)).toEqual(["b", "a"]);
    expect(sortAssessments(itens, "created_asc").map((a) => a.id)).toEqual(["a", "b"]);
  });

  it("ordena por nome ascendente e descendente", () => {
    expect(sortAssessments(itens, "nome_asc").map((a) => a.id)).toEqual(["a", "b"]);
    expect(sortAssessments(itens, "nome_desc").map((a) => a.id)).toEqual(["b", "a"]);
  });

  it("é estável: itens com a mesma chave de ordenação preservam a ordem original", () => {
    const empatados = [
      makeItem({ id: "1", submitted_at: "2026-01-01T00:00:00.000Z" }),
      makeItem({ id: "2", submitted_at: "2026-01-01T00:00:00.000Z" }),
      makeItem({ id: "3", submitted_at: "2026-01-01T00:00:00.000Z" }),
    ];
    expect(sortAssessments(empatados, "submitted_desc").map((a) => a.id)).toEqual(["1", "2", "3"]);
  });

  it("não muta o array original", () => {
    const original = [...itens];
    sortAssessments(itens, "nome_asc");
    expect(itens).toEqual(original);
  });
});

describe("computeQueueCounts", () => {
  it("conta total, risco, atenção (excluindo risco) e revisados", () => {
    const itens = [
      makeItem({ id: "1", risk_flags: ["x"] }),
      makeItem({ id: "2", scales: [{ scale_code: "GAD7", score: 10, band: "moderado", band_level: 2, risk: false }] }),
      makeItem({ id: "3" }),
    ];
    const contagem = computeQueueCounts(itens, ["1", "3"]);
    expect(contagem).toEqual({ total: 3, risco: 1, atencao: 1, revisados: 2 });
  });
});

describe("getEscalasDisponiveis / getMedicosDisponiveis", () => {
  it("deduplica e ordena escalas aplicadas", () => {
    const itens = [
      makeItem({ id: "1", scales: [{ scale_code: "PHQ9", score: 1, band: null, band_level: null, risk: false }] }),
      makeItem({ id: "2", scales: [{ scale_code: "GAD7", score: 1, band: null, band_level: null, risk: false }, { scale_code: "PHQ9", score: 1, band: null, band_level: null, risk: false }] }),
    ];
    expect(getEscalasDisponiveis(itens)).toEqual(["GAD7", "PHQ9"]);
  });

  it("deduplica médicos por id e ordena por nome", () => {
    const itens = [
      makeItem({ id: "1", doctor_id: "d2", doctor_name: "Zeca" }),
      makeItem({ id: "2", doctor_id: "d1", doctor_name: "Ana" }),
      makeItem({ id: "3", doctor_id: "d1", doctor_name: "Ana" }),
      makeItem({ id: "4", doctor_id: null, doctor_name: null }),
    ];
    expect(getMedicosDisponiveis(itens)).toEqual([
      ["d1", "Ana"],
      ["d2", "Zeca"],
    ]);
  });
});

describe("toggleSelection / toggleAllSelection", () => {
  it("alterna um id individual", () => {
    expect(toggleSelection([], "a")).toEqual(["a"]);
    expect(toggleSelection(["a"], "a")).toEqual([]);
    expect(toggleSelection(["a"], "b")).toEqual(["a", "b"]);
  });

  it("seleciona todos os itens da página quando nem todos estão selecionados", () => {
    expect(toggleAllSelection(["a"], ["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("desmarca os itens da página quando todos já estavam selecionados", () => {
    expect(toggleAllSelection(["a", "b", "c", "x"], ["a", "b", "c"])).toEqual(["x"]);
  });
});
