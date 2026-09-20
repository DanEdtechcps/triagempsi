/**
 * scenarios.ts — Cenários pré-configurados de simulação OpenMAIC.
 *
 * Fonte dos casos clínicos CLINICAL_CASE (5 Casos Autorais Dr. Saraiva):
 *   1. Bipolaridade I vs. Hipomania ("Episódio de humor em jovem universitária")
 *   2. Síndrome de Ekbom por Cocaína ("Infestação que ninguém mais vê" — Saraiva Jr et al., 2015)
 *   3. Alcoolismo Geriátrico ("O uísque das seis da tarde" — Saraiva Jr & Diehl, 2014)
 *   4. Desmame de Benzodiazepínicos ("A receita renovada há doze anos" — Saraiva Jr & Diehl, 2014)
 *   5. Delirium Tremens na Internação ("O senhor que ninguém perguntou")
 *
 * Fonte dos casos HARM_REDUCTION (Caminhos Campinas / caminhos-cps.social):
 *   1. Abordagem de Redução de Danos para Crack na Rua
 *   2. Desescalada em Crise por Álcool no SUAS/CRAS
 */

import type { ScenarioConfig } from "./types";

// ── FLUXO A: Casos Clínicos Autorais do Dr. Saraiva (Corte 800 / CENE) ──────

export const CLINICAL_CASE_SCENARIOS: ScenarioConfig[] = [
  {
    id: "cc-001-bipolaridade-jovem",
    flow: "CLINICAL_CASE",
    title: "Episódio de humor em jovem universitária (Mania vs. Hipomania)",
    description:
      "Mulher de 22 anos trazida pela mãe. Dorme 3 horas por noite sem cansaço há 10 dias, " +
      "projetos múltiplos simultâneos, taquipsiquismo e gastos impulsivos. Episódio depressivo prévio há 2 anos.",
    agent_roles: ["preceptor", "resident", "patient"],
    max_turns: 20,
    seed_data: {
      patient_age: 22,
      patient_sex: "F",
      source_reference: "Autoral Dr. José Saraiva Junior · Corte 800",
      chief_complaint: "Dorme 3h/noite sem cansaço há 10 dias, gastos impulsivos que 'vão virar negócio'",
      past_history: "Episódio depressivo prévio (tristeza, hipersonia, anedonia por 3 meses) há 2 anos",
      key_diagnostics: "Transtorno Bipolar Tipo I, episódio maníaco atual",
      differential_rationale: "Prejuízo funcional grave com repercussão financeira diferencia mania de hipomania",
      pharmacotherapy: "Estabilizador do humor (Lítio) em monoterapia. Contraindicado ISRS isolado (risco de virada e ciclagem rápida)",
      learning_objectives: [
        "Identificar critérios DSM-5 para episódio maníaco",
        "Diferenciar mania de hipomania com base em gravidade e impacto funcional",
        "Prescrever estabilizador do humor de 1ª linha e evitar antidepressivo em monoterapia"
      ]
    }
  },
  {
    id: "cc-002-ekbom-cocaina",
    flow: "CLINICAL_CASE",
    title: "Infestação que ninguém mais vê (Síndrome de Ekbom induzida por Cocaína)",
    description:
      "Homem de 41 anos com escoriações lineares e convicção de 'bichinhos sob a pele', trazendo pote com fragmentos de pele. " +
      "Uso diário de cocaína aspirada há semanas. Baseado no trabalho científico de Saraiva Junior et al. (2015).",
    agent_roles: ["preceptor", "specialist", "patient"],
    max_turns: 20,
    seed_data: {
      patient_age: 41,
      patient_sex: "M",
      source_reference: "SARAIVA JUNIOR, J.R.F.; MARCON, G.; REAL, A.G. Síndrome de Ekbom Induzida por Cocaína (2015)",
      chief_complaint: "Convicção de infestação parasitária subcutânea, trazendo fragmentos em pote ('sinal do pote')",
      physical_exam: "Escoriações secundárias nos antebraços e couro cabeludo; sem lesão dermatológica primária",
      key_diagnostics: "Delírio de infestação (Síndrome de Ekbom) secundário ao uso de estimulante",
      clinical_conduct: "Suspensão do estimulante, antipsicótico em dose baixa e manejo acolhedor SEM confrontação direta do delírio",
      learning_objectives: [
        "Reconhecer a Síndrome de Ekbom secundária à formicação induzida por estimulantes",
        "Evitar confronto direto com o delírio para preservar a aliança terapêutica",
        "Articular conduta conjunta entre psiquiatria e dermatologia"
      ]
    }
  },
  {
    id: "cc-003-alcool-idoso",
    flow: "CLINICAL_CASE",
    title: "O uísque das seis da tarde (Uso Problemático de Álcool no Idoso)",
    description:
      "Homem de 72 anos aposentado com quedas repetidas, esquecimentos e garrafas escondidas. " +
      "Nega problema com álcool ('só uma dose de sempre'). Baseado em Saraiva Junior & Diehl (Ed. Berthier, 2014).",
    agent_roles: ["preceptor", "resident", "patient"],
    max_turns: 20,
    seed_data: {
      patient_age: 72,
      patient_sex: "M",
      source_reference: "SARAIVA JUNIOR, J.R.F.; DIEHL, A.A. Utilização de substâncias psicoativas em idosos (Ed. Berthier, 2014)",
      chief_complaint: "Quedas repetidas, esquecimentos e irritabilidade; viúvo recente; parou caminhadas",
      pharmacokinetics: "Menor água corporal, metabolismo hepático lento e polifarmácia amplificam a mesma dose de décadas",
      screening_tool: "AUDIT-C adaptado para idosos, aplicado na consulta sem postura acusatória",
      clinical_conduct: "Intervenção breve motivacional (FRAMES), revisão da polifarmácia e reinserção social",
      learning_objectives: [
        "Compreender a vulnerabilidade farmacocinética do idoso ao álcool",
        "Aplicar rastreio AUDIT-C sem confrontação",
        "Identificar o luto e isolamento como mantenedores do consumo"
      ]
    }
  },
  {
    id: "cc-004-desmame-bzd-idoso",
    flow: "CLINICAL_CASE",
    title: "A receita renovada há doze anos (Desmame de Benzodiazepínicos em Idosos)",
    description:
      "Mulher de 76 anos em uso contínuo de benzodiazepínico há 12 anos para dormir. " +
      "Sonolência diurna, queda no banheiro, lapsos de memória e abstinência severa ao tentar parar sozinha. (Saraiva Jr & Diehl, 2014).",
    agent_roles: ["preceptor", "specialist", "patient"],
    max_turns: 22,
    seed_data: {
      patient_age: 76,
      patient_sex: "F",
      source_reference: "SARAIVA JUNIOR, J.R.F.; DIEHL, A.A. Adicções em Idosos (Ed. Berthier, 2014)",
      chief_complaint: "Uso de BZD há 12 anos; mal-estar intenso na interrupção abrupta (dependência fisiológica iatrogênica)",
      risks: "Quedas com fratura de fêmur, sedação diurna e declínio cognitivo mimetizando demência",
      tapering_protocol: "Desmame gradual programado (10-25% a cada 1-2 semanas) com suporte de TCC-I e higiene do sono",
      interdisciplinary_team: "Prescritor, enfermagem, farmacêutico e família orientada",
      learning_objectives: [
        "Diagnosticar dependência iatrogênica de benzodiazepínicos no idoso",
        "Executar protocolo de desmame gradual seguro sem interrupção abrupta",
        "Implementar intervenções não farmacológicas para o sono (TCC-I)"
      ]
    }
  },
  {
    id: "cc-005-delirium-tremens",
    flow: "CLINICAL_CASE",
    title: "O senhor que ninguém perguntou (Delirium Tremens na Internação Hospitalar)",
    description:
      "Homem de 68 anos internado por pneumonia que desenvolve tremores, sudorese, agitação e alucinações visuais (zoopsias) no 3º dia. " +
      "Omissão da história de consumo de álcool na admissão.",
    agent_roles: ["preceptor", "resident", "observer"],
    max_turns: 20,
    seed_data: {
      patient_age: 68,
      patient_sex: "M",
      source_reference: "Autoral Dr. José Saraiva Junior · Protocolo de Emergências Hospitalares",
      chief_complaint: "Agitação psicomotora, tremores e alucinações visuais no 3º dia de internação clínica",
      key_diagnostics: "Delirium Tremens (abstinência alcoólica grave em 48-96h) — emergência com alta mortalidade",
      emergency_protocol: "Benzodiazepínico em esquema protocolado (Diazepam/Lorazepam), Tiamina parenteral precoce (prevenção de Wernicke) e suporte hidroeletrolítico",
      systemic_prevention: "Rastreio obrigatório do consumo de álcool na admissão de todo paciente hospitalizado",
      learning_objectives: [
        "Reconhecer Delirium Tremens precocemente em enfermarias clínicas",
        "Instituir protocolo de sedação e reposição de tiamina antes da glicose",
        "Superar o etarismo no rastreio sistemático de substâncias na admissão"
      ]
    }
  }
];

// ── FLUXO B: Redução de Danos & Abordagem de Rua (Caminhos Campinas) ────────

export const HARM_REDUCTION_SCENARIOS: ScenarioConfig[] = [
  {
    id: "hr-001-abordagem-crack-rua",
    flow: "HARM_REDUCTION",
    title: "Primeira Abordagem — Pessoa em Uso de Crack em Situação de Rua",
    description:
      "Persona de ~40 anos em situação de rua há 2 anos, uso de crack, desconfiança da rede institucional. " +
      "Treino de desescalada, vínculo e redução de danos sem exigência prévia de abstinência (caminhos-cps.social).",
    agent_roles: ["counselor", "supervisor", "street_person"],
    max_turns: 18,
    seed_data: {
      persona_age_approx: 40,
      substance: "crack",
      time_on_street_years: 2,
      trust_level: "low",
      learning_objectives: [
        "Abordagem sem julgamento moral e sem impor abstinência como condição de atendimento",
        "Aplicação de escuta ativa, validação e acolhimento de demandas imediatas (água, alimentação, curativos)",
        "Oferta de insumos de redução de danos (piteiras, protetor labial, água potável)",
        "Pactuação de plano de cuidado compartilhado no CAPS-AD e Centro Pop"
      ],
      ethical_guardrails: [
        "Nunca romantizar nem criminalizar o uso de substâncias",
        "Respeitar o protagonismo e o tempo da pessoa atendida",
        "Garantir sigilo e proteção contra violência institucional"
      ]
    }
  },
  {
    id: "hr-002-desescalada-crise-alcool",
    flow: "HARM_REDUCTION",
    title: "Desescalada em Crise por Álcool — Equipe SUAS / CRAS",
    description:
      "Mulher de ~35 anos em sofrimento e intoxicação etílica moderada no atendimento social. " +
      "Manejo de crise verbal, prevenção de violência e integração intersetorial SUS/SUAS.",
    agent_roles: ["counselor", "supervisor", "street_person", "observer"],
    max_turns: 16,
    seed_data: {
      persona_age_approx: 35,
      substance: "álcool",
      setting: "Unidade de Assistência Social (CRAS)",
      learning_objectives: [
        "Técnicas de desescalada verbal em ambiente social",
        "Identificação de sinais de abstinência grave vs. intoxicação aguda",
        "Articulação intersetorial entre SUAS, Atenção Básica e CAPS-AD",
        "Construção de projeto terapêutico singular (PTS)"
      ]
    }
  }
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
