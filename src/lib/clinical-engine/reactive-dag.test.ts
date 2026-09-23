import { describe, it, expect, beforeEach } from "vitest";
import { ReactiveTriageDAG, type DAGState } from "./reactive-dag";
import { CANONICAL_REACTIONS } from "./reactions";
import { scoreSchemaScale } from "./schema-evaluator";
import type { ScaleSchema } from "./schema-types";

import phq2Raw from "./schemas/phq2.json";
import phq9Raw from "./schemas/phq9.json";
import epdsRaw from "./schemas/epds.json";

const phq2Schema = phq2Raw as unknown as ScaleSchema;
const phq9Schema = phq9Raw as unknown as ScaleSchema;
const epdsSchema = epdsRaw as unknown as ScaleSchema;

describe("Clinical Engine — Motor Reativo de Grafos (DAG) & Reações Cruzadas", () => {
  let dag: ReactiveTriageDAG;
  let baseState: DAGState;

  beforeEach(() => {
    dag = new ReactiveTriageDAG(CANONICAL_REACTIONS);
    baseState = {
      flow: ["PHQ-2"],
      completed: [],
      safetyPlanTriggered: false,
      logs: [],
    };
  });

  describe("Reação PHQ-2 -> PHQ-9", () => {
    it("resposta com PHQ-2 < 3 NUNCA injeta o PHQ-9 no fluxo", () => {
      const resultNeg = scoreSchemaScale(phq2Schema, {
        "1": 1, // Pouco interesse: 1
        "2": 0, // Deprimido: 0
      }); // score = 1 (< 3)

      const nextState = dag.dispatch(resultNeg, baseState);

      expect(nextState.flow).toEqual(["PHQ-2"]);
      expect(nextState.flow).not.toContain("PHQ-9");
      expect(nextState.completed).toContain("PHQ-2");
      expect(nextState.safetyPlanTriggered).toBe(false);
    });

    it("resposta com PHQ-2 >= 3 injeta reativamente o PHQ-9 imediatamente após no fluxo", () => {
      const resultPos = scoreSchemaScale(phq2Schema, {
        "1": 2, // 2
        "2": 1, // 1
      }); // score = 3 (>= 3)

      const nextState = dag.dispatch(resultPos, baseState);

      expect(nextState.flow).toContain("PHQ-9");
      expect(nextState.flow).toEqual(["PHQ-2", "PHQ-9"]);
      expect(nextState.completed).toContain("PHQ-2");
      expect(nextState.logs.some((l) => l.action === "INJECT_SCALE" && l.target === "PHQ-9")).toBe(
        true,
      );
    });

    it("não duplica PHQ-9 se ele já constar na fila ativa", () => {
      const stateWithPhq9: DAGState = {
        flow: ["PHQ-2", "PHQ-9"],
        completed: [],
        safetyPlanTriggered: false,
        logs: [],
      };

      const resultPos = scoreSchemaScale(phq2Schema, { "1": 3, "2": 3 });
      const nextState = dag.dispatch(resultPos, stateWithPhq9);

      expect(nextState.flow.filter((s) => s === "PHQ-9").length).toBe(1);
    });
  });

  describe("Protocolo de Segurança e Risco (PHQ-9 -> Crise / C-SSRS)", () => {
    it("resposta com PHQ-9 item 9 > 0 aciona instantaneamente o Plano de Segurança e injeta C-SSRS", () => {
      const state: DAGState = {
        flow: ["PHQ-9"],
        completed: ["PHQ-2"],
        safetyPlanTriggered: false,
        logs: [],
      };

      // Resposta com ideação suicida (item 9 = 1), mesmo que escore total seja baixo
      const result = scoreSchemaScale(phq9Schema, {
        "1": 1,
        "9": 1,
      });

      const nextState = dag.dispatch(result, state);

      expect(nextState.safetyPlanTriggered).toBe(true);
      expect(nextState.flow).toContain("C-SSRS");
      expect(nextState.completed).toContain("PHQ-9");
      expect(
        nextState.logs.some((l) => l.action === "TRIGGER_SAFETY_PLAN" && l.target === "C-SSRS"),
      ).toBe(true);
    });

    it("resposta com EPDS item 10 > 0 aciona Plano de Segurança e injeta C-SSRS", () => {
      const state: DAGState = {
        flow: ["EPDS"],
        completed: [],
        safetyPlanTriggered: false,
        logs: [],
      };

      const result = scoreSchemaScale(epdsSchema, {
        "3": 1,
        "10": 2, // Autoagressão
      });

      const nextState = dag.dispatch(result, state, { sex: "feminino" });

      expect(nextState.safetyPlanTriggered).toBe(true);
      expect(nextState.flow).toContain("C-SSRS");
    });
  });

  describe("Garantia de Aciclicidade do Grafo (DAG Invariant)", () => {
    it("permite cadeia linear ou ramificada acíclica (PHQ-2 -> PHQ-9 -> C-SSRS)", () => {
      const customDag = new ReactiveTriageDAG();
      expect(() => {
        customDag.addReaction({
          source: "A",
          condition: () => true,
          action: "INJECT_SCALE",
          target: "B",
        });
        customDag.addReaction({
          source: "B",
          condition: () => true,
          action: "INJECT_SCALE",
          target: "C",
        });
      }).not.toThrow();
    });

    it("detecta e bloqueia loop circular direto (A -> B -> A)", () => {
      const customDag = new ReactiveTriageDAG();
      customDag.addReaction({
        source: "A",
        condition: () => true,
        action: "INJECT_SCALE",
        target: "B",
      });

      expect(() => {
        customDag.addReaction({
          source: "B",
          condition: () => true,
          action: "INJECT_SCALE",
          target: "A",
        });
      }).toThrow(/Ciclo inválido detectado no DAG de triagem/);
    });

    it("detecta e bloqueia loop circular indireto longo (A -> B -> C -> A)", () => {
      const customDag = new ReactiveTriageDAG();
      customDag.addReaction({
        source: "A",
        condition: () => true,
        action: "INJECT_SCALE",
        target: "B",
      });
      customDag.addReaction({
        source: "B",
        condition: () => true,
        action: "INJECT_SCALE",
        target: "C",
      });

      expect(() => {
        customDag.addReaction({
          source: "C",
          condition: () => true,
          action: "INJECT_SCALE",
          target: "A",
        });
      }).toThrow(/Ciclo inválido detectado no DAG de triagem/);
    });
  });

  describe("Blindagem Biológica no DAG", () => {
    it("impede que qualquer reação injete a EPDS para paciente do sexo masculino", () => {
      const customDag = new ReactiveTriageDAG([
        {
          source: "PHQ-2",
          condition: () => true,
          action: "INJECT_SCALE",
          target: "EPDS",
        },
      ]);

      const state: DAGState = {
        flow: ["PHQ-2"],
        completed: [],
        safetyPlanTriggered: false,
        logs: [],
      };

      const result = scoreSchemaScale(phq2Schema, { "1": 3, "2": 3 });

      // Para paciente masculino
      const nextStateMale = customDag.dispatch(result, state, {
        sex: "masculino",
      });
      expect(nextStateMale.flow).not.toContain("EPDS");

      // Para paciente feminina
      const nextStateFemale = customDag.dispatch(result, state, {
        sex: "feminino",
      });
      expect(nextStateFemale.flow).toContain("EPDS");
    });
  });
});
