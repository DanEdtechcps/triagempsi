import { describe, expect, it } from "vitest";
import {
  ALL_SCENARIOS,
  CLINICAL_CASE_SCENARIOS,
  HARM_REDUCTION_SCENARIOS,
  createSimulationContext,
  finalizeSimulation,
  getScenarioById,
  getScenariosByFlow,
  processTurn,
  type AgentConfig,
} from "./index";

describe("OpenMAIC Simulation Engine", () => {
  it("carrega todos os 5 cenários clínicos do Dr. Saraiva e 2 de redução de danos", () => {
    expect(CLINICAL_CASE_SCENARIOS.length).toBe(5);
    expect(HARM_REDUCTION_SCENARIOS.length).toBe(2);
    expect(ALL_SCENARIOS.length).toBe(7);

    const ekbom = getScenarioById("cc-002-ekbom-cocaina");
    expect(String(ekbom?.seed_data.source_reference).toUpperCase()).toContain("SARAIVA JUNIOR");

    const crack = getScenarioById("hr-001-abordagem-crack-rua");
    expect(crack).toBeDefined();
    expect(crack?.flow).toBe("HARM_REDUCTION");
  });

  it("filtra cenários por fluxo corretamente", () => {
    const clinical = getScenariosByFlow("CLINICAL_CASE");
    expect(clinical.length).toBe(5);
    const harm = getScenariosByFlow("HARM_REDUCTION");
    expect(harm.length).toBe(2);
  });

  it("cria contexto de simulação com validação de papéis obrigatórios", () => {
    const scenario = CLINICAL_CASE_SCENARIOS[0]; // Bipolaridade (preceptor, resident, patient)
    const agents: AgentConfig[] = [
      { id: "a1", role: "preceptor", display_name: "Dr. Preceptor", system_prompt: "..." },
      { id: "a2", role: "resident", display_name: "Dra. Residente", system_prompt: "..." },
      { id: "a3", role: "patient", display_name: "Paciente Simulada", system_prompt: "..." },
    ];

    const ctx = createSimulationContext(scenario, agents, "clinic-saraiva-01");
    expect(ctx.status).toBe("pending");
    expect(ctx.clinic_id).toBe("clinic-saraiva-01");
    expect(ctx.scenario_id).toBe(scenario.id);
  });

  it("bloqueia criação se faltar papel de agente obrigatório", () => {
    const scenario = CLINICAL_CASE_SCENARIOS[0];
    const incompleteAgents: AgentConfig[] = [
      { id: "a1", role: "preceptor", display_name: "Dr. Preceptor", system_prompt: "..." },
    ];

    expect(() => createSimulationContext(scenario, incompleteAgents, "clinic-saraiva-01")).toThrow(
      /Agentes obrigatórios ausentes/,
    );
  });

  it("executa turnos e aplica regras éticas (bloqueio de CPF/PII)", () => {
    const scenario = CLINICAL_CASE_SCENARIOS[0];
    const agents: AgentConfig[] = [
      { id: "a1", role: "preceptor", display_name: "Dr. Preceptor", system_prompt: "..." },
      { id: "a2", role: "resident", display_name: "Dra. Residente", system_prompt: "..." },
      { id: "a3", role: "patient", display_name: "Paciente Simulada", system_prompt: "..." },
    ];

    const ctx = createSimulationContext(scenario, agents, "clinic-saraiva-01");

    // Turno válido
    const res1 = processTurn(ctx, "a1", "Bom dia a todos, vamos discutir o caso de hoje.");
    expect(res1.is_blocked).toBe(false);
    expect(ctx.turns.length).toBe(1);

    // Turno com PII (CPF) -> Deve ser bloqueado
    const res2 = processTurn(ctx, "a3", "Meu CPF é 123.456.789-00, doutor.");
    expect(res2.is_blocked).toBe(true);
    expect(res2.rule_violations[0]).toContain("CPF detectado");
    expect(ctx.turns.length).toBe(1); // Não adicionado
  });

  it("bloqueia linguagem estigmatizante no fluxo de redução de danos", () => {
    const scenario = HARM_REDUCTION_SCENARIOS[0];
    const agents: AgentConfig[] = [
      { id: "c1", role: "counselor", display_name: "Conselheiro", system_prompt: "..." },
      { id: "s1", role: "supervisor", display_name: "Supervisor", system_prompt: "..." },
      { id: "p1", role: "street_person", display_name: "Pessoa Atendida", system_prompt: "..." },
    ];

    const ctx = createSimulationContext(scenario, agents, "clinic-caminhos-01");
    const blockedRes = processTurn(ctx, "c1", "Aquele viciado não quis atendimento.");
    expect(blockedRes.is_blocked).toBe(true);
    expect(blockedRes.rule_violations[0]).toContain("Linguagem estigmatizante detectada");
  });

  it("finaliza simulação e gera resumo estruturado em Markdown", () => {
    const scenario = CLINICAL_CASE_SCENARIOS[0];
    const agents: AgentConfig[] = [
      { id: "a1", role: "preceptor", display_name: "Dr. Preceptor", system_prompt: "..." },
      { id: "a2", role: "resident", display_name: "Dra. Residente", system_prompt: "..." },
      { id: "a3", role: "patient", display_name: "Paciente Simulada", system_prompt: "..." },
    ];

    const ctx = createSimulationContext(scenario, agents, "clinic-saraiva-01");
    processTurn(ctx, "a1", "Apresente o caso da paciente, colega.");
    processTurn(ctx, "a2", "Mulher de 22 anos com humor eufórico há 10 dias e redução de sono.");

    const result = finalizeSimulation(ctx);
    expect(result.total_turns).toBe(2);
    expect(result.summary_md).toContain("Relatório de Simulação");
    expect(result.summary_md).toContain("clinic-saraiva-01");
    expect(ctx.status).toBe("completed");
  });
});
