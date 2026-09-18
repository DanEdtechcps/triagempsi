/**
 * As 28 Escalas Psiquiátricas Oficiais do TriagemPsi.
 * Cada escala atende ao contrato estrito:
 * scale_code, name, fullName, domain, items, bands, risk_flags, positiveCutoff.
 */

import {
  OPTS_0_2,
  OPTS_0_3,
  OPTS_0_4,
  OPTS_SIM_NAO,
  type LikertOption,
  type Scale,
} from "./scale-types";

const OPTS_0_1_SIM_NAO = OPTS_SIM_NAO;

/* ------------------------------------------------------------------ */
/* 7. DAST-10 — Drug Abuse Screening Test                             */
/* ------------------------------------------------------------------ */
export const DAST10: Scale = {
  code: "DAST-10",
  name: "DAST-10",
  fullName: "Drug Abuse Screening Test (Rastreio de uso de substâncias)",
  domain: "alcool",
  status: "ativa",
  minAge: 15,
  instructions:
    "As perguntas a seguir dizem respeito ao uso de drogas e medicamentos sem prescrição médica nos últimos 12 meses.",
  timeframe: "Últimos 12 meses",
  options: OPTS_0_1_SIM_NAO,
  items: [
    { id: "1", text: "Você usou drogas além das prescritas por razões médicas?" },
    { id: "2", text: "Você é capaz de parar de usar drogas sempre que quiser?" }, // invertido no DAST clínico original, adaptado aqui como 1 = dificuldade
    { id: "3", text: "Você já teve 'apagões' ou flashbacks após o uso de substâncias?" },
    { id: "4", text: "Você já sentiu culpa ou remorso por causa do seu uso de drogas?" },
    { id: "5", text: "Familiares ou amigos já reclamaram do seu uso de substâncias?" },
    { id: "6", text: "O uso de drogas já causou problemas entre você e sua família?" },
    { id: "7", text: "Você já negligenciou a família ou o trabalho por causa de drogas?" },
    { id: "8", text: "Você já se envolveu em atividades ilegais para obter drogas?" },
    { id: "9", text: "Você já sentiu sintomas de abstinência (mal-estar físico ao parar)?" },
    { id: "10", text: "Você já teve problemas de saúde por causa do uso (ex.: overdose, hepatite)?" },
  ],
  bands: [
    { min: 0, max: 0, label: "Sem problemas relatados", level: 0 },
    { min: 1, max: 2, label: "Nível de risco baixo", level: 1 },
    { min: 3, max: 5, label: "Nível de risco moderado", level: 2 },
    { min: 6, max: 8, label: "Nível de risco substancial", level: 3 },
    { min: 9, max: 10, label: "Nível de risco grave", level: 4 },
  ],
  positiveCutoff: 3,
};

/* ------------------------------------------------------------------ */
/* 8. C-SSRS — Columbia Suicide Severity Rating Scale (Triagem)       */
/* ------------------------------------------------------------------ */
export const CSSRS: Scale = {
  code: "C-SSRS",
  name: "C-SSRS",
  fullName: "Columbia Suicide Severity Rating Scale (Versão Triagem)",
  domain: "risco",
  status: "ativa",
  minAge: 10,
  instructions:
    "Responda com honestidade. Suas respostas são sigilosas e prioritárias para que a equipe cuide da sua segurança.",
  timeframe: "No último mês / vida",
  options: OPTS_0_1_SIM_NAO,
  items: [
    { id: "1", text: "Você já desejou estar morto(a) ou desejou poder dormir e não acordar mais?" },
    { id: "2", text: "Você já teve pensamentos sobre se matar de forma geral?" },
    { id: "3", text: "Você pensou em como poderia fazer isso (pensou em algum método)?" },
    { id: "4", text: "Você teve esses pensamentos e alguma intenção de colocá-los em prática?" },
    { id: "5", text: "Você já começou a elaborar ou elaborou os detalhes de como se matar com intenção de agir?" },
    { id: "6", text: "Você já fez algo, começou a fazer ou se preparou para tentar tirar a própria vida?" },
  ],
  bands: [
    { min: 0, max: 0, label: "Sem risco identificado no rastreio", level: 0 },
    { min: 1, max: 2, label: "Risco baixo — ideação passiva sem método", level: 2 },
    { min: 3, max: 3, label: "Risco moderado — ideação com métodos considerados", level: 3 },
    { min: 4, max: 6, label: "Risco alto / iminente — intenção, plano ou comportamento recente", level: 4 },
  ],
  positiveCutoff: 1,
  riskItems: ["1", "2", "3", "4", "5", "6"],
};

/* ------------------------------------------------------------------ */
/* 9. Y-BOCS — Yale-Brown Obsessive Compulsive Scale (Rastreio)       */
/* ------------------------------------------------------------------ */
export const YBOCS: Scale = {
  code: "Y-BOCS",
  name: "Y-BOCS",
  fullName: "Escala Yale-Brown de Sintomas Obsessivo-Compulsivos (Rastreio)",
  domain: "obsessivo",
  status: "ativa",
  minAge: 14,
  instructions: "Avalie o tempo, a angústia e o controle sobre seus pensamentos repetitivos e manias na última semana.",
  timeframe: "Última semana",
  options: [
    { label: "Nenhum", value: 0 },
    { label: "Leve (menos de 1h/dia)", value: 1 },
    { label: "Moderado (1h a 3h/dia)", value: 2 },
    { label: "Grave (3h a 8h/dia)", value: 3 },
    { label: "Extremo (mais de 8h/dia)", value: 4 },
  ],
  items: [
    { id: "1", text: "Tempo ocupado por pensamentos obsessivos" },
    { id: "2", text: "Interferência dos pensamentos obsessivos na sua rotina" },
    { id: "3", text: "Angústia associada aos pensamentos obsessivos" },
    { id: "4", text: "Resistência contra os pensamentos obsessivos" },
    { id: "5", text: "Grau de controle sobre os pensamentos obsessivos" },
    { id: "6", text: "Tempo gasto executando comportamentos compulsivos/rituais" },
    { id: "7", text: "Interferência dos comportamentos compulsivos na sua rotina" },
    { id: "8", text: "Angústia se impedido(a) de realizar as compulsões" },
    { id: "9", text: "Resistência contra os comportamentos compulsivos" },
    { id: "10", text: "Grau de controle sobre os comportamentos compulsivos" },
  ],
  bands: [
    { min: 0, max: 7, label: "Sintomas subclínicos", level: 0 },
    { min: 8, max: 15, label: "TOC leve", level: 1 },
    { min: 16, max: 23, label: "TOC moderado", level: 2 },
    { min: 24, max: 31, label: "TOC grave", level: 3 },
    { min: 32, max: 40, label: "TOC extremo", level: 4 },
  ],
  positiveCutoff: 16,
};

/* ------------------------------------------------------------------ */
/* 13. SPIN — Social Phobia Inventory (Fobia Social)                  */
/* ------------------------------------------------------------------ */
export const SPIN: Scale = {
  code: "SPIN",
  name: "SPIN",
  fullName: "Inventário de Fobia Social (Social Phobia Inventory)",
  domain: "ansiedade",
  status: "ativa",
  minAge: 14,
  instructions: "Indique o quanto os seguintes problemas incomodaram você durante a última semana.",
  timeframe: "Última semana",
  options: OPTS_0_4,
  items: [
    { id: "1", text: "Tenho medo de pessoas que têm autoridade" },
    { id: "2", text: "Fico incomodado(a) por ficar vermelho(a) na frente de outras pessoas" },
    { id: "3", text: "Festas e eventos sociais me deixam assustado(a)" },
    { id: "4", text: "Evito falar com pessoas que não conheço bem" },
    { id: "5", text: "Ser criticado(a) me assusta muito" },
    { id: "6", text: "Evito fazer coisas quando as pessoas podem me olhar" },
    { id: "7", text: "Suar na frente dos outros me incomoda muito" },
    { id: "8", text: "Evito ir a festas" },
    { id: "9", text: "Evito atividades em que eu seja o centro das atenções" },
    { id: "10", text: "Falar com estranhos me assusta" },
    { id: "11", text: "Evito ter que fazer palestras ou discursos" },
    { id: "12", text: "Faria quase tudo para evitar ser criticado(a)" },
    { id: "13", text: "Meu coração dispara quando estou com outras pessoas" },
    { id: "14", text: "Tenho medo de parecer ridículo(a) ou tolo(a)" },
    { id: "15", text: "Evito conversar com qualquer pessoa em posição de autoridade" },
    { id: "16", text: "Tremo quando estou na presença de outras pessoas" },
    { id: "17", text: "Evito ser observado(a) comendo ou bebendo em público" },
  ],
  bands: [
    { min: 0, max: 19, label: "Sem fobia social relevante", level: 0 },
    { min: 20, max: 30, label: "Fobia social leve", level: 1 },
    { min: 31, max: 40, label: "Fobia social moderada", level: 2 },
    { min: 41, max: 50, label: "Fobia social grave", level: 3 },
    { min: 51, max: 68, label: "Fobia social muito grave", level: 4 },
  ],
  positiveCutoff: 19,
};

/* ------------------------------------------------------------------ */
/* 14. PDSS-SR — Panic Disorder Severity Scale (Pânico)               */
/* ------------------------------------------------------------------ */
export const PDSS_SR: Scale = {
  code: "PDSS-SR",
  name: "PDSS-SR",
  fullName: "Escala de Gravidade do Transtorno de Pânico (Autorrelato)",
  domain: "ansiedade",
  status: "ativa",
  minAge: 14,
  instructions: "Responda às questões abaixo pensando na última semana e nos ataques ou sensações de pânico.",
  timeframe: "Última semana",
  options: OPTS_0_4,
  items: [
    { id: "1", text: "Quantos episódios de pânico ou crises súbitas de ansiedade você teve?" },
    { id: "2", text: "Quão angustiantes ou intensos foram esses episódios de pânico?" },
    { id: "3", text: "Quanto você se preocupou com a possibilidade de ter novos ataques?" },
    { id: "4", text: "Quanto você evitou lugares ou situações por medo de ter um ataque de pânico?" },
    { id: "5", text: "Quanto você evitou sensações corporais (ex.: café, exercício, calor) por medo de pânico?" },
    { id: "6", text: "Quanto os sintomas de pânico atrapalharam seu trabalho ou estudos?" },
    { id: "7", text: "Quanto os sintomas de pânico atrapalharam sua vida social e seus relacionamentos?" },
  ],
  bands: [
    { min: 0, max: 3, label: "Normal / Sintomas subclínicos de pânico", level: 0 },
    { min: 4, max: 7, label: "Transtorno de pânico borderline (limítrofe)", level: 1 },
    { min: 8, max: 10, label: "Transtorno de pânico leve", level: 2 },
    { min: 11, max: 13, label: "Transtorno de pânico moderado", level: 3 },
    { min: 14, max: 28, label: "Transtorno de pânico grave", level: 4 },
  ],
  positiveCutoff: 8,
};

/* ------------------------------------------------------------------ */
/* 15. BES — Binge Eating Scale (Compulsão Alimentar)                  */
/* ------------------------------------------------------------------ */
export const BES: Scale = {
  code: "BES",
  name: "BES",
  fullName: "Escala de Compulsão Alimentar Periódica (Binge Eating Scale)",
  domain: "alimentar",
  status: "ativa",
  minAge: 15,
  instructions: "Selecione o grupo de afirmações que melhor descreve seus hábitos alimentares e sentimentos.",
  timeframe: "Últimos meses",
  options: [
    { label: "Ausente / Sem descontrole", value: 0 },
    { label: "Leve / Ocasional", value: 1 },
    { label: "Moderado / Frequente", value: 2 },
    { label: "Grave / Perda total de controle", value: 3 },
  ],
  items: [
    { id: "1", text: "Comer rápido demais ou sem mastigar" },
    { id: "2", text: "Comer até se sentir desconfortavelmente empanturrado(a)" },
    { id: "3", text: "Comer grandes quantidades de comida mesmo sem fome física" },
    { id: "4", text: "Comer sozinho(a) por vergonha da quantidade que ingere" },
    { id: "5", text: "Sentir culpa, desgosto ou tristeza após comer em excesso" },
    { id: "6", text: "Sensação de não conseguir parar de comer depois que começa" },
    { id: "7", text: "Comer escondido de familiares ou colegas" },
    { id: "8", text: "Preocupação contínua e obsessiva com comida e dietas" },
    { id: "9", text: "Uso de comida para lidar com ansiedade, raiva ou solidão" },
    { id: "10", text: "Sentimento de impotência diante do impulso de comer" },
    { id: "11", text: "Ciclos de restrição alimentar severa seguidos de excessos" },
    { id: "12", text: "Sensação de que o peso dita inteiramente o valor pessoal" },
    { id: "13", text: "Comer à noite após já ter jantado (beliscar incontrolável)" },
    { id: "14", text: "Dificuldade em reconhecer sinais de saciedade" },
    { id: "15", text: "Desespero após episódios de descontrole alimentar" },
    { id: "16", text: "Comportamentos compensatórios ou ódio pelo próprio corpo" },
  ],
  bands: [
    { min: 0, max: 17, label: "Sem compulsão alimentar significativa", level: 0 },
    { min: 18, max: 26, label: "Compulsão alimentar moderada", level: 2 },
    { min: 27, max: 48, label: "Compulsão alimentar grave", level: 4 },
  ],
  positiveCutoff: 18,
};

/* ------------------------------------------------------------------ */
/* 17. MBI-HSS — Maslach Burnout Inventory (Versão Rastreio)          */
/* ------------------------------------------------------------------ */
export const MBI_HSS: Scale = {
  code: "MBI-HSS",
  name: "MBI-HSS",
  fullName: "Inventário de Burnout de Maslach (Versão Breve)",
  domain: "ocupacional",
  status: "ativa",
  minAge: 18,
  instructions: "Pensando no seu trabalho habitual, com que frequência você vivencia cada uma destas sensações?",
  timeframe: "No trabalho atual",
  options: [
    { label: "Nunca", value: 0 },
    { label: "Raramente (algumas vezes ao ano)", value: 1 },
    { label: "Ocasionalmente (uma vez ao mês)", value: 2 },
    { label: "Frequentemente (algumas vezes ao mês)", value: 3 },
    { label: "Muito frequentemente (uma vez por semana)", value: 4 },
    { label: "Quase sempre (algumas vezes por semana)", value: 5 },
    { label: "Diariamente", value: 6 },
  ],
  items: [
    { id: "1", text: "Sinto-me emocionalmente esgotado(a) com o meu trabalho" },
    { id: "2", text: "Sinto-me consumido(a) e no limite das minhas forças ao fim do dia" },
    { id: "3", text: "Acordo cansado(a) só de pensar em encarar outro dia de trabalho" },
    { id: "4", text: "Sinto que estou me tornando mais insensível e frio(a) com as pessoas" },
    { id: "5", text: "Preocupo-me com o fato de este trabalho estar me endurecendo emocionalmente" },
    { id: "6", text: "Não me importo realmente com o que acontece com algumas pessoas no serviço" },
    { id: "7", text: "Sinto que não estou alcançando realizações que realmente valham a pena" },
    { id: "8", text: "Tenho dificuldade em me entusiasmar com novos projetos profissionais" },
    { id: "9", text: "Sinto que minha energia e eficácia profissional caíram drasticamente" },
  ],
  bands: [
    { min: 0, max: 15, label: "Baixo risco de Burnout", level: 0 },
    { min: 16, max: 27, label: "Risco moderado de Burnout", level: 2 },
    { min: 28, max: 54, label: "Alto risco de Síndrome de Burnout", level: 4 },
  ],
  positiveCutoff: 28,
};

/* ------------------------------------------------------------------ */
/* 18. CRAFFT — Screening Tool para Jovens e Adolescentes              */
/* ------------------------------------------------------------------ */
export const CRAFFT: Scale = {
  code: "CRAFFT",
  name: "CRAFFT",
  fullName: "CRAFFT 2.1 (Rastreio de Substâncias em Jovens e Adolescentes)",
  domain: "alcool",
  status: "ativa",
  minAge: 11,
  maxAge: 21,
  instructions: "Responda com sinceridade sim ou não sobre os últimos 12 meses.",
  timeframe: "Últimos 12 meses",
  options: OPTS_0_1_SIM_NAO,
  items: [
    { id: "1", text: "Você já andou em um CARRO dirigido por alguém (inclusive você) que estava sob efeito de álcool ou drogas?" },
    { id: "2", text: "Você já usou álcool ou drogas para RELAXAR, se sentir melhor consigo mesmo(a) ou se enturmar?" },
    { id: "3", text: "Você já usou álcool ou drogas quando estava SOZINHO(A) (ALONE)?" },
    { id: "4", text: "Você já ESQUECEU (FORGET) coisas que fez enquanto usava álcool ou drogas?" },
    { id: "5", text: "Sua FAMÍLIA ou AMIGOS já disseram que você deveria diminuir o uso de bebidas ou drogas?" },
    { id: "6", text: "Você já se meteu em PROBLEMAS (TROUBLE) enquanto estava usando álcool ou drogas?" },
  ],
  bands: [
    { min: 0, max: 1, label: "Baixo risco — aconselhamento preventivo", level: 0 },
    { min: 2, max: 6, label: "Risco significativo — investigar transtorno por uso de substâncias", level: 3 },
  ],
  positiveCutoff: 2,
  riskItems: ["1", "6"],
};

/* ------------------------------------------------------------------ */
/* 20. HADS — Hospital Anxiety and Depression Scale                   */
/* ------------------------------------------------------------------ */
export const HADS: Scale = {
  code: "HADS",
  name: "HADS",
  fullName: "Escala Hospitalar de Ansiedade e Depressão",
  domain: "geral",
  status: "ativa",
  minAge: 14,
  instructions: "Escolha a resposta que melhor descreve como você se sentiu na última semana.",
  timeframe: "Última semana",
  options: OPTS_0_3,
  items: [
    { id: "1", text: "Eu me sinto tenso(a) ou contraído(a) (Ansiedade)" },
    { id: "2", text: "Eu ainda sinto prazer nas coisas que costumava gostar (Depressão - Invertido)" },
    { id: "3", text: "Eu sinto uma espécie de medo, como se algo ruim fosse acontecer (Ansiedade)" },
    { id: "4", text: "Dou risada e consigo ver o lado divertido das coisas (Depressão - Invertido)" },
    { id: "5", text: "Tenho a cabeça cheia de preocupações (Ansiedade)" },
    { id: "6", text: "Sinto-me alegre (Depressão - Invertido)" },
    { id: "7", text: "Consigo ficar sentado(a) à vontade e me sentir relaxado(a) (Ansiedade - Invertido)" },
    { id: "8", text: "Sinto-me lento(a), como se fizesse as coisas devagar (Depressão)" },
    { id: "9", text: "Sinto uma sensação ruim de frio no estômago ou aperto (Ansiedade)" },
    { id: "10", text: "Perdi o interesse em cuidar da minha aparência (Depressão)" },
    { id: "11", text: "Fico inquieto(a), como se precisasse estar sempre me mexendo (Ansiedade)" },
    { id: "12", text: "Fico esperando com prazer as coisas que estão por vir (Depressão - Invertido)" },
    { id: "13", text: "Tenho crises repentinas de pânico (Ansiedade)" },
    { id: "14", text: "Consigo apreciar um bom livro ou programa de TV (Depressão - Invertido)" },
  ],
  bands: [
    { min: 0, max: 14, label: "Normal / Ausência de sintomas significativos", level: 0 },
    { min: 15, max: 21, label: "Sintomas limítrofes (borderline)", level: 2 },
    { min: 22, max: 42, label: "Caso provável de ansiedade / depressão clínica", level: 4 },
  ],
  positiveCutoff: 15,
};

/* ------------------------------------------------------------------ */
/* 21. PSS-10 — Perceived Stress Scale-10                              */
/* ------------------------------------------------------------------ */
const PSS_DIR: LikertOption[] = [
  { label: "Nunca", value: 0 },
  { label: "Quase nunca", value: 1 },
  { label: "Às vezes", value: 2 },
  { label: "Frequentemente", value: 3 },
  { label: "Muito frequentemente", value: 4 },
];
const PSS_INV: LikertOption[] = [
  { label: "Nunca", value: 4 },
  { label: "Quase nunca", value: 3 },
  { label: "Às vezes", value: 2 },
  { label: "Frequentemente", value: 1 },
  { label: "Muito frequentemente", value: 0 },
];

export const PSS10: Scale = {
  code: "PSS-10",
  name: "PSS-10",
  fullName: "Escala de Estresse Percebido (Perceived Stress Scale-10)",
  domain: "geral",
  status: "ativa",
  minAge: 12,
  instructions: "No último mês, com que frequência você se sentiu da seguinte forma?",
  timeframe: "Último mês",
  options: PSS_DIR,
  items: [
    { id: "1", text: "Ficou chateado(a) por causa de algo que aconteceu inesperadamente?" },
    { id: "2", text: "Sentiu que não conseguia controlar as coisas importantes da sua vida?" },
    { id: "3", text: "Sentiu-se nervoso(a) e estressado(a)?" },
    { id: "4", text: "Sentiu-se confiante na sua habilidade de lidar com seus problemas pessoais?", options: PSS_INV },
    { id: "5", text: "Sentiu que as coisas estavam acontecendo de acordo com a sua vontade?", options: PSS_INV },
    { id: "6", text: "Sentiu que não conseguia lidar com todas as coisas que tinha que fazer?" },
    { id: "7", text: "Conseguiu controlar as irritações na sua vida?", options: PSS_INV },
    { id: "8", text: "Sentiu que estava no controle de tudo?", options: PSS_INV },
    { id: "9", text: "Ficou irritado(a) porque as coisas saíram do seu controle?" },
    { id: "10", text: "Sentiu que as dificuldades estavam se acumulando a ponto de você não poder superá-las?" },
  ],
  bands: [
    { min: 0, max: 13, label: "Baixo estresse percebido", level: 0 },
    { min: 14, max: 26, label: "Estresse percebido moderado", level: 2 },
    { min: 27, max: 40, label: "Alto estresse percebido", level: 4 },
  ],
  positiveCutoff: 14,
};

/* ------------------------------------------------------------------ */
/* 22. WHO-5 — WHO-5 Well-Being Index (Bem-Estar)                     */
/* ------------------------------------------------------------------ */
export const WHO5: Scale = {
  code: "WHO-5",
  name: "WHO-5",
  fullName: "Índice de Bem-Estar da OMS (WHO-5 Well-Being Index)",
  domain: "geral",
  status: "ativa",
  minAge: 10,
  instructions:
    "Nas últimas duas semanas, com que frequência você se sentiu como descrito abaixo?",
  timeframe: "Últimas 2 semanas",
  options: [
    { label: "Nunca (0)", value: 0 },
    { label: "De vez em quando (1)", value: 1 },
    { label: "Menos da metade do tempo (2)", value: 2 },
    { label: "Mais da metade do tempo (3)", value: 3 },
    { label: "A maior parte do tempo (4)", value: 4 },
    { label: "O tempo todo (5)", value: 5 },
  ],
  items: [
    { id: "1", text: "Tenho me sentido alegre e bem-disposto(a)" },
    { id: "2", text: "Tenho me sentido calmo(a) e relaxado(a)" },
    { id: "3", text: "Tenho me sentido ativo(a) e vigoroso(a)" },
    { id: "4", text: "Acordei descansado(a) e revigorado(a)" },
    { id: "5", text: "Minha vida diária tem sido cheia de coisas que me interessam" },
  ],
  bands: [
    { min: 0, max: 7, label: "Bem-estar muito reduzido (≤ 28%) — alto risco depressivo", level: 4 },
    { min: 8, max: 12, label: "Baixo bem-estar (32-48%) — investigar humor depressivo", level: 2 },
    { min: 13, max: 25, label: "Bem-estar adequado (≥ 52%)", level: 0 },
  ],
  positiveCutoff: 12,
};

/* ------------------------------------------------------------------ */
/* 23. ASRS-Criança/Adolescente — Rastreio TDAH Infantojuvenil        */
/* ------------------------------------------------------------------ */
export const ASRS_C: Scale = {
  code: "ASRS-C",
  name: "ASRS-Criança",
  fullName: "Rastreio de Sintomas de TDAH Infantojuvenil (Idade < 18 anos)",
  domain: "tdah",
  status: "ativa",
  maxAge: 17,
  informantMode: "ambos",
  instructions: "Avalie a frequência com que a criança/adolescente apresenta os seguintes comportamentos.",
  timeframe: "Últimos 6 meses",
  options: OPTS_0_3,
  items: [
    { id: "1", text: "Dificuldade em manter a atenção em tarefas escolares ou brincadeiras" },
    { id: "2", text: "Parece não escutar quando se fala diretamente com ela" },
    { id: "3", text: "Não segue instruções e não termina deveres ou tarefas" },
    { id: "4", text: "Dificuldade para organizar tarefas e atividades" },
    { id: "5", text: "Evita ou reluta em se envolver em tarefas que exijam esforço mental constante" },
    { id: "6", text: "Perde coisas necessárias para as atividades (livros, lápis, brinquedos)" },
    { id: "7", text: "Distrai-se facilmente com estímulos externos" },
    { id: "8", text: "Esquece de atividades do dia a dia" },
    { id: "9", text: "Mexe com as mãos ou os pés, ou se remexe na cadeira" },
    { id: "10", text: "Levanta-se da cadeira em sala de aula ou em outras situações onde se espera que fique sentada" },
    { id: "11", text: "Corre ou sobe nas coisas em situações inapropriadas" },
    { id: "12", text: "Dificuldade em brincar ou se envolver silenciosamente em atividades de lazer" },
    { id: "13", text: "Parece estar a mil por hora ou movida por um motor" },
    { id: "14", text: "Fala em excesso" },
    { id: "15", text: "Dá respostas precipitadas antes de as perguntas terem sido concluídas" },
    { id: "16", text: "Dificuldade para esperar a sua vez" },
  ],
  bands: [
    { min: 0, max: 15, label: "Rastreio negativo para TDAH infantojuvenil", level: 0 },
    { min: 16, max: 24, label: "Sintomas limítrofes de atenção/hiperatividade", level: 2 },
    { min: 25, max: 48, label: "Rastreio positivo — investigar TDAH infantojuvenil", level: 3 },
  ],
  positiveCutoff: 16,
};

/* ------------------------------------------------------------------ */
/* 25. CGI-S — Impressão Clínica Global (Versão Paciente)             */
/* ------------------------------------------------------------------ */
export const CGI_S: Scale = {
  code: "CGI-S",
  name: "CGI-S",
  fullName: "Impressão Clínica Global de Gravidade (Autoavaliação)",
  domain: "geral",
  status: "ativa",
  minAge: 12,
  instructions: "Considerando sua experiência geral com suas queixas emocionais no momento presente, como você se avalia?",
  timeframe: "Momento atual",
  options: [
    { label: "0 - Sem sintomas / Normal", value: 0 },
    { label: "1 - Normal, não me sinto doente", value: 1 },
    { label: "2 - No limite, desconforto quase imperceptível", value: 2 },
    { label: "3 - Levemente doente / afetado(a)", value: 3 },
    { label: "4 - Moderadamente doente / afetado(a)", value: 4 },
    { label: "5 - Notavelmente doente / sofrimento evidente", value: 5 },
    { label: "6 - Gravemente doente / impacto forte no dia a dia", value: 6 },
    { label: "7 - Entre os mais extremamente doentes / sofrimento insuportável", value: 7 },
  ],
  items: [
    { id: "1", text: "Gravidade global percebida do seu sofrimento psíquico atual" },
  ],
  bands: [
    { min: 0, max: 2, label: "Normal / Limítrofe", level: 0 },
    { min: 3, max: 3, label: "Sintomas leves", level: 1 },
    { min: 4, max: 4, label: "Sintomas moderados", level: 2 },
    { min: 5, max: 5, label: "Sintomas acentuados / sofrimento evidente", level: 3 },
    { min: 6, max: 7, label: "Gravidade severa / extrema", level: 4 },
  ],
  positiveCutoff: 4,
};

/* ------------------------------------------------------------------ */
/* 26. WSAS — Work and Social Adjustment Scale (Prejuízo Funcional)   */
/* ------------------------------------------------------------------ */
export const WSAS: Scale = {
  code: "WSAS",
  name: "WSAS",
  fullName: "Escala de Ajuste Social e Profissional (Work and Social Adjustment Scale)",
  domain: "geral",
  status: "ativa",
  minAge: 14,
  instructions: "Por causa do seu problema de saúde mental, quanto a sua capacidade de realizar o seguinte é afetada?",
  timeframe: "Momento atual",
  options: [
    { label: "0 - Nada afetada", value: 0 },
    { label: "1", value: 1 },
    { label: "2 - Levemente", value: 2 },
    { label: "3", value: 3 },
    { label: "4 - Moderadamente", value: 4 },
    { label: "5", value: 5 },
    { label: "6 - Acentuadamente", value: 6 },
    { label: "7", value: 7 },
    { label: "8 - Severamente / Incapaz de realizar", value: 8 },
  ],
  items: [
    { id: "1", text: "Capacidade de trabalhar ou estudar" },
    { id: "2", text: "Capacidade de gerenciar a casa (limpeza, compras, cozinhar, contas)" },
    { id: "3", text: "Atividades de lazer social (encontrar amigos, ir a festas, passear)" },
    { id: "4", text: "Atividades de lazer individual (hobbies, leitura, esportes)" },
    { id: "5", text: "Capacidade de manter relacionamentos familiares e afetivos próximos" },
  ],
  bands: [
    { min: 0, max: 9, label: "Prejuízo funcional mínimo ou ausente", level: 0 },
    { min: 10, max: 20, label: "Prejuízo funcional significativo / moderado", level: 2 },
    { min: 21, max: 40, label: "Prejuízo funcional severo / incapacitante", level: 4 },
  ],
  positiveCutoff: 10,
};

/* ------------------------------------------------------------------ */
/* 28. RISK-COMPOSITE — Agregador de Risco Clínico Crítico           */
/* ------------------------------------------------------------------ */
export const RISK_COMPOSITE: Scale = {
  code: "RISK-COMPOSITE",
  name: "Risk Composite",
  fullName: "Painel Agregado de Riscos e Sinais de Alerta Clínico",
  domain: "risco",
  status: "ativa",
  instructions: "Indicador clínico interno composto por sinais de risco iminente.",
  options: OPTS_0_1_SIM_NAO,
  items: [
    { id: "suicidio", text: "Ideação suicida ativa ou histórico de tentativa recente" },
    { id: "psicose", text: "Sintomas psicóticos, alucinações ou delírios relatados" },
    { id: "mania", text: "Episódio de euforia ou aceleração com risco de conduta impulsiva" },
    { id: "violencia", text: "Ameaça ou risco de agressão contra terceiros" },
    { id: "gravidez_medicamento", text: "Gravidez em curso com uso de psicotrópicos de risco" },
  ],
  bands: [
    { min: 0, max: 0, label: "Sem sinais de alerta crítico imediato", level: 0 },
    { min: 1, max: 2, label: "Atenção clínica prioritária", level: 2 },
    { min: 3, max: 5, label: "Emergência / Risco clínico severo", level: 4 },
  ],
  positiveCutoff: 1,
  riskItems: ["suicidio", "psicose", "mania", "violencia", "gravidez_medicamento"],
};

export const OFFICIAL_28_EXTRA_SCALES: Scale[] = [
  DAST10,
  CSSRS,
  YBOCS,
  SPIN,
  PDSS_SR,
  BES,
  MBI_HSS,
  CRAFFT,
  HADS,
  PSS10,
  WHO5,
  ASRS_C,
  CGI_S,
  WSAS,
  RISK_COMPOSITE,
];
