import { describe, it, expect, vi } from "vitest";
import { runShadowTriageComparison } from "./shadow-runner";
import {
  getTriagePlanForSession,
  setDeclarativeEngineEnabled,
  IS_DECLARATIVE_ENGINE_ENABLED,
} from "./flags";

describe("Clinical Engine — Homologação Final e Execução Sombra (Shadow Execution)", () => {
  describe("Matriz de Equivalência dos Motores Clínicos", () => {
    it("Cenário 1: Homem Adulto (35a) com sintoma perinatal — 100% equivalente e EPDS estritamente bloqueada", () => {
      const res = runShadowTriageComparison(["perinatal", "tristeza"], 35, "masculino");

      expect(res.epdsBlockedInBoth).toBe(true);
      expect(res.legacyFlow).not.toContain("EPDS");
      expect(res.declarativeFlow).not.toContain("EPDS");
      expect(res.isEquivalent).toBe(true);
      expect(res.diffs).toHaveLength(0);
    });

    it("Cenário 2: Mulher Adulta (28a) com queixa perinatal e tristeza — ambas ativam EPDS e PHQ-2", () => {
      const res = runShadowTriageComparison(["perinatal", "tristeza"], 28, "feminino");

      expect(res.legacyFlow).toContain("EPDS");
      expect(res.declarativeFlow).toContain("EPDS");
      expect(res.legacyFlow).toContain("PHQ-2");
      expect(res.declarativeFlow).toContain("PHQ-2");
      expect(res.isEquivalent).toBe(true);
      expect(res.diffs).toHaveLength(0);
    });

    it("Cenário 3: Paciente em Crise com ideação de morte — ambas ativam a Via de Risco", () => {
      const res = runShadowTriageComparison(["morte"], 30, "outro");

      expect(res.legacyRisk).toBe(true);
      expect(res.declarativeRisk).toBe(true);
      expect(res.declarativeFlow).toContain("C-SSRS");
      expect(res.isEquivalent).toBe(true);
      expect(res.diffs).toHaveLength(0);
    });

    it("Cenário 4: Adolescente (15a) com atenção — ativa ASRS-C e omite ASRS-18", () => {
      const res = runShadowTriageComparison(["atencao"], 15, "feminino");

      expect(res.legacyFlow).toContain("ASRS-C");
      expect(res.legacyFlow).not.toContain("ASRS-18");

      expect(res.declarativeFlow).toContain("ASRS-C");
      expect(res.declarativeFlow).not.toContain("ASRS-18");

      expect(res.isEquivalent).toBe(true);
      expect(res.diffs).toHaveLength(0);
    });

    it("Cenário 5: Idoso (68a) com queixa de memória — ativa AD-8 para rastreio cognitivo", () => {
      const res = runShadowTriageComparison(["memoria"], 68, "masculino");

      expect(res.legacyFlow).toContain("AD-8");
      expect(res.declarativeFlow).toContain("AD-8");
      expect(res.isEquivalent).toBe(true);
      expect(res.diffs).toHaveLength(0);
    });
  });

  describe("Gerenciamento de Feature Flags e Fallback Seguro", () => {
    it("permite obter o plano de triagem com shadow check ativo", () => {
      const onDiffSpy = vi.fn();
      const plan = getTriagePlanForSession(["ansiedade"], 25, "feminino", {
        enableShadow: true,
        onShadowDiff: onDiffSpy,
      });

      expect(plan).toBeDefined();
      expect(plan.flow).toBeInstanceOf(Array);
      expect(onDiffSpy).not.toHaveBeenCalled();
    });

    it("permite alternar dinamicamente a flag do motor", () => {
      setDeclarativeEngineEnabled(false);
      expect(IS_DECLARATIVE_ENGINE_ENABLED).toBe(false);

      const plan = getTriagePlanForSession(["tristeza"], 30, "masculino", {
        enableShadow: false,
      });
      expect(plan).toBeDefined();

      setDeclarativeEngineEnabled(true);
      expect(IS_DECLARATIVE_ENGINE_ENABLED).toBe(true);
    });
  });
});
