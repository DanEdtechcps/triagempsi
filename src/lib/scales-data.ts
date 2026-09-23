// Definições das escalas do "Caderno de Escalas Psiquiátricas de Uso Livre"
// Uso: rastreio pré-consulta. Não substitui avaliação clínica.

import {
  OPTS_0_2,
  OPTS_0_3,
  OPTS_0_4,
  OPTS_SIM_NAO,
  type LikertOption,
  type Scale,
} from "./scale-types";
import { EXTRA_SCALES, ASSIST_V0 } from "./scales-extra";
import { SCALES_AMPLIADAS } from "./scales-ampliadas";
import { SCALES_OCUPACIONAL } from "./scales-ocupacional";
import { OFFICIAL_28_EXTRA_SCALES } from "./scales-official-28";
export * from "./scales-official-28";

export type {
  LikertOption,
  Scale,
  ScaleItem,
  ScaleBand,
  ScaleDomain,
} from "./scale-types";
export {
  isScaleAllowedForAge,
  skippedItemIds,
  nextItemIndex,
  prevItemIndex,
  applyBranchingSkips,
  visibleProgress,
  groupLabelForItem,
} from "./scale-types";

export const PHQ2: Scale = {
  code: "PHQ-2",
  name: "PHQ-2",
  fullName: "Rastreio breve de depressão",
  domain: "depressao",
  instructions:
    "Nas últimas duas semanas, com que frequência você foi incomodado(a) pelos seguintes problemas?",
  timeframe: "Últimas 2 semanas",
  options: OPTS_0_3,
  items: [
    { id: "1", text: "Pouco interesse ou prazer em fazer as coisas" },
    { id: "2", text: "Sentir-se para baixo, deprimido(a) ou sem esperança" },
  ],
  bands: [
    { min: 0, max: 2, label: "Negativo", level: 0 },
    { min: 3, max: 6, label: "Positivo — aplicar PHQ-9", level: 2 },
  ],
  positiveCutoff: 3,
  triggersScale: "PHQ-9",
};

export const PHQ9: Scale = {
  code: "PHQ-9",
  name: "PHQ-9",
  fullName: "Gravidade de sintomas depressivos",
  domain: "depressao",
  instructions:
    "Nas últimas duas semanas, com que frequência você foi incomodado(a) por:",
  timeframe: "Últimas 2 semanas",
  options: OPTS_0_3,
  items: [
    { id: "1", text: "Pouco interesse ou prazer em fazer as coisas" },
    { id: "2", text: "Sentir-se para baixo, deprimido(a) ou sem esperança" },
    { id: "3", text: "Dificuldade para pegar no sono, continuar dormindo ou dormir demais" },
    { id: "4", text: "Sentir-se cansado(a) ou com pouca energia" },
    { id: "5", text: "Pouco apetite ou comer demais" },
    {
      id: "6",
      text: "Sentir-se mal consigo mesmo(a), achar que é um fracasso ou que decepcionou sua família",
    },
    { id: "7", text: "Dificuldade de concentração, como ao ler ou assistir televisão" },
    {
      id: "8",
      text: "Mover-se ou falar tão devagar que outras pessoas perceberam, ou ficar tão inquieto(a) que se movimentou muito mais",
    },
    {
      id: "9",
      text: "Pensar em se ferir de alguma maneira ou que seria melhor estar morto(a)",
    },
  ],
  bands: [
    { min: 0, max: 4, label: "Mínima", level: 0 },
    { min: 5, max: 9, label: "Leve", level: 1 },
    { min: 10, max: 14, label: "Moderada", level: 2 },
    { min: 15, max: 19, label: "Moderadamente grave", level: 3 },
    { min: 20, max: 27, label: "Grave", level: 4 },
  ],
};

export const GAD2: Scale = {
  code: "GAD-2",
  name: "GAD-2",
  fullName: "Rastreio breve de ansiedade",
  domain: "ansiedade",
  instructions:
    "Nas últimas duas semanas, com que frequência você foi incomodado(a) por:",
  timeframe: "Últimas 2 semanas",
  options: OPTS_0_3,
  items: [
    { id: "1", text: "Sentir-se nervoso(a), ansioso(a) ou muito tenso(a)" },
    { id: "2", text: "Não conseguir parar ou controlar as preocupações" },
  ],
  bands: [
    { min: 0, max: 2, label: "Negativo", level: 0 },
    { min: 3, max: 6, label: "Positivo — aplicar GAD-7", level: 2 },
  ],
  positiveCutoff: 3,
  triggersScale: "GAD-7",
};

export const GAD7: Scale = {
  code: "GAD-7",
  name: "GAD-7",
  fullName: "Gravidade de sintomas ansiosos",
  domain: "ansiedade",
  instructions:
    "Nas últimas duas semanas, com que frequência você foi incomodado(a) por:",
  timeframe: "Últimas 2 semanas",
  options: OPTS_0_3,
  items: [
    { id: "1", text: "Sentir-se nervoso(a), ansioso(a) ou muito tenso(a)" },
    { id: "2", text: "Não conseguir parar ou controlar as preocupações" },
    { id: "3", text: "Preocupar-se demais com coisas diferentes" },
    { id: "4", text: "Dificuldade para relaxar" },
    { id: "5", text: "Ficar tão inquieto(a) que é difícil permanecer parado(a)" },
    { id: "6", text: "Ficar facilmente irritado(a) ou aborrecido(a)" },
    { id: "7", text: "Sentir medo como se algo terrível pudesse acontecer" },
  ],
  bands: [
    { min: 0, max: 4, label: "Mínima", level: 0 },
    { min: 5, max: 9, label: "Leve", level: 1 },
    { min: 10, max: 14, label: "Moderada", level: 2 },
    { min: 15, max: 21, label: "Grave", level: 4 },
  ],
};

export const ASQ: Scale = {
  code: "ASQ",
  name: "ASQ",
  fullName: "Triagem de risco de suicídio",
  domain: "risco",
  instructions:
    "Estas perguntas ajudam sua equipe a garantir sua segurança. Responda com sinceridade — todas as respostas são confidenciais.",
  timeframe: "Últimas semanas",
  options: OPTS_SIM_NAO,
  items: [
    { id: "1", text: "Nas últimas semanas, você desejou estar morto(a)?" },
    {
      id: "2",
      text: "Nas últimas semanas, você sentiu que você ou sua família estariam melhor se você estivesse morto(a)?",
    },
    { id: "3", text: "Na última semana, você teve pensamentos de se matar?" },
    { id: "4", text: "Você já tentou se matar alguma vez?" },
  ],
  bands: [
    { min: 0, max: 0, label: "Negativo", level: 0 },
    { min: 1, max: 4, label: "Positivo — atenção clínica", level: 4 },
  ],
  positiveCutoff: 1,
};

// ATENÇÃO CLÍNICA (achado #32 da auditoria, não resolvido em código): o
// corte usual do AUDIT-C na literatura (NIAAA/USPSTF) é diferenciado por
// sexo (tipicamente ≥4 homens / ≥3 mulheres). Aqui `positiveCutoff` é
// único (≥3) pra todo mundo, o que super-inclui homens no AUDIT completo.
// Pode ser uma escolha deliberada de errar pro lado cauteloso numa pré-
// triagem — mas não está documentada como decisão. Não alterar sem
// confirmar com um profissional clínico se é intencional.
export const AUDIT_C: Scale = {
  code: "AUDIT-C",
  name: "AUDIT-C",
  fullName: "Rastreio breve de uso de álcool",
  domain: "alcool",
  instructions: "Sobre o seu consumo de álcool:",
  options: [], // itens têm opções próprias
  items: [
    { id: "1", text: "Com que frequência você consome bebida alcoólica?" },
    { id: "2", text: "Quantas doses costuma consumir em um dia típico?" },
    {
      id: "3",
      text: "Com que frequência você consome 6 ou mais doses em uma única ocasião?",
    },
  ],
  bands: [
    { min: 0, max: 2, label: "Baixo risco", level: 0 },
    { min: 3, max: 12, label: "Positivo — aplicar AUDIT", level: 2 },
  ],
  positiveCutoff: 3,
  triggersScale: "AUDIT",
};

export const AUDIT_C_OPTIONS: Record<string, LikertOption[]> = {
  "1": [
    { label: "Nunca", value: 0 },
    { label: "Mensal ou menos", value: 1 },
    { label: "2 a 4 vezes/mês", value: 2 },
    { label: "2 a 3 vezes/semana", value: 3 },
    { label: "4 ou mais vezes/semana", value: 4 },
  ],
  "2": [
    { label: "1 ou 2", value: 0 },
    { label: "3 ou 4", value: 1 },
    { label: "5 ou 6", value: 2 },
    { label: "7 a 9", value: 3 },
    { label: "10 ou mais", value: 4 },
  ],
  "3": [
    { label: "Nunca", value: 0 },
    { label: "Menos que mensal", value: 1 },
    { label: "Mensal", value: 2 },
    { label: "Semanal", value: 3 },
    { label: "Diariamente ou quase", value: 4 },
  ],
};

const AUDIT_FREQ = [
  { label: "Nunca", value: 0 },
  { label: "Menos que mensal", value: 1 },
  { label: "Mensal", value: 2 },
  { label: "Semanal", value: 3 },
  { label: "Diariamente ou quase", value: 4 },
];

export const AUDIT: Scale = {
  code: "AUDIT",
  name: "AUDIT",
  fullName: "Uso de álcool — versão completa",
  domain: "alcool",
  instructions: "Responda considerando o último ano:",
  options: [],
  items: [
    { id: "4", text: "Não conseguiu parar de beber depois de começar" },
    { id: "5", text: "Deixou de fazer o que se esperava por causa da bebida" },
    { id: "6", text: "Precisou beber pela manhã após uma noite de muita bebida" },
    { id: "7", text: "Sentiu culpa ou remorso após beber" },
    { id: "8", text: "Não conseguiu lembrar o que aconteceu na noite anterior" },
  ],
  bands: [
    { min: 0, max: 7, label: "Baixo risco", level: 0 },
    { min: 8, max: 15, label: "Uso de risco", level: 2 },
    { min: 16, max: 19, label: "Uso nocivo", level: 3 },
    { min: 20, max: 40, label: "Provável dependência", level: 4 },
  ],
};

export const AUDIT_OPTIONS: Record<string, LikertOption[]> = {
  "4": AUDIT_FREQ,
  "5": AUDIT_FREQ,
  "6": AUDIT_FREQ,
  "7": AUDIT_FREQ,
  "8": AUDIT_FREQ,
  "9": [
    { label: "Não", value: 0 },
    { label: "Sim, mas não no último ano", value: 2 },
    { label: "Sim, no último ano", value: 4 },
  ],
  "10": [
    { label: "Não", value: 0 },
    { label: "Sim, mas não no último ano", value: 2 },
    { label: "Sim, no último ano", value: 4 },
  ],
};

// (itens 9 e 10 do AUDIT precisam ser adicionados)
AUDIT.items.push(
  { id: "9", text: "Você ou outra pessoa se feriu por causa da sua bebida" },
  {
    id: "10",
    text: "Alguém demonstrou preocupação com sua bebida ou sugeriu que você reduzisse",
  },
);

export const PC_PTSD5: Scale = {
  code: "PC-PTSD-5",
  name: "PC-PTSD-5",
  fullName: "Rastreio breve de trauma",
  domain: "trauma",
  instructions:
    "Você já vivenciou um evento tão assustador, horrível ou perturbador (acidente grave, violência, abuso, desastre, ameaça de morte) que, no último mês, você:",
  timeframe: "Último mês",
  options: OPTS_SIM_NAO,
  items: [
    { id: "1", text: "Teve pesadelos ou pensou nesse evento sem querer?" },
    {
      id: "2",
      text: "Tentou muito não pensar nele ou evitou situações que o lembrassem?",
    },
    { id: "3", text: "Ficou constantemente em alerta, vigilante ou facilmente assustado(a)?" },
    { id: "4", text: "Sentiu-se distante, entorpecido(a) ou desligado(a) das pessoas e do ambiente?" },
    {
      id: "5",
      text: "Sentiu-se culpado(a) ou não conseguiu parar de se culpar por esse evento ou pelos problemas dele decorrentes?",
    },
  ],
  bands: [
    { min: 0, max: 2, label: "Negativo", level: 0 },
    { min: 3, max: 5, label: "Positivo — considerar PCL-5", level: 2 },
  ],
  positiveCutoff: 3,
  triggersScale: "PCL-5",
};

export const PHQ15: Scale = {
  code: "PHQ-15",
  name: "PHQ-15",
  fullName: "Carga de sintomas somáticos",
  domain: "somatico",
  instructions:
    "Nas últimas quatro semanas, quanto você foi incomodado(a) por cada problema?",
  timeframe: "Últimas 4 semanas",
  options: OPTS_0_2,
  items: [
    { id: "1", text: "Dor de estômago" },
    { id: "2", text: "Dor nas costas" },
    { id: "3", text: "Dor nos braços, pernas ou articulações" },
    { id: "4", text: "Cólica menstrual ou outros problemas menstruais (se aplicável)" },
    { id: "5", text: "Dores de cabeça" },
    { id: "6", text: "Dor no peito" },
    { id: "7", text: "Tontura" },
    { id: "8", text: "Desmaios" },
    { id: "9", text: "Sentir o coração bater forte ou acelerado" },
    { id: "10", text: "Falta de ar" },
    { id: "11", text: "Dor ou problemas nas relações sexuais" },
    { id: "12", text: "Prisão de ventre, intestino solto ou diarreia" },
    { id: "13", text: "Náusea, gases ou indigestão" },
    { id: "14", text: "Sentir-se cansado(a) ou com pouca energia" },
    { id: "15", text: "Problemas para dormir" },
  ],
  bands: [
    { min: 0, max: 4, label: "Mínima", level: 0 },
    { min: 5, max: 9, label: "Baixa", level: 1 },
    { min: 10, max: 14, label: "Média", level: 2 },
    { min: 15, max: 30, label: "Alta gravidade somática", level: 3 },
  ],
};

export const PCL5: Scale = {
  code: "PCL-5",
  name: "PCL-5",
  fullName: "Gravidade de sintomas de TEPT",
  domain: "trauma",
  instructions:
    "No último mês, quanto você foi incomodado(a) por cada problema relacionado à sua experiência estressante?",
  timeframe: "Último mês",
  options: OPTS_0_4,
  items: [
    { id: "1", text: "Memórias repetidas, perturbadoras e indesejadas do evento" },
    { id: "2", text: "Sonhos perturbadores repetidos sobre o evento" },
    { id: "3", text: "Sentir ou agir como se o evento estivesse acontecendo novamente" },
    { id: "4", text: "Ficar muito perturbado(a) diante de lembranças" },
    { id: "5", text: "Reações físicas fortes diante de lembranças" },
    { id: "6", text: "Evitar memórias, pensamentos ou sentimentos sobre o evento" },
    { id: "7", text: "Evitar pessoas, lugares, conversas ou atividades que lembrem o evento" },
    { id: "8", text: "Dificuldade para lembrar partes importantes do evento" },
    { id: "9", text: "Crenças negativas fortes sobre si, os outros ou o mundo" },
    { id: "10", text: "Culpar a si ou aos outros pelo evento ou por suas consequências" },
    { id: "11", text: "Sentimentos negativos intensos (medo, raiva, culpa, vergonha)" },
    { id: "12", text: "Perda de interesse em atividades antes prazerosas" },
    { id: "13", text: "Sentir-se distante das outras pessoas" },
    { id: "14", text: "Dificuldade para sentir emoções positivas" },
    { id: "15", text: "Irritabilidade, agressividade ou raiva" },
    { id: "16", text: "Assumir riscos ou fazer coisas perigosas" },
    { id: "17", text: "Ficar em superalerta" },
    { id: "18", text: "Assustar-se facilmente" },
    { id: "19", text: "Dificuldade de concentração" },
    { id: "20", text: "Dificuldade para dormir" },
  ],
  bands: [
    { min: 0, max: 30, label: "Abaixo do provável TEPT", level: 0 },
    { min: 31, max: 80, label: "Provável TEPT — avaliar", level: 3 },
  ],
  positiveCutoff: 31,
};

const BASE_SCALES: Scale[] = [
  PHQ2,
  PHQ9,
  GAD2,
  GAD7,
  ASQ,
  PC_PTSD5,
  PCL5,
  AUDIT_C,
  AUDIT,
  PHQ15,
];

// Metadados de faixa etária / status aplicados às escalas já existentes.
const BASE_META: Record<string, Partial<Scale>> = {
  "PHQ-2": { status: "ativa", minAge: 12 },
  "PHQ-9": { status: "ativa", minAge: 12, riskItems: ["9"] },
  "GAD-2": { status: "ativa", minAge: 12 },
  "GAD-7": { status: "ativa", minAge: 12 },
  ASQ: { status: "ativa", minAge: 10 },
  "PC-PTSD-5": { status: "ativa", minAge: 15 },
  "PCL-5": { status: "ativa", minAge: 15 },
  "AUDIT-C": { status: "ativa", minAge: 15 },
  AUDIT: { status: "ativa", minAge: 15 },
  "PHQ-15": { status: "ativa", minAge: 15 },
};
for (const s of BASE_SCALES) Object.assign(s, BASE_META[s.code] ?? {});

export const ALL_SCALES: Scale[] = [
  ...BASE_SCALES,
  ...EXTRA_SCALES,
  ...SCALES_AMPLIADAS,
  ...SCALES_OCUPACIONAL,
  ...OFFICIAL_28_EXTRA_SCALES,
];

export const SCALE_BY_CODE = Object.fromEntries(
  ALL_SCALES.map((s) => [s.code, s]),
) as Record<string, Scale>;

/**
 * Definições substituídas, mantidas só para ler registros antigos do
 * histórico (ex.: ASSIST em frequência 0-6, hoje substituído pelo
 * ASSIST-Lite de ramificação). Nunca entram no fluxo do paciente.
 */
const LEGACY_SCALES: Scale[] = [ASSIST_V0];

/**
 * Resolve a definição de escala para exibir respostas gravadas. Quando os
 * ids das respostas não combinam com os itens atuais (escala substituída),
 * usa a definição legada — o histórico continua legível.
 */
export function resolveScaleForAnswers(
  code: string,
  answers?: Record<string, number> | null,
): Scale | undefined {
  const current = SCALE_BY_CODE[code];
  if (!current) return LEGACY_SCALES.find((s) => s.code === code);
  const ids = Object.keys(answers ?? {});
  if (ids.length > 0 && !ids.some((id) => current.items.some((i) => i.id === id))) {
    const legacy = LEGACY_SCALES.find(
      (s) => s.code === code && ids.some((id) => s.items.some((i) => i.id === id)),
    );
    if (legacy) return legacy;
  }
  return current;
}

/** Ordem inicial para consulta psiquiátrica adulto (Protocolo p.41) */
export const INITIAL_ADULT_FLOW: string[] = [
  "PHQ-2",
  "GAD-2",
  "ASQ",
  "AUDIT-C",
  "PC-PTSD-5",
  "PHQ-15",
];

export function getItemOptions(scale: Scale, itemId: string): LikertOption[] {
  if (scale.code === "AUDIT-C") return AUDIT_C_OPTIONS[itemId] ?? scale.options;
  if (scale.code === "AUDIT") return AUDIT_OPTIONS[itemId] ?? scale.options;
  return scale.options;
}
