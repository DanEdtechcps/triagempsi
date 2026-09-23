/**
 * Módulo de Plano de Segurança Estruturado - TriagemPsi
 * Acionado preventivamente em situações de crise psíquica, ideação suicida ou sofrimento agudo.
 * Desenvolvido sob diretrizes éticas e de proteção à vida (CVV 188 / SAMU 192).
 */

export interface EmergencyContact {
  nome: string;
  numero: string;
  descricao: string;
  linkTel: string;
  badge: string;
}

export interface GroundingStep {
  titulo: string;
  passos: string[];
}

export interface SafetyPlanStructure {
  versao: string;
  titulo: string;
  subtitulo: string;
  aviso_urgencia: string;
  contatos_emergencia: EmergencyContact[];
  rede_apoio: {
    titulo: string;
    orientacao: string;
    mensagem_modelo: string;
  };
  estrategias_distracao: GroundingStep[];
  seguranca_ambiente: {
    titulo: string;
    orientacoes: string[];
  };
}

export const OFFICIAL_SAFETY_PLAN: SafetyPlanStructure = {
  versao: "v1 (2026.1)",
  titulo: "Plano de Segurança e Cuidado Prioritário",
  subtitulo: "Orientações estruturadas para momentos de crise intensa e proteção da vida",
  aviso_urgencia:
    "Se você está com pensamentos de desistir ou em sofrimento emocional insuportável, não fique sozinho. Há ajuda gratuita, confidencial e especializada disponível agora mesmo.",
  contatos_emergencia: [
    {
      nome: "CVV - Centro de Valorização da Vida",
      numero: "188",
      descricao:
        "Apoio emocional e prevenção do suicídio. Atendimento 24h, gratuito e sob sigilo absoluto em todo o Brasil.",
      linkTel: "tel:188",
      badge: "Gratuito 24h",
    },
    {
      nome: "SAMU - Serviço de Atendimento Móvel de Urgência",
      numero: "192",
      descricao:
        "Emergência médica imediata. Acione em situações de risco à integridade física ou crise aguda descompensada.",
      linkTel: "tel:192",
      badge: "Emergência Médica",
    },
    {
      nome: "UPA / Pronto-Socorro mais próximo",
      numero: "Presencial 24h",
      descricao:
        "Procure a Unidade de Pronto Atendimento ou emergência hospitalar da sua cidade para acolhimento médico imediato.",
      linkTel: "",
      badge: "Acolhimento Presencial",
    },
    {
      nome: "CAPS / CAPS III",
      numero: "Rede SUS",
      descricao:
        "Centro de Atenção Psicossocial do seu município, especializado em acolhimento e suporte continuado em saúde mental.",
      linkTel: "",
      badge: "Apoio Psicossocial",
    },
  ],
  rede_apoio: {
    titulo: "1. Acione Sua Rede de Apoio e Confiança",
    orientacao:
      "Escolha 1 ou 2 pessoas de sua inteira confiança (familiar, amigo próximo, líder comunitário ou terapeuta) e compartilhe o que está sentindo sem vergonha. A dor dividida perde a força de urgência.",
    mensagem_modelo:
      "Olá, estou passando por um momento difícil e tendo pensamentos muito pesados agora. Você poderia falar comigo ou me fazer companhia por um tempo?",
  },
  estrategias_distracao: [
    {
      titulo: "2. Técnica de Aterramento Sensorial (Grounding 5-4-3-2-1)",
      passos: [
        "Olhe ao seu redor e identifique 5 coisas que você pode ver.",
        "Toque e sinta a textura de 4 objetos concretos (sua roupa, a mesa, um copo).",
        "Preste atenção e identifique 3 sons do ambiente (um carro distante, um pássaro, o vento).",
        "Identifique 2 cheiros presentes (café, sabonete, seu perfume).",
        "Perceba 1 sabor na sua boca (um gole de água fresca ou uma bala).",
      ],
    },
    {
      titulo: "3. Respiração Ritmada Calmante (Técnica 4-4-6)",
      passos: [
        "Inspire lentamente pelo nariz contando até 4.",
        "Segure o ar suavemente nos pulmões por 4 segundos.",
        "Solte todo o ar pela boca devagar, soprando de forma contínua por 6 segundos.",
        "Repita esse ciclo de 4 a 6 vezes para enviar um sinal neurofisiológico de segurança ao cérebro.",
      ],
    },
  ],
  seguranca_ambiente: {
    titulo: "4. Torne o Seu Ambiente Imediatamente Seguro",
    orientacoes: [
      "Abafe o impulso de isolar-se: saia de cômodos fechados ou escuros e dirija-se a um local arejado ou com presença de outras pessoas.",
      "Remoção preventiva de meios: afaste do alcance imediato caixas de medicamentos, objetos perfurocortantes, bebidas alcoólicas ou qualquer substância tóxica.",
      "Entregue a guarda de remédios ou chaves a uma pessoa de confiança para que ela gerencie as doses prescritas.",
      "Lembre-se: crises emocionais têm um pico de intensidade aguda de 15 a 30 minutos e depois diminuem. Dê a si mesmo o tempo de respirar antes de qualquer atitude definitiva.",
    ],
  },
};

/**
 * Avalia se o Plano de Segurança Estruturado deve ser disparado com base nos escores das escalas.
 */
export function isSafetyPlanTriggered(params: {
  scaleResults?: Array<{
    scale_code: string;
    score?: number | null;
    risk?: boolean;
    answers?: Record<string, number>;
  }>;
  riskPathway?: boolean;
  hasRiskFlags?: boolean;
}): boolean {
  if (params.riskPathway || params.hasRiskFlags) return true;

  if (!params.scaleResults || params.scaleResults.length === 0) return false;

  for (const r of params.scaleResults) {
    const code = r.scale_code.toUpperCase();
    // PHQ-9 item 9 positivo
    if (code === "PHQ-9" && r.answers && Number(r.answers["9"]) >= 1) {
      return true;
    }
    // C-SSRS positivo
    if (code === "C-SSRS" && (r.risk || (r.score ?? 0) >= 1)) {
      return true;
    }
    // RISK-COMPOSITE positivo
    if (code === "RISK-COMPOSITE" && (r.risk || (r.score ?? 0) >= 1)) {
      return true;
    }
  }

  return false;
}
