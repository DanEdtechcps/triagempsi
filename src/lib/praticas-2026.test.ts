import { describe, it, expect } from "vitest";
import { evaluateAdaptive, completeAdaptiveAnswers } from "@/lib/adaptive";
import { computeQueueImpact } from "@/lib/queue-impact";
import { scoreScale } from "@/lib/scoring";
import { COPSOQ_BR } from "@/lib/scales-ocupacional";
import { SCALE_BY_CODE } from "@/lib/scales-data";
import { analyzeChange } from "@/lib/reliable-change";

describe("administração adaptativa", () => {
  it("não para antes do mínimo de itens", () => {
    const r = evaluateAdaptive("PHQ-9", { "1": 0, "2": 0 });
    expect(r.stop).toBe(false);
  });

  it("para quando a faixa já está determinada", () => {
    // PCL-5: com 8 itens no máximo, o escore final já é positivo em qualquer cenário
    const answers: Record<string, number> = {};
    for (const id of ["1", "2", "3", "4", "5", "6", "7", "8"]) answers[id] = 4;
    const r = evaluateAdaptive("PCL-5", answers);
    expect(r.stop).toBe(true);
    expect(r.itemsSaved).toBeGreaterThan(0);
  });

  it("nunca pula item de risco pendente", () => {
    const answers: Record<string, number> = {};
    for (const id of ["1", "2", "3", "4", "5", "6", "7", "8"]) answers[id] = 3;
    // item 9 (risco) ainda pendente → não pode parar
    const r = evaluateAdaptive("PHQ-9", answers);
    expect(r.stop).toBe(false);
  });

  it("completa as respostas faltantes mantendo o escore comparável", () => {
    const partial = { "1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3, "7": 3 };
    const { answers, estimated } = completeAdaptiveAnswers("PHQ-9", partial);
    expect(Object.keys(answers)).toHaveLength(9);
    expect(estimated).toContain("9");
  });
});

describe("COPSOQ-BR (NR-01)", () => {
  it("está registrado no catálogo de escalas", () => {
    expect(SCALE_BY_CODE["COPSOQ-BR"]).toBeDefined();
    expect(COPSOQ_BR.items).toHaveLength(16);
  });

  it("classifica risco crítico e sinaliza assédio", () => {
    const answers = Object.fromEntries(COPSOQ_BR.items.map((i) => [i.id, 3]));
    const r = scoreScale("COPSOQ-BR", answers);
    expect(r.score).toBe(48);
    expect(r.band).toContain("crítico");
    expect(r.risk).toBe(true);
  });
});

describe("impacto da fila priorizada", () => {
  it("mede as posições que os casos graves ganharam", () => {
    const items = [
      { id: "a", submitted_at: "2026-01-01", risk: false, level: 0 },
      { id: "b", submitted_at: "2026-01-02", risk: false, level: 1 },
      { id: "c", submitted_at: "2026-01-03", risk: true, level: 4 },
    ];
    const r = computeQueueImpact(items, 1);
    expect(r.graves).toBe(1);
    expect(r.posicoesGanhas).toBe(2);
    expect(r.diasEconomizados).toBe(2);
  });
});

describe("mudança confiável", () => {
  it("reconhece melhora acima do erro de medida no PHQ-9", () => {
    const a = analyzeChange("PHQ-9", 18, 8);
    expect(a.verdict).toBe("melhora_confiavel");
  });

  it("trata variação pequena como ruído", () => {
    const a = analyzeChange("PHQ-9", 18, 16);
    expect(a.verdict).not.toBe("melhora_confiavel");
  });
});
