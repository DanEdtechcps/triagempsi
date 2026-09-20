/**
 * scenarios.ts — Cenários pré-configurados de simulação OpenMAIC.
 *
 * Fluxo A — CLINICAL_CASE (Corte800 / CENE):
 *   Simulações de anamnese, rounds médicos e discussão de condutas.
 *
 * Fluxo B — HARM_REDUCTION (Caminhos Campinas — caminhos-cps.social):
 *   Simulações de desescalada e escuta humanizada para equipes SUS/SUAS.
 *
 * IMPORTANTE: Nenhum dado real de paciente aqui. Apenas personas fictícias
 * com fins exclusivamente pedagógicos.
 */

import type { ScenarioConfig } from "./types";

// ── FLUXO A: Discussão de Caso Clínico / Preceptoria ─────────────────────────

export const CLINICAL_CASE_SCENARIOS: ScenarioConfig[] = [
  {
    id: "cc-001-depressao-maior-idoso",
    flow: "CLINICAL_CASE",
    title: "Depressão Maior em Idoso com Polimedicação",
    description:
      "Paciente fictício de 72 anos, masculino, com queixa de tristeza, anedonia e insônia " +
      "há 4 meses. Polimedicado (anti-hipertensivo, estatina, metformina). Caso focado em " +
      "diagnóstico diferencial, triagem com GDS-15 e conduta medicamentosa segura.",
    agent_roles: ["preceptor", "resident", "patient"],
    max_turns: 20,
    seed_data: {
      patient_age: 72,
      patient_sex: "M",
      chief_complaint: "tristeza e falta de interesse há 4 meses",
      current_medications: ["metformina 500mg", "losartana 50mg", "atorvastatina 20mg"],
      scales_to_apply: ["GDS-15", "PHQ-2"],
      learning_objectives: [
        "Reconhecer apresentação atípica de depressão no idoso",
        "Aplicar GDS-15 com técnica adequada de rapport",
        "Identificar interações medicamentosas relevantes",
        "Diferenciar depressão de quadro demencial incipiente (AD-8)",
      ],
    },
  },
  {
    id: "cc-002-transtorno-panico-jovem",
    flow: "CLINICAL_CASE",
    title: "Transtorno do Pânico em Adulto Jovem — Abordagem TCC",
    description:
      "Paciente fictício de 28 anos com crises de pânico recorrentes há 6 meses, " +
      "evitação agorafóbica incipiente. Caso focado em psicoeducação, triagem com " +
      "SRQ-20 e plano de tratamento TCC + farmacológico.",
    agent_roles: ["preceptor", "specialist", "resident"],
    max_turns: 18,
    seed_data: {
      patient_age: 28,
      patient_sex: "F",
      chief_complaint: "crises de sufocamento e taquicardia com medo de morrer",
      scales_to_apply: ["SRQ-20", "PHQ-2"],
      learning_objectives: [
        "Distinguir pânico de síndrome coronariana aguda",
        "Apresentar modelo cognitivo do pânico ao residente",
        "Planejar combinação ISRS + TCC com critérios de resposta",
      ],
    },
  },
  {
    id: "cc-003-risco-suicidio-adolescente",
    flow: "CLINICAL_CASE",
    title: "Avaliação de Risco de Suicídio em Adolescente",
    description:
      "Paciente fictício de 16 anos, referenciado pela escola após relatos de " +
      "automutilação. Caso de alta complexidade — avaliação C-SSRS, plano de " +
      "segurança e comunicação com responsáveis.",
    agent_roles: ["preceptor", "specialist", "patient", "observer"],
    max_turns: 25,
    seed_data: {
      patient_age: 16,
      patient_sex: "F",
      chief_complaint: "tristeza persistente e arranhões no braço",
      scales_to_apply: ["C-SSRS", "PHQ-9"],
      learning_objectives: [
        "Aplicar C-SSRS com abordagem não-estigmatizante",
        "Diferenciar ideação passiva de planejamento ativo",
        "Elaborar plano de segurança com paciente e família",
        "Documentar corretamente o risco (prontuário / notificação)",
      ],
      alert_triggers: ["C-SSRS >= 3", "PHQ-9 item 9 >= 1"],
    },
  },
];

// ── FLUXO B: Redução de Danos / Abordagem de Rua ────────────────────────────

export const HARM_REDUCTION_SCENARIOS: ScenarioConfig[] = [
  {
    id: "hr-001-abordagem-crack-rua",
    flow: "HARM_REDUCTION",
    title: "Primeira Abordagem — Usuário de Crack em Situação de Rua",
    description:
      "Persona fictícia de homem de ~40 anos em situação de rua há 2 anos, " +
      "uso pesado de crack, desconfiante da equipe. Treino de desescalada, " +
      "escuta ativa e oferta de redução de danos sem imposição de abstinência.",
    agent_roles: ["counselor", "supervisor", "street_person"],
    max_turns: 15,
    seed_data: {
      persona_age_approx: 40,
      substance: "crack",
      time_on_street_years: 2,
      trust_level: "low",
      learning_objectives: [
        "Abordagem sem julgamento e sem imposição de metas",
        "Técnicas de escuta reflexiva e validação emocional",
        "Oferta de insumos de redução de danos (cachimbo higiênico, água)",
        "Mapeamento de vínculos afetivos e motivação para mudança",
        "Reconhecimento de sinais de crise aguda e protocolo de encaminhamento CAPS-AD",
      ],
      ethical_guardrails: [
        "Nunca romantizar uso de substâncias",
        "Nunca prometer resultados não garantíveis",
        "Respeitar autonomia — oferecer, não impor",
      ],
    },
  },
  {
    id: "hr-002-desescalada-crise-alcool",
    flow: "HARM_REDUCTION",
    title: "Desescalada em Crise por Álcool — SUAS / CRAS",
    description:
      "Persona fictícia de mulher de ~35 anos em crise etílica moderada, " +
      "acompanhada de filha. Cenário de abordagem no CRAS com suporte emocional, " +
      "triagem AUDIT e referenciamento para CAPS-AD.",
    agent_roles: ["counselor", "supervisor", "street_person", "observer"],
    max_turns: 15,
    seed_data: {
      persona_age_approx: 35,
      substance: "alcohol",
      setting: "CRAS",
      family_present: true,
      scales_to_apply: ["AUDIT"],
      learning_objectives: [
        "Gestão emocional do profissional em situação de pressão",
        "Avaliação rápida de segurança (criança presente)",
        "Aplicação simplificada do AUDIT em crise",
        "Encaminhamento humanizado para CAPS-AD",
      ],
    },
  },
];

// ── Index combinado ────────────────────────────────────────────────────────────

export const ALL_SCENARIOS: ScenarioConfig[] = [
  ...CLINICAL_CASE_SCENARIOS,
  ...HARM_REDUCTION_SCENARIOS,
];

export function getScenarioById(id: string): ScenarioConfig | undefined {
  return ALL_SCENARIOS.find((s) => s.id === id);
}

export function getScenariosByFlow(flow: ScenarioConfig["flow"]): ScenarioConfig[] {
  return ALL_SCENARIOS.filter((s) => s.flow === flow);
}
