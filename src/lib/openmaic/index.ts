/**
 * index.ts — Barrel export do módulo OpenMAIC.
 *
 * Import único para o resto do app:
 *   import { createSimulationContext, ... } from "@/lib/openmaic";
 */

export type {
  AgentConfig,
  AgentRole,
  ScenarioConfig,
  SimulationContext,
  SimulationFlow,
  SimulationResult,
  SimulationRule,
  SimulationTurn,
} from "./types";

export {
  createSimulationContext,
  processTurn,
  finalizeSimulation,
} from "./orchestrator";

export type { TurnResult } from "./orchestrator";

export {
  ALL_SCENARIOS,
  CLINICAL_CASE_SCENARIOS,
  HARM_REDUCTION_SCENARIOS,
  getScenarioById,
  getScenariosByFlow,
} from "./scenarios";
