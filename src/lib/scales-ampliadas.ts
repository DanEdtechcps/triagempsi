import { OPTS_SIM_NAO, type LikertOption, type Scale } from "./scale-types";

/**
 * Ampliação clínica 2026 — cobertura de públicos que faltavam no motor.
 *
 * MDQ (bipolaridade), Fagerström (nicotina), EPDS (gestantes e puérperas),
 * SCOFF (transtornos alimentares), ISI (insônia), AQ-10 (traços autísticos)
 * e AD-8 (declínio cognitivo, respondido por informante).
 *
 * Todas seguem o mesmo contrato das demais escalas: são apenas dados.
 */

const SIM1_NAO0 = OPTS_SIM_NAO;
const SIM0_NAO1: LikertOption[] = [
  { label: "Não", value: 0 },
  { label: "Sim", value: 1 },
];

/* ------------------------------------------------------------------ */
/* MDQ — rastreio de bipolaridade                                      */
/* ------------------------------------------------------------------ */

export const MDQ: Scale = {
  code: "MDQ",
  name: "MDQ",
  fullName: "Questionário de Transtornos do Humor (rastreio de bipolaridade)",
  domain: "bipolar",
  status: "ativa",
  minAge: 15,
  informantMode: "ambos",
  instructions:
    "Pense em qualquer período da sua vida em que você NÃO estava do seu jeito habitual. Nesses períodos…",
  timeframe: "Ao longo da vida",
  options: SIM1_NAO0,
  items: [
    { id: "1", text: "Você se sentiu tão bem ou tão elétrico(a) que outras pessoas acharam que você não estava normal, ou ficou tão elétrico(a) que se meteu em confusão?" },
    { id: "2", text: "Você ficou tão irritado(a) que gritou com as pessoas ou começou brigas e discussões?" },
    { id: "3", text: "Você se sentiu muito mais autoconfiante do que de costume?" },
    { id: "4", text: "Você dormiu muito menos que de costume e não sentiu falta do sono?" },
    { id: "5", text: "Você falou muito mais ou muito mais rápido do que de costume?" },
    { id: "6", text: "Os pensamentos corriam pela sua cabeça sem parar ou você não conseguia diminuir o ritmo deles?" },
    { id: "7", text: "Você se distraiu com tanta facilidade com coisas ao redor que teve dificuldade de se concentrar ou de manter o rumo?" },
    { id: "8", text: "Você teve muito mais energia do que de costume?" },
    { id: "9", text: "Você ficou muito mais ativo(a) ou fez muito mais coisas do que de costume?" },
    { id: "10", text: "Você ficou muito mais sociável ou extrovertido(a), por exemplo, telefonando para amigos no meio da noite?" },
    { id: "11", text: "Você teve muito mais interesse por sexo do que de costume?" },
    { id: "12", text: "Você fez coisas incomuns para você, que outras pessoas acharam excessivas, tolas ou arriscadas?" },
    { id: "13", text: "Gastar dinheiro trouxe problemas para você ou para sua família?" },
  ],
  bands: [
    { min: 0, max: 6, label: "Rastreio negativo para bipolaridade", level: 0 },
    { min: 7, max: 13, label: "Rastreio positivo — investigar espectro bipolar", level: 3 },
  ],
  positiveCutoff: 7,
  licenseNote:
    "Rastreio. Um MDQ positivo não fecha diagnóstico: exige confirmação de simultaneidade dos sintomas e de prejuízo na entrevista clínica.",
};

/* ------------------------------------------------------------------ */
/* Fagerström (FTND) — dependência de nicotina                         */
/* ------------------------------------------------------------------ */

export const FTND: Scale = {
  code: "FTND",
  name: "Fagerström",
  fullName: "Teste de Fagerström para dependência de nicotina",
  domain: "tabaco",
  status: "ativa",
  minAge: 12,
  instructions:
    "As perguntas abaixo se referem ao seu consumo de tabaco (cigarro, cigarro eletrônico/vape, narguilé ou tabaco de enrolar).",
  timeframe: "Hábito atual",
  options: SIM1_NAO0,
  items: [
    {
      id: "1",
      text: "Quanto tempo depois de acordar você fuma o primeiro cigarro?",
      options: [
        { label: "Depois de 60 minutos", value: 0 },
        { label: "Entre 31 e 60 minutos", value: 1 },
        { label: "Entre 6 e 30 minutos", value: 2 },
        { label: "Nos primeiros 5 minutos", value: 3 },
      ],
    },
    {
      id: "2",
      text: "Você acha difícil não fumar em lugares onde é proibido?",
      options: SIM1_NAO0,
    },
    {
      id: "3",
      text: "Qual cigarro do dia lhe traz mais satisfação?",
      options: [
        { label: "Qualquer outro", value: 0 },
        { label: "O primeiro da manhã", value: 1 },
      ],
    },
    {
      id: "4",
      text: "Quantos cigarros você fuma por dia?",
      options: [
        { label: "Até 10", value: 0 },
        { label: "De 11 a 20", value: 1 },
        { label: "De 21 a 30", value: 2 },
        { label: "31 ou mais", value: 3 },
      ],
    },
    {
      id: "5",
      text: "Você fuma mais nas primeiras horas da manhã do que no resto do dia?",
      options: SIM1_NAO0,
    },
    {
      id: "6",
      text: "Você fuma mesmo quando está tão doente que precisa ficar de cama a maior parte do dia?",
      options: SIM1_NAO0,
    },
  ],
  bands: [
    { min: 0, max: 2, label: "Dependência muito baixa", level: 0 },
    { min: 3, max: 4, label: "Dependência baixa", level: 1 },
    { min: 5, max: 5, label: "Dependência média", level: 2 },
    { min: 6, max: 7, label: "Dependência elevada", level: 3 },
    { min: 8, max: 10, label: "Dependência muito elevada", level: 4 },
  ],
  positiveCutoff: 5,
};

/* ------------------------------------------------------------------ */
/* EPDS — depressão perinatal (gestantes e puérperas)                  */
/* ------------------------------------------------------------------ */

const EPDS_DIR: LikertOption[] = [
  { label: "Nunca", value: 0 },
  { label: "Poucas vezes", value: 1 },
  { label: "Na maioria das vezes", value: 2 },
  { label: "Sempre", value: 3 },
];
const EPDS_INV: LikertOption[] = [
  { label: "Sempre, como antes", value: 0 },
  { label: "Um pouco menos que antes", value: 1 },
  { label: "Bem menos que antes", value: 2 },
  { label: "Quase nada", value: 3 },
];

export const EPDS: Scale = {
  code: "EPDS",
  name: "EPDS",
  fullName: "Escala de Depressão Pós-Parto de Edimburgo (gestação e puerpério)",
  domain: "perinatal",
  status: "ativa",
  minAge: 12,
  instructions:
    "Você está grávida ou teve um bebê recentemente. Pensando nos últimos 7 dias, escolha a resposta que mais se aproxima de como você se sentiu.",
  timeframe: "Últimos 7 dias",
  options: EPDS_DIR,
  items: [
    { id: "1", text: "Tenho conseguido rir e achar graça das coisas.", options: EPDS_INV },
    { id: "2", text: "Tenho olhado para o futuro com alegria e expectativa.", options: EPDS_INV },
    { id: "3", text: "Tenho me culpado sem necessidade quando as coisas dão errado." },
    { id: "4", text: "Tenho ficado ansiosa ou preocupada sem um bom motivo." },
    { id: "5", text: "Tenho me sentido assustada ou em pânico sem um bom motivo." },
    { id: "6", text: "Tenho sentido que as coisas estão me sobrecarregando." },
    { id: "7", text: "Tenho me sentido tão infeliz que tenho dificuldade para dormir." },
    { id: "8", text: "Tenho me sentido triste ou arrasada." },
    { id: "9", text: "Tenho me sentido tão infeliz que tenho chorado." },
    { id: "10", text: "Tenho tido pensamentos de fazer mal a mim mesma." },
  ],
  bands: [
    { min: 0, max: 9, label: "Sem indicação relevante", level: 0 },
    { min: 10, max: 12, label: "Sintomas depressivos possíveis — reavaliar", level: 2 },
    { min: 13, max: 30, label: "Rastreio positivo para depressão perinatal", level: 4 },
  ],
  positiveCutoff: 10,
  riskItems: ["10"],
};

/* ------------------------------------------------------------------ */
/* SCOFF — transtornos alimentares                                     */
/* ------------------------------------------------------------------ */

export const SCOFF: Scale = {
  code: "SCOFF",
  name: "SCOFF",
  fullName: "Rastreio de transtornos alimentares",
  domain: "alimentar",
  status: "ativa",
  minAge: 11,
  informantMode: "ambos",
  instructions: "Responda sim ou não pensando nos últimos meses.",
  options: SIM1_NAO0,
  items: [
    { id: "1", text: "Você provoca vômito por se sentir desconfortavelmente cheio(a)?" },
    { id: "2", text: "Você se preocupa por ter perdido o controle sobre o quanto come?" },
    { id: "3", text: "Você perdeu mais de 6 kg em um período de três meses?" },
    { id: "4", text: "Você acredita estar gordo(a) mesmo quando os outros dizem que está magro(a)?" },
    { id: "5", text: "Você diria que a comida domina a sua vida?" },
  ],
  bands: [
    { min: 0, max: 1, label: "Rastreio negativo", level: 0 },
    { min: 2, max: 5, label: "Rastreio positivo — investigar transtorno alimentar", level: 3 },
  ],
  positiveCutoff: 2,
};

/* ------------------------------------------------------------------ */
/* ISI — insônia                                                       */
/* ------------------------------------------------------------------ */

const ISI_OPTS: LikertOption[] = [
  { label: "Nenhuma", value: 0 },
  { label: "Leve", value: 1 },
  { label: "Moderada", value: 2 },
  { label: "Grave", value: 3 },
  { label: "Muito grave", value: 4 },
];
const ISI_SAT: LikertOption[] = [
  { label: "Muito satisfeito(a)", value: 0 },
  { label: "Satisfeito(a)", value: 1 },
  { label: "Indiferente", value: 2 },
  { label: "Insatisfeito(a)", value: 3 },
  { label: "Muito insatisfeito(a)", value: 4 },
];
const ISI_GRAU: LikertOption[] = [
  { label: "Nada", value: 0 },
  { label: "Um pouco", value: 1 },
  { label: "Mais ou menos", value: 2 },
  { label: "Muito", value: 3 },
  { label: "Muitíssimo", value: 4 },
];

export const ISI: Scale = {
  code: "ISI",
  name: "ISI",
  fullName: "Índice de Gravidade da Insônia",
  domain: "sono",
  status: "ativa",
  minAge: 12,
  instructions: "Pense nas últimas duas semanas ao responder.",
  timeframe: "Últimas 2 semanas",
  options: ISI_OPTS,
  items: [
    { id: "1", text: "Dificuldade para adormecer" },
    { id: "2", text: "Dificuldade para permanecer dormindo" },
    { id: "3", text: "Despertar muito cedo e não conseguir voltar a dormir" },
    { id: "4", text: "Quão satisfeito(a) você está com o seu sono atual?", options: ISI_SAT },
    { id: "5", text: "O seu problema de sono é perceptível para as outras pessoas?", options: ISI_GRAU },
    { id: "6", text: "Quanto você está preocupado(a) com o seu problema de sono?", options: ISI_GRAU },
    { id: "7", text: "Quanto o sono atrapalha o seu dia a dia (energia, humor, trabalho, concentração)?", options: ISI_GRAU },
  ],
  bands: [
    { min: 0, max: 7, label: "Sem insônia clinicamente significativa", level: 0 },
    { min: 8, max: 14, label: "Insônia subclínica (limiar)", level: 1 },
    { min: 15, max: 21, label: "Insônia moderada", level: 3 },
    { min: 22, max: 28, label: "Insônia grave", level: 4 },
  ],
  positiveCutoff: 8,
};

/* ------------------------------------------------------------------ */
/* AQ-10 — traços do espectro autista (adulto)                         */
/* ------------------------------------------------------------------ */

const AQ_CONC: LikertOption[] = [
  { label: "Discordo", value: 0 },
  { label: "Concordo", value: 1 },
];
const AQ_DISC: LikertOption[] = [
  { label: "Discordo", value: 1 },
  { label: "Concordo", value: 0 },
];

export const AQ10: Scale = {
  code: "AQ-10",
  name: "AQ-10",
  fullName: "Rastreio de traços do espectro autista (10 itens)",
  domain: "neurodesenvolvimento",
  status: "ativa",
  minAge: 16,
  informantMode: "ambos",
  instructions:
    "Indique se você concorda ou discorda de cada afirmação, pensando em como você é na maior parte do tempo.",
  options: AQ_CONC,
  items: [
    { id: "1", text: "Costumo perceber sons discretos que os outros não notam.", options: AQ_CONC },
    { id: "2", text: "Costumo me concentrar mais no quadro geral do que nos pequenos detalhes.", options: AQ_DISC },
    { id: "3", text: "Acho fácil fazer mais de uma coisa ao mesmo tempo.", options: AQ_DISC },
    { id: "4", text: "Quando sou interrompido(a), consigo voltar rapidamente ao que estava fazendo.", options: AQ_DISC },
    { id: "5", text: "Acho fácil 'ler nas entrelinhas' quando alguém fala comigo.", options: AQ_DISC },
    { id: "6", text: "Sei perceber quando a pessoa que me escuta está ficando entediada.", options: AQ_DISC },
    { id: "7", text: "Quando leio uma história, acho difícil entender as intenções dos personagens.", options: AQ_CONC },
    { id: "8", text: "Gosto de reunir informações sobre categorias de coisas (carros, pássaros, trens, plantas).", options: AQ_CONC },
    { id: "9", text: "Acho fácil saber o que a outra pessoa está sentindo só de olhar para o rosto dela.", options: AQ_DISC },
    { id: "10", text: "Acho difícil entender as intenções das pessoas.", options: AQ_CONC },
  ],
  bands: [
    { min: 0, max: 5, label: "Rastreio negativo", level: 0 },
    { min: 6, max: 10, label: "Rastreio positivo — considerar avaliação especializada", level: 3 },
  ],
  positiveCutoff: 6,
  licenseNote:
    "Instrumento de rastreio populacional. Não substitui avaliação diagnóstica especializada do espectro autista.",
};

/* ------------------------------------------------------------------ */
/* AD-8 — declínio cognitivo (respondido por informante)               */
/* ------------------------------------------------------------------ */

export const AD8: Scale = {
  code: "AD-8",
  name: "AD-8",
  fullName: "Rastreio de mudança cognitiva (respondido por familiar/informante)",
  domain: "cognitivo",
  status: "ativa",
  minAge: 50,
  quietIfOutOfRange: true,
  informantMode: "hetero",
  instructions:
    "Estas perguntas devem ser respondidas por alguém que convive com a pessoa. Houve MUDANÇA nos últimos anos por causa de problemas de memória ou de raciocínio?",
  timeframe: "Mudança nos últimos anos",
  options: SIM0_NAO1,
  items: [
    { id: "1", text: "Problemas de julgamento (por exemplo, cair em golpes, decisões financeiras ruins)." },
    { id: "2", text: "Redução do interesse por passatempos e atividades." },
    { id: "3", text: "Repete as mesmas perguntas, histórias ou frases." },
    { id: "4", text: "Dificuldade em aprender a usar aparelhos, ferramentas ou eletrodomésticos." },
    { id: "5", text: "Esquece o mês ou o ano correto." },
    { id: "6", text: "Dificuldade em lidar com assuntos financeiros (contas, impostos)." },
    { id: "7", text: "Dificuldade em lembrar de compromissos." },
    { id: "8", text: "Problemas diários de memória e de raciocínio." },
  ],
  bands: [
    { min: 0, max: 1, label: "Sem indicação de mudança cognitiva", level: 0 },
    { min: 2, max: 8, label: "Sugere mudança cognitiva — investigar", level: 3 },
  ],
  positiveCutoff: 2,
};

export const SCALES_AMPLIADAS: Scale[] = [MDQ, FTND, EPDS, SCOFF, ISI, AQ10, AD8];
