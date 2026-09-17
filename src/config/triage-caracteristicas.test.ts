import { describe, expect, it } from "vitest";
import {
  applyEscalations,
  buildTriagePlan,
  type TriagePlan,
} from "@/config/triage-tree";
import { SCALE_BY_CODE } from "@/lib/scales-data";
import { summarize, type ScaleResult } from "@/lib/scoring";
import { resultWithScore } from "@/lib/test-utils";

function advance(
  plan: TriagePlan,
  result: ScaleResult,
  age: number,
  completed: string[] = [],
) {
  return applyEscalations(
    plan,
    result,
    age,
    completed,
    plan.flow.indexOf(result.scale_code),
  );
}

/** Roda o fluxo inteiro respondendo cada escala com a pontuação informada. */
function runFlow(
  symptoms: string[],
  age: number,
  scores: Record<string, number>,
  overrides: Record<string, Record<string, number>> = {},
) {
  let plan = buildTriagePlan(symptoms, age);
  const completed: string[] = [];
  const results: ScaleResult[] = [];

  for (let guard = 0; guard < 30; guard++) {
    const next = plan.flow.find((c) => !completed.includes(c));
    if (!next) break;
    const r = resultWithScore(next, scores[next] ?? 0, overrides[next]);
    results.push(r);
    plan = advance(plan, r, age, completed);
    completed.push(next);
  }

  const summary = summarize(results, {
    symptoms,
    indicated: plan.indicated,
    riskPathway: plan.riskPathway,
    decisions: plan.decisions,
    ageBand: plan.band,
  });
  return { plan, results, summary, applied: completed };
}

describe("características específicas disparam as escalas corretas", () => {
  it("trauma relatado aplica PC-PTSD-5 e, se positivo, encaminha o PCL-5", () => {
    const negativo = runFlow(["trauma"], 35, { "SRQ-20": 0, "PC-PTSD-5": 2 });
    expect(negativo.applied).toContain("PC-PTSD-5");
    expect(negativo.applied).not.toContain("PCL-5");

    const positivo = runFlow(["trauma"], 35, { "SRQ-20": 0, "PC-PTSD-5": 4 });
    const pclAplicado = positivo.applied.includes("PCL-5");
    const pclIndicado = positivo.plan.indicated.some((i) => i.code === "PCL-5");
    expect(pclAplicado || pclIndicado).toBe(true);
  });

  it("sintomas físicos aplicam o PHQ-15 e carga alta puxa humor e ansiedade", () => {
    const leve = runFlow(["somatico"], 42, { "SRQ-20": 0, "PHQ-15": 5 });
    expect(leve.applied).toContain("PHQ-15");
    expect(leve.applied).not.toContain("PHQ-2");
    expect(leve.applied).not.toContain("GAD-2");

    const alta = runFlow(["somatico"], 42, {
      "SRQ-20": 0,
      "PHQ-15": 14,
      "PHQ-2": 0,
      "GAD-2": 0,
    });
    expect(alta.applied).toEqual(
      expect.arrayContaining(["PHQ-15", "PHQ-2", "GAD-2"]),
    );
  });

  it("critério de álcool: AUDIT-C positivo → AUDIT; AUDIT ≥ 8 → CAGE", () => {
    const leve = runFlow(["substancias"], 45, { "SRQ-20": 0, "AUDIT-C": 2, CAGE: 0 });
    expect(leve.applied).toContain("AUDIT-C");
    expect(leve.applied).not.toContain("AUDIT");

    const pesado = runFlow(["substancias"], 45, {
      "SRQ-20": 0,
      "AUDIT-C": 8,
      AUDIT: 18,
      CAGE: 2,
    });
    expect(pesado.applied).toEqual(
      expect.arrayContaining(["AUDIT-C", "AUDIT", "CAGE"]),
    );
  });

  it("critério de risco: item 9 do PHQ-9 aplica o ASQ e sinaliza a via de risco", () => {
    const r = runFlow(
      ["tristeza"],
      33,
      { "SRQ-20": 0, "PHQ-2": 4, "PHQ-9": 6, ASQ: 2 },
      { "PHQ-9": { "9": 2 } },
    );
    expect(r.applied).toContain("ASQ");
    expect(r.summary.risk_pathway).toBe(true);
    expect(r.summary.risk_flags).toEqual(
      expect.arrayContaining(["PHQ-9", "ASQ", "VIA_RISCO"]),
    );
  });

  it("critério de risco: item 17 do SRQ-20 aplica o ASQ mesmo sem queixa de morte", () => {
    const r = runFlow(
      ["angustia"],
      50,
      { "SRQ-20": 2, ASQ: 1 },
      { "SRQ-20": { "17": 1 } },
    );
    expect(r.applied).toContain("ASQ");
    expect(r.summary.risk_pathway).toBe(true);
  });

  it("sem características de risco, nenhuma escala de risco é aplicada", () => {
    const r = runFlow(
      ["tristeza"],
      33,
      { "SRQ-20": 1, "PHQ-2": 1 },
      { "SRQ-20": { "17": 0 } },
    );
    expect(r.applied).not.toContain("ASQ");
    expect(r.summary.risk_pathway).toBe(false);
    expect(r.summary.risk_flags).toHaveLength(0);
  });
});

describe("escalas não aplicadas aparecem como indicadas no painel", () => {
  it("criança com trauma e uso de substâncias: nada aplicado, tudo indicado", () => {
    const { applied, summary } = runFlow(["trauma", "substancias"], 9, {});
    expect(applied).toHaveLength(0);
    expect(summary.indicated_scales.length).toBeGreaterThan(0);
    expect(summary.highlights).toHaveLength(0);
  });

  it("sintoma obsessivo aplica OCI-R no adulto e vira indicação na criança", () => {
    const { applied } = runFlow(["obsessivo"], 40, { "SRQ-20": 0, "OCI-R": 0 });
    expect(applied).toContain("OCI-R");
    const crianca = runFlow(["obsessivo"], 9, {});
    expect(crianca.applied).toHaveLength(0);
    expect(
      crianca.summary.indicated_scales.some((i) => /obsessiv/i.test(i.reason)),
    ).toBe(true);
  });

  it("nenhuma escala aparece ao mesmo tempo como aplicada e como não aplicada", () => {
    const cenarios: [string[], number][] = [
      [["tristeza", "trauma", "substancias"], 40],
      [["tristeza"], 70],
      [["atencao"], 10],
      [["morte", "somatico"], 16],
    ];
    for (const [symptoms, age] of cenarios) {
      const { applied, summary } = runFlow(symptoms, age, {
        "SRQ-20": 8,
        "PHQ-2": 4,
        "PHQ-9": 12,
        "GAD-2": 4,
        "GAD-7": 12,
        "AUDIT-C": 5,
        AUDIT: 10,
        "PC-PTSD-5": 4,
        "PHQ-15": 12,
        "GDS-15": 8,
        ASQ: 1,
      });
      const indicados = summary.indicated_scales.map((i) => i.code);
      for (const code of applied) {
        expect(indicados, `${code} não pode estar nas duas listas`).not.toContain(
          code,
        );
      }
      // toda indicação traz um motivo legível para o profissional
      for (const i of summary.indicated_scales) {
        expect(i.reason.trim().length).toBeGreaterThan(0);
        expect(i.code.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("escalas ainda em curadoria nunca entram no fluxo do paciente", () => {
    const estrutura = Object.values(SCALE_BY_CODE)
      .filter((s) => s.status === "estrutura")
      .map((s) => s.code);
    const { applied } = runFlow(
      ["tristeza", "ansiedade", "trauma", "somatico", "substancias", "atencao"],
      40,
      {
        "SRQ-20": 10,
        "PHQ-2": 5,
        "PHQ-9": 15,
        "GAD-2": 4,
        "GAD-7": 12,
        "AUDIT-C": 6,
        AUDIT: 12,
        "PC-PTSD-5": 4,
        "PHQ-15": 12,
      },
    );
    for (const code of estrutura) expect(applied).not.toContain(code);
  });
});
