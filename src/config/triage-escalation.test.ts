import { describe, expect, it } from "vitest";
import { applyEscalations, buildTriagePlan, type TriagePlan } from "@/config/triage-tree";
import { resultWithScore } from "@/lib/test-utils";
import type { ScaleResult } from "@/lib/scoring";
import { scoreScale } from "@/lib/scoring";

/** Aplica uma escala já respondida ao plano, como faz a tela de triagem. */
function advance(
  plan: TriagePlan,
  result: ScaleResult,
  age: number,
  completed: string[] = [],
) {
  const index = plan.flow.indexOf(result.scale_code);
  return applyEscalations(plan, result, age, completed, index);
}

describe("escalonamento por resultado", () => {
  it("PHQ-2 = 2 não escalona; PHQ-2 = 3 dispara PHQ-9", () => {
    const plan = buildTriagePlan(["tristeza"], 30);
    const negativo = advance(plan, resultWithScore("PHQ-2", 2), 30);
    expect(negativo.flow).not.toContain("PHQ-9");

    const positivo = advance(plan, resultWithScore("PHQ-2", 3), 30);
    expect(positivo.flow).toContain("PHQ-9");
    expect(positivo.flow.indexOf("PHQ-9")).toBe(
      positivo.flow.indexOf("PHQ-2") + 1,
    );
  });

  it("PHQ-9 com item 9 positivo dispara ASQ e liga a via de risco", () => {
    const plan: TriagePlan = { ...buildTriagePlan(["tristeza"], 30), flow: ["PHQ-9"] };
    const r = resultWithScore("PHQ-9", 4, { "9": 1 });
    const next = advance(plan, r, 30);
    expect(next.flow).toContain("ASQ");
    expect(next.riskPathway).toBe(true);
  });

  it("PHQ-9 = 9 sem item 9 não escalona; PHQ-9 = 10 pede ASQ e PC-PTSD-5", () => {
    const base: TriagePlan = { ...buildTriagePlan([], 30), flow: ["PHQ-9"] };
    const leve = advance(base, resultWithScore("PHQ-9", 9, { "9": 0 }), 30);
    expect(leve.flow).toEqual(["PHQ-9"]);

    const moderado = advance(base, resultWithScore("PHQ-9", 10, { "9": 0 }), 30);
    expect(moderado.flow).toContain("ASQ");
    expect(moderado.flow).toContain("PC-PTSD-5");
  });

  it("GAD-2: 2 não escalona, 3 dispara GAD-7", () => {
    const plan = buildTriagePlan(["ansiedade"], 30);
    expect(advance(plan, resultWithScore("GAD-2", 2), 30).flow).not.toContain("GAD-7");
    expect(advance(plan, resultWithScore("GAD-2", 3), 30).flow).toContain("GAD-7");
  });

  it("GAD-7 ≥ 10 rastreia depressão com PHQ-2", () => {
    const plan: TriagePlan = { ...buildTriagePlan([], 30), flow: ["GAD-7"] };
    expect(advance(plan, resultWithScore("GAD-7", 9), 30).flow).not.toContain("PHQ-2");
    expect(advance(plan, resultWithScore("GAD-7", 10), 30).flow).toContain("PHQ-2");
  });

  it("SRQ-20: 6 não escalona, 7 abre PHQ-2 e GAD-2", () => {
    const plan = buildTriagePlan(["angustia"], 30);
    expect(advance(plan, resultWithScore("SRQ-20", 6), 30).flow).toEqual(["SRQ-20"]);
    const pos = advance(plan, resultWithScore("SRQ-20", 7), 30);
    expect(pos.flow).toContain("PHQ-2");
    expect(pos.flow).toContain("GAD-2");
  });

  it("SRQ-20 item 17 positivo dispara ASQ mesmo com escore baixo", () => {
    const plan = buildTriagePlan(["angustia"], 30);
    const r = resultWithScore("SRQ-20", 1, { "17": 1 });
    const next = advance(plan, r, 30);
    expect(next.flow).toContain("ASQ");
    expect(next.riskPathway).toBe(true);
  });

  it("GDS-15: 4 não escalona, 5 dispara ASQ no idoso", () => {
    const plan = buildTriagePlan(["tristeza"], 70);
    expect(advance(plan, resultWithScore("GDS-15", 4), 70).flow).not.toContain("ASQ");
    expect(advance(plan, resultWithScore("GDS-15", 5), 70).flow).toContain("ASQ");
  });

  it("AUDIT-C: 2 não escalona, 3 dispara AUDIT completo", () => {
    const plan = buildTriagePlan(["substancias"], 40);
    expect(advance(plan, resultWithScore("AUDIT-C", 2), 40).flow).not.toContain("AUDIT");
    expect(advance(plan, resultWithScore("AUDIT-C", 3), 40).flow).toContain("AUDIT");
  });

  it("AUDIT ≥ 8 complementa com CAGE, sem duplicar quando já está no fluxo", () => {
    const semCage: TriagePlan = { ...buildTriagePlan([], 40), flow: ["AUDIT"] };
    expect(advance(semCage, resultWithScore("AUDIT", 7), 40).flow).not.toContain("CAGE");
    expect(advance(semCage, resultWithScore("AUDIT", 8), 40).flow).toContain("CAGE");

    const comCage = buildTriagePlan(["substancias"], 40);
    const next = advance(comCage, resultWithScore("AUDIT", 20), 40);
    expect(next.flow.filter((c) => c === "CAGE")).toHaveLength(1);
  });

  it("PC-PTSD-5: 2 não escalona, 3 indica PCL-5", () => {
    const plan = buildTriagePlan(["trauma"], 40);
    const neg = advance(plan, resultWithScore("PC-PTSD-5", 2), 40);
    expect([...neg.flow, ...neg.indicated.map((i) => i.code)]).not.toContain("PCL-5");
    const pos = advance(plan, resultWithScore("PC-PTSD-5", 3), 40);
    expect([...pos.flow, ...pos.indicated.map((i) => i.code)]).toContain("PCL-5");
  });

  it("PHQ-15 ≥ 10 rastreia depressão e ansiedade associadas", () => {
    const plan = buildTriagePlan(["somatico"], 40);
    expect(advance(plan, resultWithScore("PHQ-15", 9), 40).flow).not.toContain("GAD-2");
    const pos = advance(plan, resultWithScore("PHQ-15", 10), 40);
    expect(pos.flow).toContain("PHQ-2");
    expect(pos.flow).toContain("GAD-2");
  });

  it("ASQ positivo mantém a via de risco sem adicionar escalas", () => {
    const plan = buildTriagePlan(["morte"], 40);
    const next = advance(plan, resultWithScore("ASQ", 1), 40);
    expect(next.riskPathway).toBe(true);
    expect(next.flow).toEqual(plan.flow);
  });

  it("ASSIST-Lite: álcool ≥ 2 dispara AUDIT completo; 1 não dispara", () => {
    const plan = buildTriagePlan(["substancias"], 40);
    const baixo = advance(plan, scoreScale("ASSIST", { "801": 0, "804": 1, "808": 0, "811": 0, "814": 0, "817": 0, "820": 0 }), 40);
    expect(baixo.flow).not.toContain("AUDIT");
    const moderado = advance(plan, scoreScale("ASSIST", { "804": 1, "805": 1 }), 40);
    expect(moderado.flow).toContain("AUDIT");
  });

  it("ASSIST-Lite: uso de tabaco dispara Fagerström; sem tabaco, não", () => {
    const plan = buildTriagePlan(["substancias"], 40);
    expect(advance(plan, scoreScale("ASSIST", { "801": 0, "804": 0, "808": 0, "811": 0, "814": 0, "817": 0, "820": 0 }), 40).flow).not.toContain("FTND");
    expect(advance(plan, scoreScale("ASSIST", { "801": 1 }), 40).flow).toContain("FTND");
  });

  it("ASSIST-Lite: alto risco em qualquer substância rastreia depressão", () => {
    const plan = buildTriagePlan(["substancias"], 40);
    const alto = advance(plan, scoreScale("ASSIST", { "808": 1, "809": 1, "810": 1 }), 40);
    expect(alto.flow).toContain("PHQ-2");
    const baixo = advance(plan, scoreScale("ASSIST", { "808": 1 }), 40);
    expect(baixo.flow).not.toContain("PHQ-2");
  });

  it("não reinsere escala já concluída", () => {
    const plan: TriagePlan = { ...buildTriagePlan([], 30), flow: ["PHQ-2"] };
    const next = advance(plan, resultWithScore("PHQ-2", 4), 30, ["PHQ-9"]);
    expect(next.flow).not.toContain("PHQ-9");
  });

  it("registra o motivo de cada escalonamento para o relatório", () => {
    const plan = buildTriagePlan(["tristeza"], 30);
    const next = advance(plan, resultWithScore("PHQ-2", 5), 30);
    expect(next.decisions.some((d) => d.step === "PHQ-2" && /PHQ-9/.test(d.reason))).toBe(
      true,
    );
  });
});

describe("percurso completo (integração)", () => {
  it("adulto triste e com angústia: SRQ-20 → PHQ-2 → PHQ-9 → ASQ + MDQ", () => {
    const age = 30;
    let plan = buildTriagePlan(["tristeza", "angustia"], age);
    const completed: string[] = [];

    plan = advance(plan, resultWithScore("SRQ-20", 10), age, completed);
    completed.push("SRQ-20");

    plan = advance(plan, resultWithScore("PHQ-2", 5), age, completed);
    completed.push("PHQ-2");

    plan = advance(plan, resultWithScore("PHQ-9", 18, { "9": 2 }), age, completed);
    completed.push("PHQ-9");

    expect(new Set(plan.flow)).toEqual(
      new Set(["SRQ-20", "GAD-2", "PHQ-2", "PHQ-9", "ASQ", "PC-PTSD-5", "MDQ"]),
    );
    // a ordem clínica do aprofundamento é preservada
    expect(plan.flow.indexOf("PHQ-2")).toBeLessThan(plan.flow.indexOf("PHQ-9"));
    expect(plan.flow.indexOf("PHQ-9")).toBeLessThan(plan.flow.indexOf("ASQ"));
    expect(plan.riskPathway).toBe(true);
  });

  it("idoso com uso de álcool: AUDIT-C → AUDIT → CAGE", () => {
    const age = 66;
    let plan = buildTriagePlan(["substancias"], age);
    const completed: string[] = [];

    plan = advance(plan, resultWithScore("SRQ-20", 0), age, completed);
    completed.push("SRQ-20");
    plan = advance(plan, resultWithScore("AUDIT-C", 6), age, completed);
    completed.push("AUDIT-C");
    plan = advance(plan, resultWithScore("AUDIT", 15), age, completed);

    expect(plan.flow).toContain("AUDIT");
    expect(plan.flow).toContain("CAGE");
    expect(plan.flow.indexOf("AUDIT")).toBeLessThan(plan.flow.indexOf("CAGE"));
  });

  it("adulto sem sintomas positivos termina só com o rastreio geral", () => {
    const age = 40;
    let plan = buildTriagePlan([], age);
    plan = advance(plan, resultWithScore("SRQ-20", 3, { "17": 0 }), age);
    expect(plan.flow).toEqual(["SRQ-20"]);
    expect(plan.riskPathway).toBe(false);
  });
});
