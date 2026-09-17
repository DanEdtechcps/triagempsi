import { describe, expect, it } from "vitest";
import { EVIDENCE_BY_CODE, SCALE_EVIDENCE } from "./scale-evidence";
import { ALL_SCALES, SCALE_BY_CODE } from "@/lib/scales-data";

describe("base de evidências das escalas", () => {
  it("toda escala ativa do sistema tem evidência cadastrada", () => {
    const ativas = ALL_SCALES.filter((s) => s.status !== "estrutura");
    for (const scale of ativas) {
      expect(
        EVIDENCE_BY_CODE[scale.code],
        `faltou evidência para ${scale.code}`,
      ).toBeDefined();
    }
  });

  it("toda escala em curadoria está sinalizada na base", () => {
    const pendentes = ALL_SCALES.filter((s) => s.status === "estrutura");
    for (const scale of pendentes) {
      expect(
        EVIDENCE_BY_CODE[scale.code],
        `faltou registro para ${scale.code}`,
      ).toBeDefined();
    }
  });

  it("toda evidência aponta para uma escala que existe no sistema", () => {
    for (const ev of SCALE_EVIDENCE) {
      expect(
        SCALE_BY_CODE[ev.code],
        `evidência órfã: ${ev.code}`,
      ).toBeDefined();
    }
  });

  it("toda evidência tem condição, corte e referência", () => {
    for (const ev of SCALE_EVIDENCE) {
      expect(ev.condition.length).toBeGreaterThan(3);
      expect(ev.cutoff.length).toBeGreaterThan(0);
      expect(ev.reference.length).toBeGreaterThan(10);
    }
  });
});
