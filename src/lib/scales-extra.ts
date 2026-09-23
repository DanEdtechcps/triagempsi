import {
  OPTS_0_3,
  OPTS_SIM_NAO,
  OPTS_TDAH,
  type Scale,
  type SubscaleBand,
  type SubscaleDef,
} from "./scale-types";

/** Opções com chave de pontuação invertida (usadas na GDS-15). */
const SIM1_NAO0 = OPTS_SIM_NAO;
const SIM0_NAO1 = [
  { label: "Não", value: 1 },
  { label: "Sim", value: 0 },
];

/**
 * Escalas adicionais do protocolo de pré-triagem.
 * Escalas com status "estrutura" têm perguntas placeholder e ficam prontas
 * para receber o conteúdo curado pela equipe clínica — não entram no fluxo
 * do paciente, apenas são registradas como "escala indicada" para o médico.
 */

export const SRQ20: Scale = {
  code: "SRQ-20",
  name: "SRQ-20",
  fullName: "Rastreio de sofrimento psíquico geral",
  domain: "geral",
  status: "ativa",
  minAge: 15,
  instructions:
    "Estas perguntas se referem a como você tem se sentido nos últimos 30 dias. Responda sim ou não para cada uma.",
  timeframe: "Últimos 30 dias",
  options: OPTS_SIM_NAO,
  items: [
    { id: "1", text: "Tem dores de cabeça com frequência?" },
    { id: "2", text: "Tem falta de apetite?" },
    { id: "3", text: "Dorme mal?" },
    { id: "4", text: "Assusta-se com facilidade?" },
    { id: "5", text: "Tem tremores nas mãos?" },
    { id: "6", text: "Sente-se nervoso(a), tenso(a) ou preocupado(a)?" },
    { id: "7", text: "Tem má digestão?" },
    { id: "8", text: "Tem dificuldade de pensar com clareza?" },
    { id: "9", text: "Tem se sentido triste ultimamente?" },
    { id: "10", text: "Tem chorado mais do que de costume?" },
    {
      id: "11",
      text: "Encontra dificuldade em realizar com satisfação suas atividades diárias?",
    },
    { id: "12", text: "Tem dificuldade em tomar decisões?" },
    { id: "13", text: "Seu trabalho diário lhe causa sofrimento?" },
    { id: "14", text: "É incapaz de desempenhar um papel útil em sua vida?" },
    { id: "15", text: "Tem perdido o interesse pelas coisas?" },
    { id: "16", text: "Você se sente uma pessoa inútil em sua vida?" },
    { id: "17", text: "Tem tido a ideia de acabar com a própria vida?" },
    { id: "18", text: "Sente-se cansado(a) o tempo todo?" },
    { id: "19", text: "Tem sensações desagradáveis no estômago?" },
    { id: "20", text: "Cansa-se com facilidade?" },
  ],
  riskItems: ["17"],
  bands: [
    { min: 0, max: 6, label: "Rastreio negativo", level: 0 },
    { min: 7, max: 10, label: "Rastreio positivo — sofrimento leve a moderado", level: 2 },
    { min: 11, max: 20, label: "Rastreio positivo — sofrimento importante", level: 4 },
  ],
  positiveCutoff: 7,
};

export const GHQ12: Scale = {
  code: "GHQ-12",
  name: "GHQ-12",
  fullName: "Saúde geral e sofrimento psíquico (estrutura)",
  domain: "geral",
  status: "estrutura",
  minAge: 16,
  licenseNote:
    "Conteúdo dos itens aguardando curadoria clínica. Estrutura pronta para receber as 12 questões.",
  instructions: "Nas últimas semanas, comparando com o seu habitual, você tem…",
  timeframe: "Últimas semanas",
  options: OPTS_0_3,
  items: Array.from({ length: 12 }, (_, i) => ({
    id: String(i + 1),
    text: `[Item ${i + 1} — aguardando texto curado pela equipe clínica]`,
  })),
  bands: [
    { min: 0, max: 11, label: "Abaixo do corte", level: 0 },
    { min: 12, max: 36, label: "Acima do corte — avaliar", level: 3 },
  ],
  positiveCutoff: 12,
};

export const BDI2: Scale = {
  code: "BDI-II",
  name: "BDI-II",
  fullName: "Inventário de depressão de Beck (estrutura)",
  domain: "depressao",
  status: "estrutura",
  minAge: 13,
  licenseNote:
    "Instrumento proprietário: exige licença de uso. Estrutura mantida como placeholder — não aplicar ao paciente até a licença ser formalizada.",
  instructions: "Aplicação sujeita a licenciamento. Estrutura reservada para os 21 itens.",
  options: OPTS_0_3,
  items: Array.from({ length: 21 }, (_, i) => ({
    id: String(i + 1),
    text: `[Item ${i + 1} — indisponível: instrumento licenciado]`,
  })),
  bands: [
    { min: 0, max: 13, label: "Mínima", level: 0 },
    { min: 14, max: 19, label: "Leve", level: 1 },
    { min: 20, max: 28, label: "Moderada", level: 2 },
    { min: 29, max: 63, label: "Grave", level: 4 },
  ],
};

export const ASRS18: Scale = {
  code: "ASRS-18",
  name: "ASRS-18",
  fullName: "Sintomas de TDAH em adultos (estrutura)",
  domain: "tdah",
  status: "estrutura",
  minAge: 18,
  licenseNote: "Itens aguardando curadoria clínica.",
  instructions: "Com que frequência, nos últimos 6 meses, você teve cada uma destas dificuldades?",
  timeframe: "Últimos 6 meses",
  options: OPTS_TDAH,
  items: Array.from({ length: 18 }, (_, i) => ({
    id: String(i + 1),
    text: `[Item ${i + 1} — aguardando texto curado pela equipe clínica]`,
  })),
  bands: [
    { min: 0, max: 23, label: "Pouco provável", level: 0 },
    { min: 24, max: 72, label: "Sintomas relevantes — avaliar", level: 3 },
  ],
  positiveCutoff: 24,
};

export const TDAH_INFANTIL: Scale = {
  code: "SNAP-IV",
  name: "SNAP-IV",
  fullName: "Sintomas de desatenção e hiperatividade (crianças e adolescentes) — estrutura",
  domain: "tdah",
  status: "estrutura",
  informantMode: "hetero",
  minAge: 6,
  maxAge: 17,
  licenseNote: "Itens aguardando curadoria clínica. Respondido por responsável.",
  instructions: "Com que frequência a criança/adolescente apresenta cada comportamento?",
  options: OPTS_TDAH,
  items: Array.from({ length: 18 }, (_, i) => ({
    id: String(i + 1),
    text: `[Item ${i + 1} — aguardando texto curado pela equipe clínica]`,
  })),
  bands: [
    { min: 0, max: 17, label: "Abaixo do corte", level: 0 },
    { min: 18, max: 72, label: "Acima do corte — avaliar", level: 3 },
  ],
};

export const RISCO_ADOLESCENTE: Scale = {
  code: "RISCO-ADO",
  name: "Risco (adolescente)",
  fullName: "Rastreio de risco de suicídio — crianças e adolescentes (estrutura)",
  domain: "risco",
  status: "estrutura",
  minAge: 10,
  maxAge: 17,
  licenseNote:
    "Estrutura reservada para a versão infantojuvenil validada, a ser definida pela equipe clínica.",
  instructions: "Perguntas de segurança, adaptadas para crianças e adolescentes.",
  options: OPTS_SIM_NAO,
  items: Array.from({ length: 4 }, (_, i) => ({
    id: String(i + 1),
    text: `[Item ${i + 1} — aguardando texto curado pela equipe clínica]`,
  })),
  bands: [
    { min: 0, max: 0, label: "Negativo", level: 0 },
    { min: 1, max: 4, label: "Positivo — atenção clínica", level: 4 },
  ],
  positiveCutoff: 1,
};

export const GDS15: Scale = {
  code: "GDS-15",
  name: "GDS-15",
  fullName: "Escala de Depressão Geriátrica (15 itens)",
  domain: "depressao",
  status: "ativa",
  minAge: 60,
  quietIfOutOfRange: true,
  instructions:
    "Considere como você se sentiu na última semana. Responda sim ou não para cada pergunta.",
  timeframe: "Última semana",
  options: OPTS_SIM_NAO,
  // Cada item pontua 1 quando a resposta coincide com a resposta depressiva.
  items: [
    { id: "1", text: "Está satisfeito(a) com sua vida?", options: SIM0_NAO1 },
    { id: "2", text: "Abandonou muitas de suas atividades e interesses?", options: SIM1_NAO0 },
    { id: "3", text: "Sente que sua vida está vazia?", options: SIM1_NAO0 },
    { id: "4", text: "Fica frequentemente aborrecido(a)?", options: SIM1_NAO0 },
    { id: "5", text: "Está de bom humor na maior parte do tempo?", options: SIM0_NAO1 },
    { id: "6", text: "Tem medo de que algo ruim aconteça?", options: SIM1_NAO0 },
    { id: "7", text: "Sente-se feliz na maior parte do tempo?", options: SIM0_NAO1 },
    { id: "8", text: "Sente-se frequentemente desamparado(a)?", options: SIM1_NAO0 },
    {
      id: "9",
      text: "Prefere ficar em casa em vez de sair e fazer coisas novas?",
      options: SIM1_NAO0,
    },
    {
      id: "10",
      text: "Acha que tem mais problemas de memória do que a maioria?",
      options: SIM1_NAO0,
    },
    { id: "11", text: "Acha maravilhoso estar vivo(a) agora?", options: SIM0_NAO1 },
    { id: "12", text: "Sente-se sem valor do jeito que está agora?", options: SIM1_NAO0 },
    { id: "13", text: "Sente-se cheio(a) de energia?", options: SIM0_NAO1 },
    { id: "14", text: "Acha que sua situação não tem esperança?", options: SIM1_NAO0 },
    {
      id: "15",
      text: "Acha que a maioria das pessoas está melhor do que você?",
      options: SIM1_NAO0,
    },
  ],
  bands: [
    { min: 0, max: 4, label: "Sem indicação relevante", level: 0 },
    { min: 5, max: 8, label: "Sugere depressão leve", level: 1 },
    { min: 9, max: 11, label: "Sugere depressão moderada", level: 2 },
    { min: 12, max: 15, label: "Sugere depressão grave", level: 4 },
  ],
  positiveCutoff: 5,
};

export const CAGE: Scale = {
  code: "CAGE",
  name: "CAGE",
  fullName: "Triagem histórica de problemas com álcool",
  domain: "alcool",
  status: "ativa",
  minAge: 18,
  instructions: "Estas perguntas se referem à sua vida como um todo, não apenas ao momento atual.",
  options: OPTS_SIM_NAO,
  items: [
    { id: "1", text: "Já sentiu que deveria diminuir a bebida?" },
    { id: "2", text: "As pessoas o(a) irritaram ao criticar sua bebida?" },
    { id: "3", text: "Já se sentiu culpado(a) por beber?" },
    { id: "4", text: "Já bebeu pela manhã para firmar os nervos ou aliviar a ressaca?" },
  ],
  bands: [
    { min: 0, max: 1, label: "Rastreio negativo", level: 0 },
    { min: 2, max: 4, label: "Rastreio positivo — avaliar histórico de uso", level: 3 },
  ],
  positiveCutoff: 2,
};

export const EXTRA_SCALES_HEAD: Scale[] = [
  SRQ20,
  GDS15,
  CAGE,
  GHQ12,
  BDI2,
  ASRS18,
  TDAH_INFANTIL,
  RISCO_ADOLESCENTE,
];

/* ------------------------------------------------------------------ */
/* Inclusões da revisão clínica 2026: TOC, drogas gerais e jogo        */
/* ------------------------------------------------------------------ */

const OPTS_OCIR = [
  { label: "Nem um pouco", value: 0 },
  { label: "Um pouco", value: 1 },
  { label: "Moderadamente", value: 2 },
  { label: "Muito", value: 3 },
  { label: "Extremamente", value: 4 },
];

export const OCIR: Scale = {
  code: "OCI-R",
  name: "OCI-R",
  fullName: "Inventário de Obsessões e Compulsões — Revisado",
  domain: "obsessivo",
  status: "ativa",
  minAge: 14,
  instructions:
    "As afirmações a seguir referem-se a experiências que muitas pessoas vivenciam. Marque o quanto cada experiência tem lhe incomodado ou causado aflição neste último mês.",
  timeframe: "Último mês",
  options: OPTS_OCIR,
  items: [
    { id: "1", text: "Eu tenho acumulado tantas coisas que elas já estão me atrapalhando." },
    { id: "2", text: "Eu verifico coisas mais vezes do que é necessário." },
    { id: "3", text: "Eu fico chateado(a) se os objetos não estão arrumados corretamente." },
    { id: "4", text: "Eu sinto vontade de contar enquanto estou fazendo coisas." },
    {
      id: "5",
      text: "Eu sinto dificuldade em tocar um objeto se sei que este já foi tocado por estranhos ou por certas pessoas.",
    },
    { id: "6", text: "Eu tenho dificuldades em controlar meus próprios pensamentos." },
    { id: "7", text: "Eu coleciono coisas de que não preciso." },
    { id: "8", text: "Eu verifico repetidamente as portas, janelas, gavetas, etc." },
    { id: "9", text: "Eu fico chateado(a) se outras pessoas mudam as coisas que arrumei." },
    { id: "10", text: "Eu sinto necessidade de repetir certos números." },
    { id: "11", text: "Às vezes tenho que me lavar simplesmente porque me sinto contaminado(a)." },
    {
      id: "12",
      text: "Pensamentos desagradáveis que invadem minha mente contra a minha vontade me deixam chateado(a).",
    },
    {
      id: "13",
      text: "Evito jogar coisas fora, pois tenho medo de precisar delas em outro momento.",
    },
    {
      id: "14",
      text: "Eu verifico repetidamente o gás, as torneiras e os interruptores de luz após desligá-los.",
    },
    { id: "15", text: "Eu necessito de que as coisas estejam arrumadas em uma determinada ordem." },
    { id: "16", text: "Eu acredito que há números bons e ruins." },
    { id: "17", text: "Eu lavo as minhas mãos mais vezes que o necessário." },
    {
      id: "18",
      text: "Eu tenho pensamentos impróprios com frequência e tenho dificuldade em me livrar deles.",
    },
  ],
  bands: [
    { min: 0, max: 20, label: "Abaixo do ponto de corte", level: 0 },
    {
      min: 21,
      max: 39,
      label: "Acima do corte — sintomas obsessivo-compulsivos prováveis",
      level: 3,
    },
    { min: 40, max: 72, label: "Sintomatologia obsessivo-compulsiva intensa", level: 4 },
  ],
  positiveCutoff: 21,
  licenseNote: "OCI-R — versão brasileira (Souza et al., 2008/2011). Ponto de corte 21.",
};

/* ------------------------------------------------------------------ */
/* ASSIST-Lite (OMS/WHO): álcool, tabaco e outras substâncias          */
/* 20 perguntas Sim/Não com ramificação por substância: quando a       */
/* pergunta-porta (gateway) é "Não", as demais daquela substância são  */
/* puladas e pontuam 0. Escore da substância = soma dos "Sim",         */
/* incluindo a pergunta-porta. Faixas: baixo 0 · moderado 1-2 ·        */
/* alto ≥ 3 — exceto álcool (baixo 0-1 · moderado 2 · alto ≥ 3) e      */
/* outras substâncias (item único: 0 baixo · 1 alto).                  */
/* ------------------------------------------------------------------ */

const RECO_ASSIST = {
  baixo: "Sem intervenção necessária; reforço positivo.",
  moderado: "Intervenção breve (modelo FRAMES) e psicoeducação.",
  alto: "Encaminhar para avaliação especializada / tratamento.",
};

/** Faixas padrão por substância: baixo 0 · moderado 1-2 · alto ≥ 3. */
const assistBandasPadrao = (max: number): SubscaleBand[] => [
  { min: 0, max: 0, label: "Baixo risco", level: 0, recommendation: RECO_ASSIST.baixo },
  { min: 1, max: 2, label: "Risco moderado", level: 2, recommendation: RECO_ASSIST.moderado },
  { min: 3, max, label: "Alto risco", level: 4, recommendation: RECO_ASSIST.alto },
];

const ASSIST_SUBSCALES: SubscaleDef[] = [
  {
    key: "ASSIST_TABACO",
    label: "Tabaco",
    items: ["801", "802", "803"],
    bands: assistBandasPadrao(3),
  },
  {
    key: "ASSIST_ALCOOL",
    label: "Álcool",
    items: ["804", "805", "806", "807"],
    bands: [
      { min: 0, max: 1, label: "Baixo risco", level: 0, recommendation: RECO_ASSIST.baixo },
      { min: 2, max: 2, label: "Risco moderado", level: 2, recommendation: RECO_ASSIST.moderado },
      { min: 3, max: 4, label: "Alto risco", level: 4, recommendation: RECO_ASSIST.alto },
    ],
  },
  {
    key: "ASSIST_CANNABIS",
    label: "Cannabis",
    items: ["808", "809", "810"],
    bands: assistBandasPadrao(3),
  },
  {
    key: "ASSIST_ESTIMULANTES",
    label: "Estimulantes (cocaína, anfetaminas)",
    items: ["811", "812", "813"],
    bands: assistBandasPadrao(3),
  },
  {
    key: "ASSIST_SEDATIVOS",
    label: "Sedativos",
    items: ["814", "815", "816"],
    bands: assistBandasPadrao(3),
  },
  {
    key: "ASSIST_OPIOIDES",
    label: "Opioides",
    items: ["817", "818", "819"],
    bands: assistBandasPadrao(3),
  },
  {
    key: "ASSIST_OUTRAS",
    label: "Outras substâncias",
    items: ["820"],
    bands: [
      { min: 0, max: 0, label: "Baixo risco", level: 0, recommendation: RECO_ASSIST.baixo },
      { min: 1, max: 1, label: "Alto risco", level: 4, recommendation: RECO_ASSIST.alto },
    ],
  },
];

export const ASSIST: Scale = {
  code: "ASSIST",
  name: "ASSIST-Lite",
  fullName: "Triagem de álcool, tabaco e outras substâncias — ASSIST-Lite (OMS)",
  domain: "alcool",
  status: "ativa",
  minAge: 15,
  instructions:
    "As perguntas a seguir são sobre os últimos 3 meses. Quando você responde “Não” para uma substância, as demais perguntas sobre ela são puladas automaticamente.",
  timeframe: "Últimos 3 meses",
  options: OPTS_SIM_NAO,
  items: [
    {
      id: "801",
      text: "Você usou algum produto de tabaco (cigarro, charuto, cachimbo, narguilé, vape com nicotina)?",
      branchGroup: "ASSIST_TABACO",
      isGateway: true,
    },
    {
      id: "802",
      text: "Teve forte desejo ou vontade incontrolável de usar tabaco?",
      branchGroup: "ASSIST_TABACO",
    },
    {
      id: "803",
      text: "O uso de tabaco causou problemas de saúde, sociais, legais ou financeiros?",
      branchGroup: "ASSIST_TABACO",
    },

    {
      id: "804",
      text: "Você consumiu alguma bebida alcoólica?",
      branchGroup: "ASSIST_ALCOOL",
      isGateway: true,
    },
    {
      id: "805",
      text: "Teve forte desejo ou vontade incontrolável de beber?",
      branchGroup: "ASSIST_ALCOOL",
    },
    {
      id: "806",
      text: "O uso de bebida alcoólica causou problemas de saúde, sociais, legais ou financeiros?",
      branchGroup: "ASSIST_ALCOOL",
    },
    {
      id: "807",
      text: "Deixou de cumprir obrigações (trabalho, estudos, casa) por causa da bebida?",
      branchGroup: "ASSIST_ALCOOL",
    },

    {
      id: "808",
      text: "Você usou cannabis (maconha, haxixe, skunk)?",
      branchGroup: "ASSIST_CANNABIS",
      isGateway: true,
    },
    {
      id: "809",
      text: "Teve forte desejo ou vontade incontrolável de usar cannabis?",
      branchGroup: "ASSIST_CANNABIS",
    },
    {
      id: "810",
      text: "O uso de cannabis causou problemas de saúde, sociais, legais ou financeiros?",
      branchGroup: "ASSIST_CANNABIS",
    },

    {
      id: "811",
      text: "Você usou cocaína, crack ou estimulantes (anfetaminas, ecstasy/MD, ritalina sem prescrição)?",
      branchGroup: "ASSIST_ESTIMULANTES",
      isGateway: true,
    },
    {
      id: "812",
      text: "Teve forte desejo ou vontade incontrolável de usar cocaína ou estimulantes?",
      branchGroup: "ASSIST_ESTIMULANTES",
    },
    {
      id: "813",
      text: "O uso de cocaína ou estimulantes causou problemas de saúde, sociais, legais ou financeiros?",
      branchGroup: "ASSIST_ESTIMULANTES",
    },

    {
      id: "814",
      text: "Você usou sedativos ou remédios para dormir sem prescrição, ou em dose maior que a prescrita (benzodiazepínicos e similares)?",
      branchGroup: "ASSIST_SEDATIVOS",
      isGateway: true,
    },
    {
      id: "815",
      text: "Teve forte desejo ou vontade incontrolável de usar sedativos?",
      branchGroup: "ASSIST_SEDATIVOS",
    },
    {
      id: "816",
      text: "O uso de sedativos causou problemas de saúde, sociais, legais ou financeiros?",
      branchGroup: "ASSIST_SEDATIVOS",
    },

    {
      id: "817",
      text: "Você usou opioides sem prescrição ou em dose maior que a prescrita (codeína, tramadol, morfina, oxicodona, heroína)?",
      branchGroup: "ASSIST_OPIOIDES",
      isGateway: true,
    },
    {
      id: "818",
      text: "Teve forte desejo ou vontade incontrolável de usar opioides?",
      branchGroup: "ASSIST_OPIOIDES",
    },
    {
      id: "819",
      text: "O uso de opioides causou problemas de saúde, sociais, legais ou financeiros?",
      branchGroup: "ASSIST_OPIOIDES",
    },

    {
      id: "820",
      text: "Você usou alguma outra substância (inalantes como loló ou lança-perfume, alucinógenos como LSD ou cogumelos, ketamina)?",
      branchGroup: "ASSIST_OUTRAS",
      isGateway: true,
    },
  ],
  // Faixas do escore total (0-20) são apenas um fallback formal — a
  // classificação exibida deriva das subescalas por substância.
  bands: [
    { min: 0, max: 0, label: "Baixo risco em todas as substâncias", level: 0 },
    { min: 1, max: 20, label: "Ver classificação por substância", level: 1 },
  ],
  subscales: ASSIST_SUBSCALES,
  licenseNote:
    "ASSIST-Lite (OMS/WHO), versão em português. Escore por substância: soma dos “Sim” incluindo a pergunta-porta. Condutas: baixo = reforço positivo; moderado = intervenção breve (FRAMES); alto = avaliação especializada.",
};

/* ------------------------------------------------------------------ */
/* Definição legada (frequência 0-6 por substância, escore único)      */
/* Mantida apenas para o histórico exibir triagens antigas — não entra */
/* no fluxo (não faz parte de EXTRA_SCALES).                           */
/* ------------------------------------------------------------------ */

const OPTS_ASSIST_V0 = [
  { label: "Nunca", value: 0 },
  { label: "1 ou 2 vezes", value: 2 },
  { label: "Mensalmente", value: 3 },
  { label: "Semanalmente", value: 4 },
  { label: "Diariamente ou quase todos os dias", value: 6 },
];

export const ASSIST_V0: Scale = {
  code: "ASSIST",
  name: "ASSIST",
  fullName: "Rastreio de uso de álcool, tabaco e outras substâncias (OMS) — versão anterior",
  domain: "alcool",
  status: "estrutura",
  minAge: 15,
  instructions:
    "Nos últimos 3 meses, com que frequência você usou cada uma das substâncias abaixo?",
  timeframe: "Últimos 3 meses",
  options: OPTS_ASSIST_V0,
  items: [
    { id: "1", text: "Tabaco (cigarro, vape, narguilé)" },
    { id: "2", text: "Bebidas alcoólicas" },
    { id: "3", text: "Maconha / haxixe" },
    { id: "4", text: "Cocaína, crack ou similares" },
    { id: "5", text: "Estimulantes (anfetaminas, ecstasy, MD, ritalina sem prescrição)" },
    { id: "6", text: "Sedativos ou remédios para dormir sem prescrição (benzodiazepínicos)" },
    { id: "7", text: "Alucinógenos (LSD, cogumelos, ketamina)" },
    { id: "8", text: "Opioides (codeína, tramadol, morfina, heroína)" },
    { id: "9", text: "Inalantes (loló, cola, lança-perfume)" },
  ],
  bands: [
    { min: 0, max: 3, label: "Uso de baixo risco", level: 0 },
    { min: 4, max: 10, label: "Uso de risco — intervenção breve indicada", level: 2 },
    { min: 11, max: 54, label: "Uso de alto risco — avaliação especializada", level: 4 },
  ],
  positiveCutoff: 4,
  licenseNote:
    "Versão anterior (frequência de uso). Substituída pelo ASSIST-Lite (OMS) — mantida para leitura do histórico.",
};

const OPTS_PGSI = [
  { label: "Nunca", value: 0 },
  { label: "Às vezes", value: 1 },
  { label: "Na maioria das vezes", value: 2 },
  { label: "Quase sempre", value: 3 },
];

export const PGSI: Scale = {
  code: "PGSI",
  name: "PGSI",
  fullName: "Índice de gravidade do jogo problemático (apostas e jogos)",
  domain: "geral",
  status: "ativa",
  minAge: 15,
  instructions:
    "Pensando nos últimos 12 meses e em qualquer tipo de aposta ou jogo a dinheiro (bets, cassino online, loterias, jogo do bicho, cartas), com que frequência…",
  timeframe: "Últimos 12 meses",
  options: OPTS_PGSI,
  items: [
    { id: "1", text: "Você apostou mais do que realmente podia perder?" },
    { id: "2", text: "Você precisou apostar quantias maiores para ter a mesma emoção?" },
    { id: "3", text: "Você voltou outro dia para tentar recuperar o dinheiro perdido?" },
    { id: "4", text: "Você pegou dinheiro emprestado ou vendeu algo para conseguir apostar?" },
    { id: "5", text: "Você sentiu que poderia ter um problema com apostas ou jogos?" },
    {
      id: "6",
      text: "As apostas causaram algum problema de saúde, incluindo estresse ou ansiedade?",
    },
    { id: "7", text: "Alguém criticou suas apostas ou disse que você tinha um problema com isso?" },
    { id: "8", text: "As apostas causaram problemas financeiros a você ou à sua família?" },
    {
      id: "9",
      text: "Você se sentiu culpado(a) pelo modo como aposta ou pelo que acontece quando aposta?",
    },
  ],
  bands: [
    { min: 0, max: 0, label: "Sem risco identificado", level: 0 },
    { min: 1, max: 2, label: "Risco baixo", level: 1 },
    { min: 3, max: 7, label: "Risco moderado", level: 3 },
    { min: 8, max: 27, label: "Jogo problemático provável", level: 4 },
  ],
  positiveCutoff: 3,
};

export const EXTRA_SCALES: Scale[] = [...EXTRA_SCALES_HEAD, OCIR, ASSIST, PGSI];
