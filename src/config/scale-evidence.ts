/**
 * Base curada de evidências psicométricas das escalas da pré-triagem.
 *
 * Alimenta a página /referencias (guia clínico para médicos) e o documento
 * exportado (PDF/DOCX). Valores de sensibilidade/especificidade são os
 * classicamente reportados nos estudos originais e meta-análises — sempre
 * apresentados com a ressalva de que rastreio não é diagnóstico.
 */

export type ScaleEvidence = {
  /** código da escala (igual a Scale.code) */
  code: string;
  /** condição/patologia rastreada */
  condition: string;
  /** CID-10 de referência */
  icd10?: string;
  /** ponto de corte usado no sistema */
  cutoff: string;
  sensitivity?: string;
  specificity?: string;
  /** referência do estudo original */
  reference: string;
  /** validação brasileira, quando existe */
  validationBr?: string;
  /** observações (lacunas, ressalvas) */
  note?: string;
};

export const SCALE_EVIDENCE: ScaleEvidence[] = [
  // ---------- Depressão ----------
  {
    code: "PHQ-2",
    condition: "Episódio depressivo (rastreio de 1ª etapa)",
    icd10: "F32 / F33",
    cutoff: "≥ 3 (0–6)",
    sensitivity: "≈ 83%",
    specificity: "≈ 92%",
    reference:
      "Kroenke K, Spitzer RL, Williams JBW. The Patient Health Questionnaire-2: validity of a two-item depression screener. Med Care. 2003;41(11):1284-1292.",
    validationBr:
      "Osório FL, et al. Study of the discriminative validity of the PHQ-9 and PHQ-2 in a sample of Brazilian women in primary health care. Perspect Psychiatr Care. 2009.",
  },
  {
    code: "PHQ-9",
    condition: "Episódio depressivo — gravidade",
    icd10: "F32 / F33",
    cutoff: "≥ 10 (0–27); faixas 5/10/15/20",
    sensitivity: "≈ 88%",
    specificity: "≈ 88%",
    reference:
      "Kroenke K, Spitzer RL, Williams JBW. The PHQ-9: validity of a brief depression severity measure. J Gen Intern Med. 2001;16(9):606-613. Meta-análise: Levis B, et al. BMJ. 2019/2021.",
    validationBr:
      "Santos IS, Tavares BF, Munhoz TN, et al. Sensibilidade e especificidade do PHQ-9 entre adultos da população geral. Cad Saúde Pública. 2013;29(8):1533-1543.",
    note: "Corte ótimo pode variar entre 8 e 11 conforme a população (Manea et al., CMAJ 2012).",
  },
  {
    code: "GDS-15",
    condition: "Depressão na pessoa idosa",
    icd10: "F32 / F33",
    cutoff: "≥ 5 (0–15)",
    sensitivity: "≈ 85–92%",
    specificity: "≈ 74–81%",
    reference:
      "Sheikh JI, Yesavage JA. Geriatric Depression Scale (GDS): recent evidence and development of a shorter version. Clin Gerontol. 1986;5(1-2):165-173.",
    validationBr:
      "Almeida OP, Almeida SA. Arq Neuropsiquiatr. 1999;57(2B):421-426; Paradela EMP, Lourenço RA, Veras RP. Rev Saúde Pública. 2005;39(6):918-923.",
  },
  {
    code: "EPDS",
    condition: "Depressão perinatal (gestação e puerpério)",
    icd10: "F53",
    cutoff: "≥ 10 (0–30); item 10 = autoagressão",
    sensitivity: "≈ 86%",
    specificity: "≈ 78%",
    reference:
      "Cox JL, Holden JM, Sagovsky R. Detection of postnatal depression: development of the 10-item Edinburgh Postnatal Depression Scale. Br J Psychiatry. 1987;150:782-786.",
    validationBr:
      "Santos IS, Matijasevich A, Tavares BF, et al. Validation of the EPDS in mothers from the 2004 Pelotas Birth Cohort. Cad Saúde Pública. 2007;23(11):2577-2588.",
  },

  // ---------- Ansiedade ----------
  {
    code: "GAD-2",
    condition: "Transtorno de ansiedade generalizada (1ª etapa)",
    icd10: "F41.1",
    cutoff: "≥ 3 (0–6)",
    sensitivity: "≈ 86%",
    specificity: "≈ 83%",
    reference:
      "Kroenke K, Spitzer RL, Williams JBW, Monahan PO, Löwe B. Anxiety disorders in primary care. Ann Intern Med. 2007;146(5):317-325. Meta-análise: Plummer F, et al. Gen Hosp Psychiatry. 2016;39:24-31.",
    validationBr: "Propriedades brasileiras derivadas da validação do GAD-7 (Moreno et al., 2016).",
  },
  {
    code: "GAD-7",
    condition: "Transtorno de ansiedade generalizada — gravidade",
    icd10: "F41.1",
    cutoff: "≥ 10 (0–21); faixas 5/10/15",
    sensitivity: "≈ 89%",
    specificity: "≈ 82%",
    reference:
      "Spitzer RL, Kroenke K, Williams JBW, Löwe B. A brief measure for assessing generalized anxiety disorder: the GAD-7. Arch Intern Med. 2006;166(10):1092-1097.",
    validationBr:
      "Moreno AL, DeSousa DA, et al. Factor structure, reliability and item parameters of the Brazilian-Portuguese GAD-7. Temas Psicol. 2016;24(1).",
  },

  // ---------- Risco de suicídio ----------
  {
    code: "ASQ",
    condition: "Risco de suicídio (triagem de segurança)",
    cutoff: "≥ 1 resposta positiva (0–4)",
    sensitivity: "≈ 97%",
    specificity: "≈ 88%",
    reference:
      "Horowitz LM, et al. Ask Suicide-Screening Questions (ASQ): a brief instrument for the pediatric emergency department. Arch Pediatr Adolesc Med. 2012;166(12):1170-1176. Adultos: Roaten K, et al. Psychosomatics. 2020;61(6):713-722.",
    note: "Não há validação psicométrica brasileira formal publicada; tradução livre do instrumento do NIMH. Qualquer positivo exige avaliação clínica imediata.",
  },
  {
    code: "RISCO-ADO",
    condition: "Risco de suicídio em crianças e adolescentes",
    cutoff: "≥ 1 resposta positiva",
    reference:
      "Estrutura reservada para a versão infantojuvenil validada a ser definida pela equipe clínica (base conceitual: ASQ/NIMH).",
    note: "Escala em curadoria — não aplicada ao paciente até a curadoria ser concluída.",
  },

  // ---------- Álcool e substâncias ----------
  {
    code: "AUDIT-C",
    condition: "Uso de risco de álcool (1ª etapa)",
    icd10: "F10",
    cutoff: "≥ 3 (0–12)",
    sensitivity: "≈ 86%",
    specificity: "≈ 72%",
    reference:
      "Bush K, et al. The AUDIT Alcohol Consumption Questions (AUDIT-C). Arch Intern Med. 1998;158(16):1789-1795.",
    note: "Guias internacionais sugerem corte ≥ 4 para homens e ≥ 3 para mulheres; o sistema usa ≥ 3 (mais sensível).",
  },
  {
    code: "AUDIT",
    condition: "Transtornos por uso de álcool — gravidade",
    icd10: "F10",
    cutoff: "≥ 8 uso de risco; ≥ 16 nocivo; ≥ 20 provável dependência (0–40)",
    reference:
      "Saunders JB, Aasland OG, Babor TF, et al. Development of the AUDIT: WHO Collaborative Project. Addiction. 1993;88(6):791-804. Manual: Babor TF, et al. AUDIT — Guidelines for Use in Primary Care. 2ª ed. OMS, 2001.",
    validationBr:
      "Lima CT, et al. Validação da versão brasileira do AUDIT. 2005; e adaptações regionais (Cad Saúde Pública. 2011;27(3):497-509).",
  },
  {
    code: "CAGE",
    condition: "Histórico de problemas com álcool",
    icd10: "F10",
    cutoff: "≥ 2 (0–4)",
    sensitivity: "> 90% (amostras hospitalares)",
    reference:
      "Ewing JA. Detecting alcoholism: the CAGE questionnaire. JAMA. 1984;252(14):1905-1907.",
    validationBr:
      "Masur J, Monteiro MG. Validation of the CAGE in a Brazilian psychiatric inpatient setting. Braz J Med Biol Res. 1983;16(3):215-218.",
  },
  {
    code: "ASSIST",
    condition:
      "Uso de substâncias por classe: tabaco, álcool, cannabis, estimulantes, sedativos, opioides e outras",
    icd10: "F10–F19",
    cutoff: "Por substância: álcool moderado ≥ 2, alto ≥ 3; demais moderado 1–2, alto ≥ 3",
    reference:
      "Humeniuk R, Ali R, Babor TF, et al. Validation of the Alcohol, Smoking and Substance Involvement Screening Test (ASSIST). Addiction. 2008;103(6):1039-1047. Versão reduzida: ASSIST-Lite (Ali R, et al.; McNeely J, et al.).",
    validationBr:
      "A validação multicêntrica da OMS (fase II) incluiu centro brasileiro (UNIFESP — Formigoni ML).",
    note: "Implementada a versão ASSIST-Lite com ramificação: resposta negativa na pergunta-porta encerra o bloco da substância.",
  },
  {
    code: "FTND",
    condition: "Dependência de nicotina — gravidade",
    icd10: "F17",
    cutoff: "≥ 6 = dependência elevada (0–10)",
    reference:
      "Heatherton TF, Kozlowski LT, Frecker RC, Fagerström KO. The Fagerström Test for Nicotine Dependence. Br J Addict. 1991;86(9):1119-1127.",
    validationBr:
      "Meneses-Gaya IC, Zuardi AW, Loureiro SR, Crippa JAS. Psychometric properties of the FTND. J Bras Pneumol. 2009;35(1):73-82.",
  },

  // ---------- Jogo problemático ----------
  {
    code: "PGSI",
    condition: "Jogo problemático / jogo patológico",
    icd10: "F63.0",
    cutoff: "0 sem risco · 1–2 baixo · 3–7 moderado · ≥ 8 jogo problemático (0–27)",
    reference:
      "Ferris J, Wynne H. The Canadian Problem Gambling Index: Final Report. Ottawa: Canadian Centre on Substance Abuse, 2001.",
    note: "Sem validação psicométrica brasileira amplamente indexada até o momento (lacuna); cortes internacionais consolidados. LOINC 86528-1.",
  },

  // ---------- Obsessivo-compulsivo ----------
  {
    code: "OCI-R",
    condition: "Transtorno obsessivo-compulsivo (TOC)",
    icd10: "F42",
    cutoff: "≥ 21 (0–72)",
    reference:
      "Foa EB, Huppert JD, Leiberg S, et al. The Obsessive-Compulsive Inventory: development and validation of a short version. Psychol Assess. 2002;14(4):485-496. Normas contemporâneas: Abramovitch A, et al. 2020.",
    note: "Estudos recentes sugerem cortes entre 17 e 21 conforme a população.",
  },

  // ---------- Trauma ----------
  {
    code: "PC-PTSD-5",
    condition: "TEPT (rastreio de 1ª etapa)",
    icd10: "F43.1",
    cutoff: "≥ 3 (0–5)",
    sensitivity: "≈ 95%",
    specificity: "≈ 85%",
    reference:
      "Prins A, et al. The Primary Care PTSD Screen for DSM-5 (PC-PTSD-5): development and evaluation within a veteran primary care sample. J Trauma Stress. 2016.",
  },
  {
    code: "PCL-5",
    condition: "TEPT — gravidade sintomática",
    icd10: "F43.1",
    cutoff: "≥ 31–33 (0–80)",
    reference:
      "Blevins CA, Weathers FW, Davis MT, Witte TK, Domino JL. The Posttraumatic Stress Disorder Checklist for DSM-5 (PCL-5): development and initial psychometric evaluation. J Trauma Stress. 2015;28(6):489-498.",
  },

  // ---------- Somático ----------
  {
    code: "PHQ-15",
    condition: "Transtorno de sintomas somáticos / carga somática",
    icd10: "F45",
    cutoff: "Faixas 5/10/15 (0–30); ≥ 10 = carga relevante",
    reference:
      "Kroenke K, Spitzer RL, Williams JBW. The PHQ-15: validity of a new measure for evaluating the severity of somatic symptoms. Psychosom Med. 2002;64(2):258-266.",
  },

  // ---------- Bipolaridade ----------
  {
    code: "MDQ",
    condition: "Espectro bipolar (rastreio de mania/hipomania)",
    icd10: "F31",
    cutoff: "≥ 7/13 sintomas + co-ocorrência + prejuízo",
    sensitivity: "≈ 73%",
    specificity: "≈ 90%",
    reference:
      "Hirschfeld RM, et al. Development and validation of a screening instrument for bipolar spectrum disorder: the Mood Disorder Questionnaire. Am J Psychiatry. 2000;157(11):1873-1875.",
    validationBr:
      "Castelo MS, Carvalho ER, et al. Validity of the Mood Disorder Questionnaire in a Brazilian psychiatric population. Rev Bras Psiquiatr. 2010;32(4):424-428.",
  },

  // ---------- Transtornos alimentares ----------
  {
    code: "SCOFF",
    condition: "Transtornos alimentares (anorexia/bulimia)",
    icd10: "F50",
    cutoff: "≥ 2 (0–5)",
    sensitivity: "≈ 90–100%",
    specificity: "≈ 84–88%",
    reference:
      "Morgan JF, Reid F, Lacey JH. The SCOFF questionnaire: assessment of a new screening tool for eating disorders. BMJ. 1999;319(7223):1467-1468. Meta-análise: Kutz AM, et al. J Gen Intern Med. 2020;35(3):885-893.",
  },

  // ---------- Sono ----------
  {
    code: "ISI",
    condition: "Insônia — gravidade",
    icd10: "F51.0 / G47.0",
    cutoff: "≥ 15 insônia moderada/grave (0–28)",
    sensitivity: "≈ 82%",
    specificity: "≈ 82%",
    reference:
      "Bastien CH, Vallières A, Morin CM. Validation of the Insomnia Severity Index. Sleep Med. 2001;2(4):297-307. Indicadores por corte: Morin CM, et al. Sleep. 2011;34(5):601-608.",
    note: "Em atenção primária, o corte ≥ 10 maximiza sensibilidade (Gagnon et al., 2013).",
  },

  // ---------- Neurodesenvolvimento ----------
  {
    code: "AQ-10",
    condition: "Traços do espectro autista (adultos e adolescentes)",
    icd10: "F84",
    cutoff: "≥ 6 (0–10)",
    sensitivity: "≈ 88%",
    specificity: "≈ 91%",
    reference:
      "Allison C, Auyeung B, Baron-Cohen S. Toward brief 'Red Flags' for autism screening: the Short Autism Spectrum Quotient. J Am Acad Child Adolesc Psychiatry. 2012;51(2):202-212.",
  },
  {
    code: "SNAP-IV",
    condition: "TDAH em crianças e adolescentes",
    icd10: "F90",
    cutoff: "Em curadoria",
    reference:
      "Swanson JM, et al. Categorical and dimensional definitions and evaluations of symptoms of ADHD: the SNAP-IV. 2001.",
    note: "Escala em curadoria — respondida por responsável; entra no fluxo após revisão dos itens.",
  },
  {
    code: "ASRS-18",
    condition: "TDAH em adultos",
    icd10: "F90",
    cutoff: "Em curadoria",
    reference:
      "Kessler RC, et al. The World Health Organization Adult ADHD Self-Report Scale (ASRS). Psychol Med. 2005;35(2):245-256.",
    note: "Escala em curadoria — estrutura pronta para receber os 18 itens.",
  },

  // ---------- Cognição ----------
  {
    code: "AD-8",
    condition: "Declínio cognitivo / demência (com informante)",
    icd10: "F00–F03 / G30",
    cutoff: "≥ 2 (0–8)",
    sensitivity: "≈ 74–84%",
    specificity: "≈ 64–80%",
    reference:
      "Galvin JE, et al. The AD8: a brief informant interview to detect dementia. Neurology. 2005;65(4):559-564. Revisão: Hendry K, et al. Cochrane Database Syst Rev. 2019;(3):CD011121.",
  },

  // ---------- Sofrimento geral ----------
  {
    code: "SRQ-20",
    condition: "Morbidade psíquica geral (sofrimento psíquico)",
    cutoff: "≥ 7 (0–20); corte pode variar por sexo",
    sensitivity: "≈ 83%",
    specificity: "≈ 80%",
    reference:
      "Harding TW, et al. Mental disorders in primary health care (OMS). Psychol Med. 1980;10(2):231-241. Estudo brasileiro clássico: Mari JJ, Williams P. Br J Psychiatry. 1986;148:23-26.",
    validationBr:
      "Santos KOB, Araújo TM, et al. Avaliação de um instrumento de mensuração de morbidade psíquica: validação do SRQ-20. Rev Baiana Saúde Pública. 2010;34(3).",
  },
  {
    code: "GHQ-12",
    condition: "Morbidade psíquica geral (alternativa)",
    cutoff: "Em curadoria",
    reference: "Goldberg DP, et al. Manual of the General Health Questionnaire. 1978.",
    note: "Escala em curadoria.",
  },
  {
    code: "BDI-II",
    condition: "Depressão — gravidade (inventário clínico)",
    icd10: "F32 / F33",
    cutoff: "Em curadoria (instrumento licenciado)",
    reference: "Beck AT, Steer RA, Brown GK. BDI-II Manual. 1996.",
    validationBr: "Gomes-Oliveira MH, et al. Rev Bras Psiquiatr. 2012.",
    note: "Instrumento proprietário — aguardando licença de uso.",
  },

  // ---------- Ocupacional ----------
  {
    code: "COPSOQ-BR",
    condition: "Riscos psicossociais no trabalho (NR-1)",
    cutoff: "Domínios PRIMA-EF; escore agregado ≥ 29 = atenção",
    reference:
      "Kristensen TS, Hannerz H, Høgh A, Borg V. The Copenhagen Psychosocial Questionnaire (COPSOQ). Scand J Work Environ Health. 2005;31(6):438-449.",
    validationBr:
      "Adaptação transcultural COPSOQ II-Brasil (versão curta). Rev Saúde Pública. 2021;55:69.",
    note: "Base técnica para o Gerenciamento de Riscos Psicossociais exigido pela NR-1 (atualização 2024/2025). Resultados sempre analisados de forma agregada e anonimizada.",
  },
];

export const EVIDENCE_BY_CODE: Record<string, ScaleEvidence> =
  Object.fromEntries(SCALE_EVIDENCE.map((e) => [e.code, e]));

/* ------------------------------------------------------------------ */
/* Fluxos exemplificados por especialidade                             */
/* ------------------------------------------------------------------ */

export type FlowStep = {
  /** código da escala aplicada nesta etapa (quando houver) */
  code?: string;
  text: string;
};

export type SpecialtyFlow = {
  specialty: string;
  scenario: string;
  steps: FlowStep[];
};

export const SPECIALTY_FLOWS: SpecialtyFlow[] = [
  {
    specialty: "Psiquiatria do adulto",
    scenario: "Paciente adulto marca “tristeza / desânimo” como queixa inicial",
    steps: [
      { code: "SRQ-20", text: "Rastreio geral aplicado a todo adulto (linha de base)" },
      { code: "PHQ-2", text: "Rastreio breve de depressão (2 perguntas, ~30 segundos)" },
      { code: "PHQ-9", text: "Se PHQ-2 ≥ 3: aprofunda gravidade depressiva" },
      { code: "ASQ", text: "Se item 9 do PHQ-9 > 0 ou PHQ-9 ≥ 10: triagem de segurança — via de risco" },
      { code: "PC-PTSD-5", text: "Se PHQ-9 ≥ 10: checa trauma associado" },
      { code: "MDQ", text: "Se PHQ-9 ≥ 10: rastreia bipolaridade antes de qualquer conduta antidepressiva" },
      { text: "Painel: fila de revisão com semáforo, trilha de decisão e parecer do médico" },
    ],
  },
  {
    specialty: "Dependência química",
    scenario: "Paciente marca “uso de álcool ou outras substâncias”",
    steps: [
      { code: "AUDIT-C", text: "Rastreio breve de álcool (3 perguntas)" },
      { code: "CAGE", text: "Histórico de problemas com álcool" },
      {
        code: "ASSIST",
        text: "ASSIST-Lite com ramificação: pergunta-porta por substância; “não” pula o bloco",
      },
      { code: "AUDIT", text: "Se álcool ≥ 2 no ASSIST-Lite (ou AUDIT-C ≥ 3): AUDIT completo" },
      { code: "FTND", text: "Se tabaco ≥ 1 no ASSIST-Lite: dependência de nicotina (Fagerström)" },
      { code: "PHQ-2", text: "Se alto risco em qualquer substância: rastreia comorbidade depressiva" },
      { text: "Painel: quadro por substância com conduta OMS (FRAMES / avaliação especializada)" },
    ],
  },
  {
    specialty: "Jogos e apostas",
    scenario: "Paciente marca “apostas, bets ou jogos ocupando espaço na vida”",
    steps: [
      { code: "PGSI", text: "Índice de gravidade do jogo problemático (9 perguntas, últimos 12 meses)" },
      { code: "PHQ-2", text: "Se PGSI ≥ 3: rastreia depressão associada" },
      { code: "GAD-2", text: "Se PGSI ≥ 3: rastreia ansiedade associada" },
      { code: "ASQ", text: "Se PGSI ≥ 8 (jogo problemático): triagem de segurança — via de risco" },
    ],
  },
  {
    specialty: "Psiquiatria infantojuvenil",
    scenario: "Responsável responde por criança/adolescente (informante identificado)",
    steps: [
      { code: "GAD-2", text: "Adolescente com ansiedade: rastreio breve (12–17 anos)" },
      { code: "GAD-7", text: "Se GAD-2 ≥ 3: aprofunda gravidade" },
      { code: "SNAP-IV", text: "Queixa de atenção: TDAH infantil (em curadoria, via responsável)" },
      { code: "ASQ", text: "Qualquer sinal de risco: triagem de segurança (≥ 10 anos)" },
      { text: "Menores de 12 anos: queixas de humor/trauma geram aviso para avaliação assistida na consulta" },
    ],
  },
  {
    specialty: "Geriatria",
    scenario: "Pessoa idosa (60+) com queixa de memória ou tristeza",
    steps: [
      { code: "SRQ-20", text: "Rastreio geral (linha de base)" },
      { code: "AD-8", text: "Queixa de memória: entrevista breve de mudança cognitiva" },
      { code: "GDS-15", text: "Se AD-8 ≥ 2: diferencia declínio cognitivo de depressão geriátrica" },
      { code: "ASQ", text: "Se GDS-15 ≥ 5: triagem de segurança" },
    ],
  },
  {
    specialty: "Saúde perinatal",
    scenario: "Gestante ou puérpera (até 12 meses pós-parto)",
    steps: [
      { code: "EPDS", text: "Escala de depressão pós-parto de Edimburgo (10 perguntas)" },
      { code: "GAD-2", text: "Se EPDS ≥ 10: rastreia componente ansioso" },
      { code: "ASQ", text: "Se item 10 da EPDS (autoagressão) > 0 ou escore ≥ 13: via de risco imediata" },
    ],
  },
  {
    specialty: "Saúde ocupacional (NR-1)",
    scenario: "Trabalhador com sofrimento relacionado ao trabalho",
    steps: [
      { code: "COPSOQ-BR", text: "Questionário psicossocial de Copenhague (domínios PRIMA-EF)" },
      { code: "SRQ-20", text: "Se escore agregado ≥ 29: rastreia sofrimento mental associado" },
      { code: "PHQ-2", text: "Se escore ≥ 29: rastreia depressão" },
      { code: "GAD-2", text: "Se escore ≥ 29: rastreia ansiedade" },
      { code: "PC-PTSD-5", text: "Se relato de assédio/violência (item 14 ≥ 2): rastreia TEPT" },
      { text: "Relatório coletivo anonimizado (mín. 5 respondentes) para conformidade NR-1" },
    ],
  },
  {
    specialty: "Trauma e TEPT",
    scenario: "Paciente relata evento traumático (violência, acidente, abuso)",
    steps: [
      { code: "PC-PTSD-5", text: "Rastreio breve de TEPT (5 perguntas, último mês)" },
      { code: "PCL-5", text: "Se PC-PTSD-5 ≥ 3: gravidade completa dos sintomas (20 itens)" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Limitações e governança                                             */
/* ------------------------------------------------------------------ */

export const LIMITATIONS: string[] = [
  "Rastreio não é diagnóstico: um resultado positivo indica necessidade de avaliação clínica, nunca conclui diagnóstico por si só.",
  "Todo instrumento tem falsos positivos e falsos negativos; os cortes deste protocolo priorizam sensibilidade (não perder casos) na 1ª etapa e especificidade na 2ª.",
  "O parecer do médico registrado no painel é a etapa confirmatória obrigatória — o sistema organiza a fila, quem decide é o profissional.",
  "Escalas sem validação brasileira formal (ASQ, PGSI) são usadas com os cortes internacionais consolidados e sinalizadas como tal neste guia.",
  "Resultados refletem o período de referência de cada escala (2 semanas, 3 meses, 12 meses) — interpretar junto com a data de aplicação.",
  "Dados de saúde mental são dados sensíveis (LGPD art. 5º, II): acesso restrito por consultório, trilha de auditoria completa e consentimento registrado na triagem.",
];

/* ------------------------------------------------------------------ */
/* Propostas: qualidade de dados para pesquisa                         */
/* ------------------------------------------------------------------ */

export type ResearchProposal = { title: string; detail: string };

export const RESEARCH_PROPOSALS: ResearchProposal[] = [
  {
    title: "Diagnóstico final (CID-10) no parecer médico",
    detail:
      "Registrar o diagnóstico confirmado após a consulta permite calcular a acuidade real do serviço (concordância triagem × diagnóstico), calibrar cortes à população local e publicar estudos de validação próprios.",
  },
  {
    title: "Campos sociodemográficos opcionais",
    detail:
      "Escolaridade, ocupação, cidade/UF e tempo de sintomas (sempre opcionais) viabilizam análises de equidade e fatores associados, sem comprometer a adesão à triagem.",
  },
  {
    title: "Métricas de qualidade do respondente",
    detail:
      "Tempo por item, taxa de abandono por tela e detecção de resposta reta (straight-lining) permitem sinalizar respostas de baixa confiabilidade e medir a usabilidade real do instrumento.",
  },
  {
    title: "Consentimento específico para pesquisa + CAAE",
    detail:
      "Termo separado do consentimento assistencial, com aprovação em Comitê de Ética (Plataforma Brasil/CAAE, Res. CNS 466/2012 e 510/2016; Res. CNS/CONEP 738/2024 na interface com a LGPD).",
  },
  {
    title: "Dataset anonimizado com dicionário de dados",
    detail:
      "Exportação CSV/FHIR sem identificadores (nome, contato, datas exatas), com dicionário de variáveis e versionamento do protocolo, pronta para análise estatística externa.",
  },
];

/** Nota metodológica exibida no rodapé do guia. */
export const METHODOLOGY_NOTE =
  "Valores de sensibilidade/especificidade são os classicamente reportados nos estudos originais e meta-análises citadas; antes de uso normativo em protocolo institucional, recomenda-se a leitura do texto integral de cada referência. Este guia é gerado a partir das definições vigentes no sistema (mesma fonte da página Protocolo).";
