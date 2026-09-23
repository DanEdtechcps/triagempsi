/**
 * types.ts — Tipos centrais da DSL OpenMAIC para o TriagemPsi.
 *
 * Baseado na especificação de agentes multi-papel do OpenMAIC (THU-MAIC/OpenMAIC).
 * Adaptado para dois fluxos clínicos:
 *   - CLINICAL_CASE: Discussão de casos, preceptoria e anamnese (Corte800/CENE)
 *   - HARM_REDUCTION: Roleplay de redução de danos e abordagem de rua (Caminhos)
 */

// ── Identificadores de Agentes ─────────────────────────────────────────────────

export type AgentRole =
  // Fluxo Clínico
  | "preceptor" // Médico preceptor — dirige a discussão de caso
  | "specialist" // Especialista convidado (ex: psiquiatra, clínico geral)
  | "resident" // Residente / aluno em formação
  | "patient" // Simulacro de paciente (anamnese, história clínica)
  // Fluxo de Redução de Danos
  | "counselor" // Conselheiro / redutor de danos
  | "supervisor" // Supervisor da equipe SUS/SUAS
  | "street_person" // Persona de pessoa em situação de rua / uso de substâncias
  | "observer"; // Observador silencioso (avaliação formativa)

export type SimulationFlow = "CLINICAL_CASE" | "HARM_REDUCTION";

// ── DSL de Agente ─────────────────────────────────────────────────────────────

export interface AgentConfig {
  id: string;
  role: AgentRole;
  /** Nome de display usado na UI e nos logs da simulação */
  display_name: string;
  /** Prompt de sistema que define a persona e as restrições éticas deste agente */
  system_prompt: string;
  /** Temperatura do LLM (0 = determinístico, 1 = criativo) */
  temperature?: number;
  /** Se true, as respostas deste agente são avaliadas formalmente */
  is_evaluated?: boolean;
}

// ── Regras da Simulação ───────────────────────────────────────────────────────

export interface SimulationRule {
  id: string;
  description: string;
  /** Função de verificação — retorna null se ok, ou mensagem de violação */
  check: (turn: SimulationTurn, context: SimulationContext) => string | null;
}

// ── Turno de Diálogo ──────────────────────────────────────────────────────────

export interface SimulationTurn {
  turn_number: number;
  agent_id: string;
  agent_role: AgentRole;
  content: string;
  timestamp: string;
  /** Metadados de avaliação formativa (preenchido pelo observer) */
  evaluation?: {
    score: number; // 0–10
    feedback: string;
    competencies: string[];
  };
}

// ── Contexto da Simulação ─────────────────────────────────────────────────────

export interface SimulationContext {
  simulation_id: string;
  flow: SimulationFlow;
  clinic_id: string;
  /** Identificador do caso clínico ou cenário de rua */
  scenario_id: string;
  agents: AgentConfig[];
  rules: SimulationRule[];
  turns: SimulationTurn[];
  status: "pending" | "running" | "paused" | "completed" | "error";
  started_at: string;
  completed_at?: string;
  /** Metadados do cenário (caso clínico, diagnóstico, substâncias, etc.) */
  scenario_meta: Record<string, unknown>;
}

// ── Config de Cenário ─────────────────────────────────────────────────────────

export interface ScenarioConfig {
  id: string;
  flow: SimulationFlow;
  title: string;
  description: string;
  /** Agentes pré-configurados para este cenário */
  agent_roles: AgentRole[];
  /** Dados clínicos/situacionais do cenário (sem PII real) */
  seed_data: Record<string, unknown>;
  /** Máximo de turnos antes de encerrar automaticamente */
  max_turns?: number;
}

// ── Resultado Final ───────────────────────────────────────────────────────────

export interface SimulationResult {
  simulation_id: string;
  flow: SimulationFlow;
  scenario_id: string;
  total_turns: number;
  evaluated_turns: SimulationTurn[];
  /** Score médio ponderado das avaliações formativas */
  aggregate_score?: number;
  /** Competências demonstradas ao longo da simulação */
  competencies_achieved: string[];
  summary_md: string;
}
