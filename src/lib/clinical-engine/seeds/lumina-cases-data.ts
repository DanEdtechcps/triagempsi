/**
 * Banco Sintético Homologado de Casos Clínicos do Instituto Lumina.
 * 10 perfis com alta densidade de dados, relatos em texto livre, telemetria
 * psicométrica de tempo de resposta por item (response_time_ms) e detecção de hesitação.
 */

export interface ItemTelemetry {
  item_id: string;
  response_time_ms: number;
  value: number;
}

export interface SyntheticClinicalCase {
  id: string;
  patient_name: string;
  patient_email: string;
  age: number;
  sex: "masculino" | "feminino" | "outro";
  informant_type: "paciente" | "familiar";
  informant_name?: string;
  informant_relation?: string;
  free_text_complaint: string;
  symptoms: string[];
  scale_answers: Record<string, Record<string, number>>;
  item_telemetry: Record<string, ItemTelemetry[]>;
  average_item_time_ms: number;
  hesitation_detected: boolean;
  hesitation_details?: {
    scale_code: string;
    item_id: string;
    response_time_ms: number;
    reason: string;
  };
  expected_scales: string[];
  expected_safety_plan: boolean;
  bipolar_risk_flag?: boolean;
  clinical_summary: string;
}

export const LUMINA_CLINICAL_CASES: SyntheticClinicalCase[] = [
  // --------------------------------------------------------------------------
  // CASO 1: Lucas (34a) — TDAH do Adulto e Caos Cotidiano
  // --------------------------------------------------------------------------
  {
    id: "lumina-case-01-lucas",
    patient_name: "Lucas Mendes Silveira",
    patient_email: "lucas.mendes@exemplo.com",
    age: 34,
    sex: "masculino",
    informant_type: "paciente",
    free_text_complaint:
      "Começo 15 coisas e não termino nenhuma. Perdi minha carteira duas vezes esta semana. Minha cabeça parece um rádio com 4 estações tocando ao mesmo tempo.",
    symptoms: ["atencao"],
    scale_answers: {
      "ASRS-18": {
        "1": 3,
        "2": 3,
        "3": 3,
        "4": 2,
        "5": 3,
        "6": 2,
        "7": 3,
        "8": 2,
        "9": 3,
        "10": 2,
        "11": 3,
        "12": 2,
        "13": 2,
        "14": 2,
        "15": 2,
        "16": 3,
        "17": 2,
        "18": 2,
      },
    },
    item_telemetry: {
      "ASRS-18": Array.from({ length: 18 }, (_, i) => ({
        item_id: String(i + 1),
        response_time_ms: 1150 + (i % 3) * 50,
        value: 2 + (i % 2),
      })),
    },
    average_item_time_ms: 1200,
    hesitation_detected: false,
    expected_scales: ["ASRS-18"],
    expected_safety_plan: false,
    clinical_summary:
      "Sintomas consistentes com TDAH no adulto. EPDS estritamente bloqueada pela condição biológica masculina.",
  },

  // --------------------------------------------------------------------------
  // CASO 2: Beatriz (29a) — Pós-Parto, Culpa e Risco de Crise
  // --------------------------------------------------------------------------
  {
    id: "lumina-case-02-beatriz",
    patient_name: "Beatriz Helena Ramos",
    patient_email: "beatriz.ramos@exemplo.com",
    age: 29,
    sex: "feminino",
    informant_type: "paciente",
    free_text_complaint:
      "Olho para o meu bebê de 2 meses e me sinto uma farsa. Choro no banho para ninguém ver. Às vezes penso que seria um alívio se um caminhão me atropelasse...",
    symptoms: ["perinatal", "tristeza", "morte"],
    scale_answers: {
      EPDS: {
        "1": 2,
        "2": 2,
        "3": 3,
        "4": 2,
        "5": 2,
        "6": 2,
        "7": 2,
        "8": 2,
        "9": 2,
        "10": 1, // Item 10 de autoagressão
      },
      "PHQ-9": {
        "1": 3,
        "2": 3,
        "3": 2,
        "4": 2,
        "5": 2,
        "6": 3,
        "7": 2,
        "8": 2,
        "9": 3, // Item 9 ideação suicida grave
      },
      "C-SSRS": {
        "1": 1,
        "2": 1,
        "3": 1,
        "4": 0,
        "5": 0,
        "6": 0,
      },
    },
    item_telemetry: {
      EPDS: Array.from({ length: 10 }, (_, i) => ({
        item_id: String(i + 1),
        response_time_ms: i === 9 ? 12000 : 2100,
        value: 2,
      })),
      "PHQ-9": Array.from({ length: 9 }, (_, i) => ({
        item_id: String(i + 1),
        response_time_ms: i === 8 ? 14500 : 1800, // Hesitação marcante no item 9
        value: i === 8 ? 3 : 2,
      })),
    },
    average_item_time_ms: 3200,
    hesitation_detected: true,
    hesitation_details: {
      scale_code: "PHQ-9",
      item_id: "9",
      response_time_ms: 14500,
      reason: "Hesitação extrema (>14s) na resposta de ideação suicida e término da vida",
    },
    expected_scales: ["EPDS", "PHQ-9", "C-SSRS"],
    expected_safety_plan: true,
    clinical_summary:
      "Rastreio positivo para Depressão Perinatal (EPDS 19). Ideação de morte declarada; Plano de Segurança ativado com prioridade máxima.",
  },

  // --------------------------------------------------------------------------
  // CASO 3: Rodrigo (44a) — Rituais e Compulsões (TOC)
  // --------------------------------------------------------------------------
  {
    id: "lumina-case-03-rodrigo",
    patient_name: "Rodrigo Farias Albuquerque",
    patient_email: "rodrigo.albuquerque@exemplo.com",
    age: 44,
    sex: "masculino",
    informant_type: "paciente",
    free_text_complaint:
      "Preciso checar se o fogão está desligado exatamente 7 vezes. Se eu não fizer a sequência de toques na maçaneta, sinto que algo terrível vai acontecer com meus filhos.",
    symptoms: ["obsessivo"],
    scale_answers: {
      "OCI-R": {
        "1": 3,
        "2": 3,
        "3": 2,
        "4": 3,
        "5": 2,
        "6": 3,
        "7": 3,
        "8": 2,
        "9": 3,
        "10": 2,
        "11": 2,
        "12": 2,
      },
    },
    item_telemetry: {
      "OCI-R": Array.from({ length: 12 }, (_, i) => ({
        item_id: String(i + 1),
        response_time_ms: 2200,
        value: 2 + (i % 2),
      })),
    },
    average_item_time_ms: 2200,
    hesitation_detected: false,
    expected_scales: ["OCI-R"],
    expected_safety_plan: false,
    clinical_summary:
      "Sintomatologia obsessivo-compulsiva severa de checagem e contaminação mágica.",
  },

  // --------------------------------------------------------------------------
  // CASO 4: Gabriel (26a) — Insônia e Ruminação Ansiosa
  // --------------------------------------------------------------------------
  {
    id: "lumina-case-04-gabriel",
    patient_name: "Gabriel Santos Viana",
    patient_email: "gabriel.viana@exemplo.com",
    age: 26,
    sex: "masculino",
    informant_type: "paciente",
    free_text_complaint:
      "Deito às 23h e fico moendo tudo o que fiz de errado desde 2018. Meu cérebro não desacelera. Chego no trabalho parecendo um zumbi.",
    symptoms: ["sono", "ansiedade"],
    scale_answers: {
      ISI: {
        "1": 3,
        "2": 3,
        "3": 3,
        "4": 3,
        "5": 3,
        "6": 3,
        "7": 3,
      },
      "GAD-7": {
        "1": 2,
        "2": 2,
        "3": 2,
        "4": 2,
        "5": 2,
        "6": 2,
        "7": 2,
      },
    },
    item_telemetry: {
      ISI: Array.from({ length: 7 }, (_, i) => ({
        item_id: String(i + 1),
        response_time_ms: 1400,
        value: 3,
      })),
    },
    average_item_time_ms: 1400,
    hesitation_detected: false,
    expected_scales: ["ISI", "GAD-7"],
    expected_safety_plan: false,
    clinical_summary:
      "Insônia clínica grave (ISI 21) associada a transtorno de ansiedade moderado.",
  },

  // --------------------------------------------------------------------------
  // CASO 5: Geraldo (71a) — Queixa Cognitiva e Isolamento (Geriatria)
  // --------------------------------------------------------------------------
  {
    id: "lumina-case-05-geraldo",
    patient_name: "Geraldo Prado Guimarães",
    patient_email: "marcelo.guimaraes.filho@exemplo.com",
    age: 71,
    sex: "masculino",
    informant_type: "familiar",
    informant_name: "Marcelo Prado Guimarães",
    informant_relation: "Filho",
    free_text_complaint:
      "Meu pai começou a esquecer onde guardou os documentos, confunde os nomes das netas e ficou muito quieto nos últimos meses.",
    symptoms: ["memoria", "tristeza"],
    scale_answers: {
      "AD-8": {
        "1": 1,
        "2": 1,
        "3": 1,
        "4": 1,
        "5": 0,
        "6": 1,
        "7": 0,
        "8": 1,
      },
      "GDS-15": {
        "1": 1,
        "2": 1,
        "3": 1,
        "4": 1,
        "5": 0,
        "6": 1,
        "7": 0,
        "8": 1,
      },
    },
    item_telemetry: {
      "AD-8": Array.from({ length: 8 }, (_, i) => ({
        item_id: String(i + 1),
        response_time_ms: 2400,
        value: 1,
      })),
    },
    average_item_time_ms: 2400,
    hesitation_detected: false,
    expected_scales: ["AD-8", "GDS-15"],
    expected_safety_plan: false,
    clinical_summary:
      "Hetero-relato do filho indicando declínio cognitivo relevante (AD-8 positivo) e sintomas depressivos geriátricos associados.",
  },

  // --------------------------------------------------------------------------
  // CASO 6: Roberto (45a) — Caso Limítrofe / Cansaço Leve (PHQ-2 Negativo)
  // --------------------------------------------------------------------------
  {
    id: "lumina-case-06-roberto",
    patient_name: "Roberto Campos Penteado",
    patient_email: "roberto.campos@exemplo.com",
    age: 45,
    sex: "masculino",
    informant_type: "paciente",
    free_text_complaint:
      "Sinto uma preguiça no final da tarde de terça-feira. Mas no fim de semana nado e brinco com meus cachorros normalmente.",
    symptoms: ["tristeza"],
    scale_answers: {
      "PHQ-2": {
        "1": 1, // Vários dias
        "2": 1, // Vários dias
      },
    },
    item_telemetry: {
      "PHQ-2": [
        { item_id: "1", response_time_ms: 950, value: 1 },
        { item_id: "2", response_time_ms: 1100, value: 1 },
      ],
    },
    average_item_time_ms: 1025,
    hesitation_detected: false,
    expected_scales: ["PHQ-2"],
    expected_safety_plan: false,
    clinical_summary:
      "Screener de humor com escore 2 (< corte 3). Comprova a não-expansão indevida para o PHQ-9.",
  },

  // --------------------------------------------------------------------------
  // CASO 7: Vanessa (35a) — Espectro Bipolar e Alerta de Risco de Virada
  // --------------------------------------------------------------------------
  {
    id: "lumina-case-07-vanessa",
    patient_name: "Vanessa Toledo Bittencourt",
    patient_email: "vanessa.toledo@exemplo.com",
    age: 35,
    sex: "feminino",
    informant_type: "paciente",
    free_text_complaint:
      "Esta semana estou arrasada. Mas mês passado fiquei 5 dias sem dormir, comprei dois carros e me sentia iluminada por uma energia divina.",
    symptoms: ["tristeza", "oscilacao"],
    scale_answers: {
      "PHQ-9": {
        "1": 3,
        "2": 3,
        "3": 2,
        "4": 2,
        "5": 2,
        "6": 2,
        "7": 2,
        "8": 2,
        "9": 0,
      },
      MDQ: {
        "1": 1,
        "2": 1,
        "3": 1,
        "4": 1,
        "5": 1,
        "6": 1,
        "7": 1,
        "8": 1,
      },
    },
    item_telemetry: {
      MDQ: Array.from({ length: 8 }, (_, i) => ({
        item_id: String(i + 1),
        response_time_ms: 1300,
        value: 1,
      })),
    },
    average_item_time_ms: 1300,
    hesitation_detected: false,
    bipolar_risk_flag: true,
    expected_scales: ["PHQ-9", "MDQ"],
    expected_safety_plan: false,
    clinical_summary:
      "Depressão moderadamente grave (PHQ-9 18) com MDQ positivo (score 8). Risco crítico de virada maníaca sob monoterapia antidepressiva.",
  },

  // --------------------------------------------------------------------------
  // CASO 8: Fernando (41a) — Burnout e Esgotamento Corporativo
  // --------------------------------------------------------------------------
  {
    id: "lumina-case-08-fernando",
    patient_name: "Fernando Dias Fagundes",
    patient_email: "fernando.dias@exemplo.com",
    age: 41,
    sex: "masculino",
    informant_type: "paciente",
    free_text_complaint:
      "Não suporto mais o som das notificações do Slack. Tenho náuseas antes das reuniões de diretoria, mas nas férias de julho me senti ótimo.",
    symptoms: ["trabalho"],
    scale_answers: {
      "MBI-HSS": {
        "1": 5,
        "2": 5,
        "3": 4,
        "4": 5,
        "5": 4,
      },
      "COPSOQ-BR": {
        "1": 3,
        "2": 3,
        "3": 4,
        "14": 0,
      },
      "PHQ-2": {
        "1": 0,
        "2": 1,
      },
    },
    item_telemetry: {
      "MBI-HSS": Array.from({ length: 5 }, (_, i) => ({
        item_id: String(i + 1),
        response_time_ms: 1500,
        value: 5,
      })),
    },
    average_item_time_ms: 1500,
    hesitation_detected: false,
    expected_scales: ["MBI-HSS", "COPSOQ-BR"],
    expected_safety_plan: false,
    clinical_summary:
      "Esgotamento profissional (Burnout) e sobrecarga ocupacional crônica com preservação de humor fora do contexto laboral.",
  },

  // --------------------------------------------------------------------------
  // CASO 9: Helena (39a) — TEPT e Hipervigilância Pós-Trauma
  // --------------------------------------------------------------------------
  {
    id: "lumina-case-09-helena",
    patient_name: "Helena Castro Peixoto",
    patient_email: "helena.peixoto@exemplo.com",
    age: 39,
    sex: "feminino",
    informant_type: "paciente",
    free_text_complaint:
      "Depois do assalto no sinal, não consigo ouvir uma moto passar sem meu coração disparar. Tenho pesadelos quase todas as noites.",
    symptoms: ["trauma"],
    scale_answers: {
      "PC-PTSD-5": {
        "1": 1,
        "2": 1,
        "3": 1,
        "4": 1,
        "5": 1,
      },
      "PCL-5": {
        "1": 3,
        "2": 3,
        "3": 3,
        "4": 2,
        "5": 3,
      },
    },
    item_telemetry: {
      "PC-PTSD-5": Array.from({ length: 5 }, (_, i) => ({
        item_id: String(i + 1),
        response_time_ms: 1800,
        value: 1,
      })),
    },
    average_item_time_ms: 1800,
    hesitation_detected: false,
    expected_scales: ["PC-PTSD-5", "PCL-5"],
    expected_safety_plan: false,
    clinical_summary:
      "Transtorno de Estresse Pós-Traumático (TEPT) com sintomas de intrusão, evitação e hipervigilância autonômica.",
  },

  // --------------------------------------------------------------------------
  // CASO 10: Juliano (22a) — Dependência de Múltiplas Substâncias
  // --------------------------------------------------------------------------
  {
    id: "lumina-case-10-juliano",
    patient_name: "Juliano Barreto Fontana",
    patient_email: "juliano.fontana@exemplo.com",
    age: 22,
    sex: "masculino",
    informant_type: "paciente",
    free_text_complaint:
      "Comecei fumando maconha para ansiedade, agora uso cocaína aos finais de semana e perdi meu semestre na faculdade.",
    symptoms: ["substancias"],
    scale_answers: {
      ASSIST: {
        "1": 3,
        "2": 3,
        "3": 3,
        "4": 2,
      },
      AUDIT: {
        "1": 2,
        "2": 2,
        "3": 2,
        "4": 2,
      },
    },
    item_telemetry: {
      ASSIST: Array.from({ length: 4 }, (_, i) => ({
        item_id: String(i + 1),
        response_time_ms: 1600,
        value: 3,
      })),
    },
    average_item_time_ms: 1600,
    hesitation_detected: false,
    expected_scales: ["ASSIST", "AUDIT"],
    expected_safety_plan: false,
    clinical_summary:
      "Poliuso de substâncias com prejuízo funcional acadêmico e padrão de consumo de alto risco.",
  },
];
