import { describe, expect, it } from "vitest";
import {
  computeAccuracy,
  formatProportion,
  normalizeIcd10,
  proportion,
  wilsonInterval,
  type OutcomeRecord,
} from "@/lib/outcome-metrics";

const rec = (
  tested_positive: boolean,
  risk_assessment: OutcomeRecord["risk_assessment"],
  concordance: OutcomeRecord["concordance"] = "concorda",
): OutcomeRecord => ({ tested_positive, risk_assessment, concordance });

describe("wilsonInterval", () => {
  it("bate com valores de referência conhecidos", () => {
    // 8/10 → IC95% de Wilson ≈ 49,0%–94,3%
    const [lo, hi] = wilsonInterval(8, 10)!;
    expect(lo).toBeCloseTo(0.4902, 3);
    expect(hi).toBeCloseTo(0.9433, 3);
    // 0/10 → inferior 0 e superior ≈ 27,8%
    const [lo0, hi0] = wilsonInterval(0, 10)!;
    expect(lo0).toBe(0);
    expect(hi0).toBeCloseTo(0.2775, 3);
  });
  it("denominador 0 → null", () => {
    expect(wilsonInterval(0, 0)).toBeNull();
    expect(proportion(0, 0).value).toBeNull();
  });
});

describe("computeAccuracy", () => {
  it("tabela 2×2 conhecida: sens, espec, VPP e VPN", () => {
    const rs: OutcomeRecord[] = [
      ...Array(8).fill(rec(true, "risco_confirmado")), // TP
      ...Array(2).fill(rec(false, "risco_confirmado")), // FN
      ...Array(3).fill(rec(true, "risco_nao_confirmado")), // FP
      ...Array(17).fill(rec(false, "risco_nao_confirmado")), // TN
    ];
    const a = computeAccuracy(rs);
    expect([a.tp, a.fn, a.fp, a.tn]).toEqual([8, 2, 3, 17]);
    expect(a.sensitivity.value).toBeCloseTo(0.8, 6);
    expect(a.specificity.value).toBeCloseTo(0.85, 6);
    expect(a.ppv.value).toBeCloseTo(8 / 11, 6);
    expect(a.npv.value).toBeCloseTo(17 / 19, 6);
    expect(a.evaluated).toBe(30);
    expect(a.small_sample).toBe(true); // 10 positivos de referência < 30
  });
  it("desfechos sem avaliação de risco ficam fora da tabela mas contam na concordância", () => {
    const a = computeAccuracy([
      rec(true, "nao_avaliado", "nao_concorda"),
      rec(true, "risco_confirmado", "concorda"),
    ]);
    expect(a.evaluated).toBe(1);
    expect(a.not_evaluated).toBe(1);
    expect(a.concordance.nao_concorda).toBe(1);
    expect(a.concordance.rate_full_or_partial.value).toBe(0.5);
  });
  it("sem dados não inventa números", () => {
    const a = computeAccuracy([]);
    expect(a.sensitivity.value).toBeNull();
    expect(formatProportion(a.sensitivity)).toBe("—");
  });
  it("amostra grande deixa de ser 'pequena'", () => {
    const rs: OutcomeRecord[] = [
      ...Array(40).fill(rec(true, "risco_confirmado")),
      ...Array(40).fill(rec(false, "risco_nao_confirmado")),
    ];
    expect(computeAccuracy(rs).small_sample).toBe(false);
  });
});

describe("normalizeIcd10", () => {
  it("aceita só CID-10 válido, sem duplicar e no máximo 5", () => {
    expect(normalizeIcd10(["f32.1", "F32.1", "x", "F41.0", " F10 "])).toEqual(["F32.1", "F41.0", "F10"]);
    expect(normalizeIcd10(["F10", "F11", "F12", "F13", "F14", "F15"])).toHaveLength(5);
    expect(normalizeIcd10(null)).toEqual([]);
  });
});
