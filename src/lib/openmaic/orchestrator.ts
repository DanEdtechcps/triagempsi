/**
 * orchestrator.ts — Orquestrador de Simulações Multi-Agente OpenMAIC.
 *
 * Gerencia o ciclo de vida de uma simulação: criação, execução de turnos,
 * aplicação de regras éticas e geração de resultado formativo.
 *
 * Design:
 * - Isolamento por clinic_id (boundary obrigatório)
 * - Stateless em edge — o estado completo vive no SimulationContext
 * - Compatível com streaming (cada turno pode ser streamado incrementalmente)
 */

import type {
  AgentConfig,
  AgentRole,
  ScenarioConfig,
  SimulationContext,
  SimulationResult,
  SimulationRule,
  SimulationTurn,
} from "./types";

// ── Regras Éticas Globais ─────────────────────────────────────────────────────

const GLOBAL_RULES: SimulationRule[] = [
  {
    id: "no-real-pii",
    description: "Nenhum dado pessoal real (CPF, nome real, endereço) nos turnos",
    check: (turn) => {
      const piiPatterns = [/\d{3}\.\d{3}\.\d{3}-\d{2}/, /\d{11}/];
      if (piiPatterns.some((p) => p.test(turn.content))) {
        return "Possível CPF detectado no turno — remova dados pessoais reais.";
      }
      return null;
    },
  },
  {
    id: "no-prescription",
    description: "Agentes educacionais não prescrevem doses reais a 'pacientes'",
    check: (turn, ctx) => {
      if (ctx.flow !== "CLINICAL_CASE") return null;
      // Detecta padrões de prescrição concreta em turnos do patient
      if (
        turn.agent_role === "patient" &&
        /tome \d+mg|prescrevo \d+|comprimido de \d+/.test(turn.content.toLowerCase())
      ) {
        return "Agente patient não deve prescrever — apenas relatar sintomas.";
      }
      return null;
    },
  },
  {
    id: "harm-reduction-no-judgment",
    description: "Fluxo de redução de danos não permite linguagem estigmatizante",
    check: (turn, ctx) => {
      if (ctx.flow !== "HARM_REDUCTION") return null;
      const stigma = ["viciado", "drogado", "mendigo", "vagabundo"];
      if (stigma.some((w) => turn.content.toLowerCase().includes(w))) {
        return `Linguagem estigmatizante detectada: "${turn.content.slice(0, 60)}..."`;
      }
      return null;
    },
  },
];

// ── Factory de Contexto ───────────────────────────────────────────────────────

export function createSimulationContext(
  scenario: ScenarioConfig,
  agents: AgentConfig[],
  clinic_id: string,
): SimulationContext {
  // Garante que os roles dos agentes coincidem com os roles do cenário
  const providedRoles = new Set(agents.map((a) => a.role));
  const requiredRoles = new Set(scenario.agent_roles);
  const missing = [...requiredRoles].filter((r) => !providedRoles.has(r));
  if (missing.length > 0) {
    throw new Error(
      `[OpenMAIC] Agentes obrigatórios ausentes para o cenário "${scenario.id}": ${missing.join(", ")}`,
    );
  }

  return {
    simulation_id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    flow: scenario.flow,
    clinic_id,
    scenario_id: scenario.id,
    agents,
    rules: GLOBAL_RULES,
    turns: [],
    status: "pending",
    started_at: new Date().toISOString(),
    scenario_meta: scenario.seed_data,
  };
}

// ── Execução de Turno ─────────────────────────────────────────────────────────

export interface TurnResult {
  turn: SimulationTurn;
  rule_violations: string[];
  is_blocked: boolean;
}

export function processTurn(ctx: SimulationContext, agent_id: string, content: string): TurnResult {
  const agent = ctx.agents.find((a) => a.id === agent_id);
  if (!agent) {
    throw new Error(`[OpenMAIC] Agente não encontrado: ${agent_id}`);
  }

  // Verifica limite de turnos
  const scenario_max = ctx.scenario_meta["max_turns"] as number | undefined;
  if (scenario_max && ctx.turns.length >= scenario_max) {
    throw new Error(
      `[OpenMAIC] Limite de ${scenario_max} turnos atingido para o cenário "${ctx.scenario_id}".`,
    );
  }

  const turn: SimulationTurn = {
    turn_number: ctx.turns.length + 1,
    agent_id,
    agent_role: agent.role,
    content: content.trim(),
    timestamp: new Date().toISOString(),
  };

  // Aplicar regras
  const violations = ctx.rules
    .map((rule) => rule.check(turn, ctx))
    .filter((v): v is string => v !== null);

  const is_blocked = violations.length > 0;

  if (!is_blocked) {
    ctx.turns.push(turn);
  }

  return { turn, rule_violations: violations, is_blocked };
}

// ── Finalização & Resultado ───────────────────────────────────────────────────

export function finalizeSimulation(ctx: SimulationContext): SimulationResult {
  ctx.status = "completed";
  ctx.completed_at = new Date().toISOString();

  const evaluated = ctx.turns.filter((t) => t.evaluation !== undefined);
  const avg_score =
    evaluated.length > 0
      ? evaluated.reduce((sum, t) => sum + (t.evaluation?.score ?? 0), 0) / evaluated.length
      : undefined;

  const all_competencies = evaluated.flatMap((t) => t.evaluation?.competencies ?? []);
  const competencies_achieved = [...new Set(all_competencies)];

  const summary_md = buildSummaryMd(ctx, avg_score, competencies_achieved);

  return {
    simulation_id: ctx.simulation_id,
    flow: ctx.flow,
    scenario_id: ctx.scenario_id,
    total_turns: ctx.turns.length,
    evaluated_turns: evaluated,
    aggregate_score: avg_score,
    competencies_achieved,
    summary_md,
  };
}

// ── Summary Markdown ──────────────────────────────────────────────────────────

function buildSummaryMd(
  ctx: SimulationContext,
  avg_score: number | undefined,
  competencies: string[],
): string {
  const flowLabel =
    ctx.flow === "CLINICAL_CASE"
      ? "Discussão de Caso Clínico"
      : "Redução de Danos / Abordagem de Rua";

  return [
    `# Relatório de Simulação — ${flowLabel}`,
    ``,
    `**Cenário:** \`${ctx.scenario_id}\`  `,
    `**Simulation ID:** \`${ctx.simulation_id}\`  `,
    `**Clínica:** \`${ctx.clinic_id}\`  `,
    `**Iniciado:** ${ctx.started_at}  `,
    `**Concluído:** ${ctx.completed_at ?? "—"}  `,
    `**Total de Turnos:** ${ctx.turns.length}  `,
    avg_score !== undefined ? `**Score Médio Formativo:** ${avg_score.toFixed(1)}/10  ` : "",
    ``,
    `## Competências Demonstradas`,
    competencies.length > 0
      ? competencies.map((c) => `- ${c}`).join("\n")
      : "_Nenhuma competência avaliada nesta simulação._",
    ``,
    `## Resumo dos Turnos`,
    ctx.turns
      .map(
        (t) =>
          `**[Turno ${t.turn_number}] ${t.agent_role}:** ${t.content.slice(0, 120)}${t.content.length > 120 ? "..." : ""}`,
      )
      .join("\n\n"),
  ]
    .filter(Boolean)
    .join("\n");
}

// ── Export público ────────────────────────────────────────────────────────────

export type { AgentRole, SimulationContext, SimulationResult, SimulationTurn };
