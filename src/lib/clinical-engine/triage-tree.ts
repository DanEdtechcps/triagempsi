import { effectiveScore } from "@/lib/scoring";
import { SCALE_BY_CODE } from "@/lib/scales-data";
import { isScaleAllowedForAge } from "@/lib/scale-types";
import type {
  AgeBand,
  IndicatedScale,
  RoutingRule,
  EscalationRule,
  SymptomOption,
  TriagePlan,
  TriageDecision,
} from "./types";
import type { ScaleResult } from "@/lib/scoring";

/**
 * Árvore de decisão da pré-triagem (Clinical Engine).
 *
 * Dois níveis de encaminhamento:
 * 1) ENTRADA  — sintoma relatado + faixa etária definem os rastreios breves.
 * 2) ESCALADA — o resultado de cada rastreio decide a próxima escala
 *               (ex.: PHQ-2 positivo → PHQ-9; PHQ-9 item 9 → ASQ).
 */

export const SYMPTOM_QUESTION = {
  id: "sintomas_iniciais",
  title: "Nas últimas semanas, você tem se sentido…",
  subtitle:
    "Marque tudo o que você reconhece em você. Pode escolher mais de uma opção — ou nenhuma.",
  options: [
    { id: "tristeza", label: "Triste, desanimado(a) ou sem vontade" },
    { id: "ansiedade", label: "Ansioso(a), preocupado(a) ou tenso(a)" },
    { id: "angustia", label: "Angustiado(a), com o corpo pesado ou sem energia" },
    {
      id: "somatico",
      label: "Com dores ou sintomas físicos frequentes sem explicação",
    },
    {
      id: "trauma",
      label: "Marcado(a) por algo muito assustador que vivi",
      hint: "Acidente grave, violência, abuso, perda ou ameaça de morte.",
    },
    {
      id: "obsessivo",
      label: "Com manias ou pensamentos repetitivos que não param",
    },
    {
      id: "substancias",
      label: "Com problemas envolvendo álcool ou outras substâncias",
    },
    {
      id: "morte",
      label: "Com pensamentos de morte ou de me machucar",
      hint: "Responder isso aqui ajuda a equipe a cuidar de você com prioridade.",
    },
    {
      id: "jogos",
      label: "Com apostas, bets ou jogos ocupando muito espaço na minha vida",
      hint: "Cassino online, bets, loterias, jogo do bicho ou cartas.",
    },
    {
      id: "atencao",
      label: "Com dificuldade de atenção, agitação ou impulsividade",
    },
    {
      id: "oscilacao",
      label: "Com oscilações de humor ou fases de muita energia sem precisar dormir",
      hint: "Períodos em que você não estava do seu jeito habitual — muito acelerado(a), eufórico(a) ou irritado(a).",
    },
    {
      id: "tabaco",
      label: "Fumando (cigarro, vape ou narguilé) e com dificuldade de parar",
    },
    {
      id: "perinatal",
      label: "Grávida ou com bebê de até 12 meses",
      hint: "A gestação e o pós-parto pedem um rastreio próprio de humor.",
    },
    {
      id: "alimentar",
      label: "Com a comida, o peso ou o corpo ocupando muito espaço na minha cabeça",
    },
    {
      id: "sono",
      label: "Dormindo mal há semanas",
    },
    {
      id: "neuro",
      label: "Com dificuldade em situações sociais e sensibilidade a barulho, luz ou rotina",
    },
    {
      id: "trabalho",
      label: "Sobrecarregado(a) ou adoecendo por causa do trabalho",
      hint: "Ritmo excessivo, cobrança constante ou insegurança no trabalho.",
    },
    {
      id: "memoria",
      label: "Com falhas de memória ou confusão que apareceram nos últimos anos",
      hint: "Se você estiver respondendo por outra pessoa, marque também esta opção.",
    },
  ] as SymptomOption[],
};

/* ------------------------------------------------------------------ */
/* Faixas etárias                                                      */
/* ------------------------------------------------------------------ */

export const AGE_BAND_LABEL: Record<AgeBand, string> = {
  crianca: "Criança (até 11 anos)",
  adolescente: "Adolescente (12 a 17 anos)",
  adulto: "Adulto (18 a 59 anos)",
  idoso: "Pessoa idosa (60 anos ou mais)",
};

export function ageBand(age: number | null): AgeBand {
  if (age == null) return "adulto";
  if (age < 12) return "crianca";
  if (age < 18) return "adolescente";
  if (age < 60) return "adulto";
  return "idoso";
}

/* ------------------------------------------------------------------ */
/* 1) Encaminhamento de entrada (sintoma × faixa etária)               */
/* ------------------------------------------------------------------ */

export const ROUTING_RULES: RoutingRule[] = [
  {
    symptom: "tristeza",
    byBand: {
      adolescente: ["PHQ-2"],
      adulto: ["PHQ-2"],
      idoso: ["GDS-15"],
    },
    noteByBand: {
      crianca:
        "Rastreio de humor em menores de 12 anos requer aplicação assistida por responsável na consulta",
    },
  },
  {
    symptom: "ansiedade",
    byBand: {
      adolescente: ["GAD-2"],
      adulto: ["GAD-2"],
      idoso: ["GAD-2"],
    },
    noteByBand: {
      crianca: "Avaliação de ansiedade infantil deve ser feita com o responsável",
    },
  },
  {
    symptom: "angustia",
    byBand: {
      adolescente: ["SRQ-20"],
      adulto: ["SRQ-20"],
      idoso: ["SRQ-20"],
    },
  },
  {
    symptom: "somatico",
    byBand: {
      adolescente: ["PHQ-15"],
      adulto: ["PHQ-15"],
      idoso: ["PHQ-15"],
    },
  },
  {
    symptom: "trauma",
    byBand: {
      adolescente: ["PC-PTSD-5"],
      adulto: ["PC-PTSD-5"],
      idoso: ["PC-PTSD-5"],
    },
    noteByBand: {
      crianca: "Rastreio de trauma infantil requer entrevista assistida",
    },
  },
  {
    symptom: "obsessivo",
    byBand: {
      adolescente: ["OCI-R"],
      adulto: ["OCI-R"],
      idoso: ["OCI-R"],
    },
    noteByBand: {
      crianca:
        "Sintomas obsessivo-compulsivos em menores de 12 anos — avaliar na consulta com o responsável",
      adolescente:
        "Sintomas obsessivo-compulsivos — confirmar com entrevista clínica na consulta",
    },
  },
  {
    symptom: "substancias",
    byBand: {
      adolescente: ["AUDIT-C", "CRAFFT", "ASSIST"],
      adulto: ["AUDIT-C", "CRAFFT", "CAGE", "ASSIST"],
      idoso: ["AUDIT-C", "CAGE", "ASSIST"],
    },
    noteByBand: {
      crianca: "Uso de substâncias em menores de 12 anos — abordar na consulta",
    },
  },
  {
    symptom: "jogos",
    byBand: {
      adolescente: ["PGSI"],
      adulto: ["PGSI"],
      idoso: ["PGSI"],
    },
    noteByBand: {
      crianca: "Jogos e apostas em menores de 12 anos — abordar com o responsável",
    },
  },
  {
    symptom: "morte",
    riskPathway: true,
    byBand: {
      crianca: ["RISCO-ADO"],
      adolescente: ["ASQ"],
      adulto: ["ASQ"],
      idoso: ["ASQ"],
    },
  },
  {
    symptom: "atencao",
    byBand: {
      crianca: ["SNAP-IV", "ASRS-C"],
      adolescente: ["SNAP-IV", "ASRS-C"],
      adulto: ["ASRS-18"],
      idoso: ["ASRS-18"],
    },
  },
  {
    symptom: "oscilacao",
    byBand: {
      adolescente: ["MDQ"],
      adulto: ["MDQ"],
      idoso: ["MDQ"],
    },
    noteByBand: {
      crianca:
        "Oscilação de humor em menores de 12 anos — avaliar na consulta com o responsável",
    },
  },
  {
    symptom: "tabaco",
    byBand: {
      adolescente: ["FTND"],
      adulto: ["FTND"],
      idoso: ["FTND"],
    },
    noteByBand: {
      crianca: "Uso de tabaco em menores de 12 anos — abordar com o responsável",
    },
  },
  {
    symptom: "perinatal",
    byBand: {
      adolescente: ["EPDS"],
      adulto: ["EPDS"],
      idoso: ["EPDS"],
    },
    noteByBand: {
      crianca: "Gestação em menor de 12 anos — atendimento prioritário e protocolo de proteção",
    },
  },
  {
    symptom: "alimentar",
    byBand: {
      crianca: ["SCOFF"],
      adolescente: ["SCOFF"],
      adulto: ["SCOFF"],
      idoso: ["SCOFF"],
    },
  },
  {
    symptom: "sono",
    byBand: {
      adolescente: ["ISI"],
      adulto: ["ISI"],
      idoso: ["ISI"],
    },
    noteByBand: {
      crianca: "Sono infantil — avaliar rotina e higiene do sono com o responsável",
    },
  },
  {
    symptom: "neuro",
    byBand: {
      adulto: ["AQ-10"],
      idoso: ["AQ-10"],
    },
    noteByBand: {
      crianca: "Sinais de TEA na infância — avaliar marcos de desenvolvimento com o responsável",
      adolescente: "Sinais de TEA em adolescentes — avaliar trajetória de desenvolvimento na consulta",
    },
  },
  {
    symptom: "trabalho",
    byBand: {
      adulto: ["MBI-HSS", "COPSOQ-BR"],
      idoso: ["MBI-HSS", "COPSOQ-BR"],
    },
    noteByBand: {
      crianca: "Não aplicável a menores de 12 anos",
      adolescente: "Saúde mental relacionada ao trabalho/estágio — avaliar na consulta",
    },
  },
  {
    symptom: "memoria",
    byBand: {
      adulto: ["AD-8"],
      idoso: ["AD-8"],
    },
    noteByBand: {
      crianca: "Dificuldades de memória/aprendizagem na infância — investigar histórico escolar e neurodesenvolvimento",
      adolescente: "Queixas cognitivas em adolescentes — investigar sono, sobrecarga e atenção",
    },
  },
];

/** Rastreios universais obrigatórios aplicados independentemente dos sintomas. */
export const BASELINE_BY_BAND: Partial<Record<AgeBand, string[]>> = {
  adolescente: [],
  adulto: ["SRQ-20"],
  idoso: ["SRQ-20"],
};

/* ------------------------------------------------------------------ */
/* 2) Escalonamento condicional (resultado → próxima escala)           */
/* ------------------------------------------------------------------ */

const item = (r: ScaleResult, id: string) => r.answers?.[id] ?? 0;

const subscore = (r: ScaleResult, key: string) =>
  r.subscores?.find((s) => s.key === key)?.score ?? 0;

export const ESCALATION_RULES: EscalationRule[] = [
  // Depressão
  {
    from: "PHQ-2",
    when: (r) => r.score >= 3,
    add: ["PHQ-9"],
    reason: "PHQ-2 positivo (≥ 3) — aprofundar com PHQ-9",
  },
  {
    from: "PHQ-9",
    when: (r) => item(r, "9") > 0,
    add: ["ASQ"],
    reason: "Item 9 do PHQ-9 positivo — rastreio de risco de suicídio",
    riskPathway: true,
  },
  {
    from: "PHQ-9",
    when: (r) => r.score >= 10,
    add: ["ASQ", "PC-PTSD-5"],
    reason: "PHQ-9 moderado ou grave — checar risco e trauma associado",
  },
  {
    from: "GDS-15",
    when: (r) => r.score >= 5,
    add: ["ASQ"],
    reason: "GDS-15 sugestiva de depressão — rastrear risco de suicídio",
  },
  // Ansiedade
  {
    from: "GAD-2",
    when: (r) => r.score >= 3,
    add: ["GAD-7"],
    reason: "GAD-2 positivo (≥ 3) — aprofundar com GAD-7",
  },
  {
    from: "GAD-7",
    when: (r) => r.score >= 10,
    add: ["PHQ-2"],
    reason: "Ansiedade moderada/grave — rastrear depressão associada",
  },
  // Sofrimento geral
  {
    from: "SRQ-20",
    when: (r) => r.score >= 7,
    add: ["PHQ-2", "GAD-2"],
    reason: "SRQ-20 positivo — separar componente depressivo e ansioso",
  },
  {
    from: "SRQ-20",
    when: (r) => item(r, "17") > 0,
    add: ["ASQ"],
    reason: "Item 17 do SRQ-20 (ideia de acabar com a vida) positivo",
    riskPathway: true,
  },
  // Risco
  {
    from: "ASQ",
    when: (r) => r.score >= 1,
    add: [],
    reason: "ASQ positivo — via de risco ativada",
    riskPathway: true,
  },
  {
    from: "RISCO-ADO",
    when: (r) => r.score >= 1,
    add: [],
    reason: "Rastreio de risco em adolescente positivo",
    riskPathway: true,
  },
  // Álcool
  {
    from: "AUDIT-C",
    when: (r) => r.score >= 3,
    add: ["AUDIT"],
    reason: "AUDIT-C positivo — aplicar AUDIT completo",
  },
  {
    from: "AUDIT",
    when: (r) => r.score >= 8,
    add: ["CAGE"],
    reason: "AUDIT ≥ 8 — complementar com histórico (CAGE)",
  },
  // Substâncias (ASSIST-Lite: as regras olham o escore por substância)
  {
    from: "ASSIST",
    when: (r) => subscore(r, "ASSIST_ALCOOL") >= 2,
    add: ["AUDIT"],
    reason:
      "ASSIST-Lite: álcool em risco moderado/alto (≥ 2) — aplicar AUDIT completo",
  },
  {
    from: "ASSIST",
    when: (r) => (r.subscores ?? []).some((s) => s.band_level >= 4),
    add: ["PHQ-2"],
    reason:
      "ASSIST-Lite: alto risco em ao menos uma substância — rastrear comorbidade depressiva",
  },
  // Jogo problemático
  {
    from: "PGSI",
    when: (r) => r.score >= 3,
    add: ["PHQ-2", "GAD-2"],
    reason: "PGSI ≥ 3 (risco moderado) — rastrear humor e ansiedade associados",
  },
  {
    from: "PGSI",
    when: (r) => r.score >= 8,
    add: ["ASQ"],
    reason: "PGSI ≥ 8 (jogo problemático) — rastrear risco de suicídio",
  },
  // Obsessivo-compulsivo
  {
    from: "OCI-R",
    when: (r) => r.score >= 21,
    add: ["GAD-2"],
    reason: "OCI-R acima do corte (≥ 21) — rastrear ansiedade associada",
  },
  // Trauma
  {
    from: "PC-PTSD-5",
    when: (r) => r.score >= 3,
    add: ["PCL-5"],
    reason: "PC-PTSD-5 positivo (≥ 3) — aprofundar com PCL-5",
  },
  // Somático
  {
    from: "PHQ-15",
    when: (r) => r.score >= 10,
    add: ["PHQ-2", "GAD-2"],
    reason: "Carga somática alta — rastrear depressão e ansiedade associadas",
  },
  // Espectro bipolar
  {
    from: "PHQ-9",
    when: (r) => r.score >= 10,
    add: ["MDQ"],
    reason:
      "Depressão moderada ou grave — rastrear espectro bipolar antes de conduta antidepressiva",
  },
  {
    from: "MDQ",
    when: (r) => r.score >= 7,
    add: ["PHQ-2", "ASQ"],
    reason: "MDQ positivo (≥ 7) — confirmar humor atual e checar risco",
  },
  // Tabaco / nicotina
  {
    from: "ASSIST",
    when: (r) => subscore(r, "ASSIST_TABACO") >= 1,
    add: ["FTND"],
    reason:
      "ASSIST-Lite: uso de tabaco nos últimos 3 meses — medir dependência de nicotina (Fagerström)",
  },
  {
    from: "FTND",
    when: (r) => r.score >= 6,
    add: ["PHQ-2"],
    reason:
      "Dependência de nicotina elevada — rastrear humor (impacta prognóstico de cessação)",
  },
  // Perinatal
  {
    from: "EPDS",
    when: (r) => r.score >= 10,
    add: ["GAD-2"],
    reason: "EPDS ≥ 10 — rastreio perinatal positivo, avaliar componente ansioso",
  },
  {
    from: "EPDS",
    when: (r) => item(r, "10") > 0 || r.score >= 13,
    add: ["ASQ"],
    reason: "EPDS com item de autoagressão positivo ou escore ≥ 13 — via de risco",
    riskPathway: true,
  },
  // Transtornos alimentares
  {
    from: "SCOFF",
    when: (r) => r.score >= 2,
    add: ["PHQ-2", "GAD-2"],
    reason: "SCOFF positivo (≥ 2) — rastrear humor e ansiedade associados",
  },
  // Sono
  {
    from: "ISI",
    when: (r) => r.score >= 15,
    add: ["PHQ-2", "GAD-2"],
    reason: "Insônia moderada ou grave — rastrear depressão e ansiedade associadas",
  },
  // Neurodesenvolvimento
  {
    from: "AQ-10",
    when: (r) => r.score >= 6,
    add: ["ASRS-18"],
    reason: "AQ-10 positivo — checar sobreposição com TDAH",
  },
  // Saúde ocupacional (NR-01)
  {
    from: "COPSOQ-BR",
    when: (r) => r.score >= 29,
    add: ["SRQ-20", "PHQ-2", "GAD-2"],
    reason: "Risco psicossocial alto no trabalho — rastrear sofrimento mental associado",
  },
  {
    from: "COPSOQ-BR",
    when: (r) => item(r, "14") >= 2,
    add: ["PC-PTSD-5"],
    reason: "Relato de assédio ou violência no trabalho — rastrear estresse pós-traumático",
  },
  // Cognição
  {
    from: "AD-8",
    when: (r) => r.score >= 2,
    add: ["GDS-15"],
    reason: "AD-8 sugestivo de mudança cognitiva — diferenciar de depressão (GDS-15)",
  },
];

/** Ordem preferencial de aplicação. */
const ORDER = [
  "ASQ",
  "RISCO-ADO",
  "SRQ-20",
  "PHQ-2",
  "PHQ-9",
  "MDQ",
  "GDS-15",
  "AD-8",
  "GAD-2",
  "GAD-7",
  "EPDS",
  "ISI",
  "SCOFF",
  "AUDIT-C",
  "AUDIT",
  "CAGE",
  "CRAFFT",
  "ASSIST",
  "FTND",
  "PGSI",
  "OCI-R",
  "PC-PTSD-5",
  "PCL-5",
  "PHQ-15",
  "SNAP-IV",
  "ASRS-C",
  "ASRS-18",
  "AQ-10",
  "MBI-HSS",
  "COPSOQ-BR",
];

/** Decide se a escala entra no fluxo agora ou vira indicação ao profissional. */
function classify(
  code: string,
  age: number | null,
  reason: string,
): { kind: "flow" | "indicated" | "skip"; indicated?: IndicatedScale } {
  const scale = SCALE_BY_CODE[code];
  if (!scale) return { kind: "skip" };

  if (!isScaleAllowedForAge(scale, age)) {
    if (scale.quietIfOutOfRange) return { kind: "skip" };
    return {
      kind: "indicated",
      indicated: {
        code,
        name: scale.fullName,
        reason: `${reason} — fora da faixa etária desta escala`,
      },
    };
  }
  if (scale.status === "estrutura") {
    return {
      kind: "indicated",
      indicated: {
        code,
        name: scale.fullName,
        reason:
          scale.licenseNote ??
          `${reason} — instrumento indicado, aplicação na consulta`,
      },
    };
  }
  return { kind: "flow" };
}

/**
 * Detecta se o sexo informado corresponde ao sexo biológico masculino / homem cisgênero
 * para fins de elegibilidade em instrumentos obstétricos/perinatais restritos.
 */
export function isMaleSex(sex: string | null | undefined): boolean {
  if (!sex) return false;
  const s = sex.trim().toLowerCase();
  if (
    s.includes("mulher") ||
    s.includes("feminina") ||
    s.includes("feminino") ||
    s.includes("trans")
  ) {
    return false;
  }
  return (
    s === "m" ||
    s === "male" ||
    s === "homem" ||
    s === "masculino" ||
    s.startsWith("masculino") ||
    s.startsWith("homem") ||
    s.includes("homem cis") ||
    s.includes("masculin") ||
    s.endsWith("homem")
  );
}

/**
 * Avalia se o paciente é do sexo masculino considerando tanto o campo de sexo/gênero
 * quanto pronomes declarados (ex: "Ele / Dele").
 */
export function isMalePatient(respondent?: {
  respondent_sex?: string | null;
  pronouns?: string | null;
} | null): boolean {
  if (!respondent) return false;
  if (isMaleSex(respondent.respondent_sex)) return true;
  if (
    respondent.pronouns === "Ele / Dele" &&
    !respondent.respondent_sex?.toLowerCase().includes("fem") &&
    !respondent.respondent_sex?.toLowerCase().includes("mulher")
  ) {
    return true;
  }
  return false;
}

/**
 * Constrói o plano de triagem do paciente garantindo rigorosamente os parâmetros
 * (symptoms, age, sex) e a trava biológica masculina para exclusão da EPDS.
 */
export function buildTriagePlan(
  symptoms: string[],
  age: number | null,
  sex: string | null = null,
): TriagePlan {
  const band = ageBand(age);
  const decisions: TriageDecision[] = [];
  const wanted: { code: string; reason: string }[] = [];
  const isMale = isMaleSex(sex);

  // Se o paciente for masculino, qualquer queixa perinatal é expurgada na entrada
  const effectiveSymptoms = isMale
    ? symptoms.filter((s) => s !== "perinatal")
    : symptoms;

  if (isMale && symptoms.includes("perinatal")) {
    decisions.push({
      step: "EPDS",
      reason: "Escala EPDS (depressão perinatal) não aplicável a paciente do sexo masculino",
    });
  }

  for (const code of BASELINE_BY_BAND[band] ?? []) {
    wanted.push({ code, reason: `Rastreio geral (${AGE_BAND_LABEL[band]})` });
  }

  for (const rule of ROUTING_RULES) {
    if (!effectiveSymptoms.includes(rule.symptom)) continue;
    if (rule.riskPathway) decisions.push({ step: rule.symptom, reason: "Via de risco ativada pelo sintoma relatado" });

    const codes = rule.byBand[band] ?? [];
    for (const code of codes) {
      if (!wanted.some((w) => w.code === code)) {
        wanted.push({
          code,
          reason: `Sintoma "${rule.symptom}" em ${AGE_BAND_LABEL[band].toLowerCase()}`,
        });
      }
    }

    const note = rule.noteByBand?.[band];
    if (note && codes.length === 0) {
      decisions.push({ step: rule.symptom, reason: note });
    }
  }

  const flow: string[] = [];
  const indicated: IndicatedScale[] = [];

  for (const { code, reason } of wanted) {
    if (code === "EPDS" && isMale) {
      if (!decisions.some((d) => d.step === "EPDS")) {
        decisions.push({
          step: "EPDS",
          reason: "Escala EPDS (depressão perinatal) não aplicável a paciente do sexo masculino",
        });
      }
      continue;
    }

    const r = classify(code, age, reason);
    if (r.kind === "flow") {
      flow.push(code);
      decisions.push({ step: code, reason });
    } else if (r.kind === "indicated" && r.indicated) {
      indicated.push(r.indicated);
    }
  }

  // Avisos de faixa etária sem instrumento aplicável
  for (const rule of ROUTING_RULES) {
    if (!effectiveSymptoms.includes(rule.symptom)) continue;
    const note = rule.noteByBand?.[band];
    if (note && !indicated.some((i) => i.reason === note)) {
      const codes = rule.byBand[band] ?? [];
      if (codes.length === 0) {
        indicated.push({ code: rule.symptom.toUpperCase(), name: note, reason: note });
      }
    }
  }

  const safeFlow = isMale ? flow.filter((c) => c !== "EPDS") : flow;
  const safeIndicated = isMale ? indicated.filter((i) => i.code !== "EPDS") : indicated;

  safeFlow.sort((a, b) => orderOf(a) - orderOf(b));

  const riskPathway = ROUTING_RULES.some(
    (r) => r.riskPathway && effectiveSymptoms.includes(r.symptom),
  );

  return { flow: safeFlow, indicated: safeIndicated, decisions, riskPathway, band };
}

function orderOf(code: string) {
  const i = ORDER.indexOf(code);
  return i === -1 ? 99 : i;
}

/**
 * Aplica as regras de escalonamento depois que uma escala é respondida.
 * Retorna o plano atualizado (fluxo, indicações, via de risco).
 */
export function applyEscalations(
  plan: TriagePlan,
  result: ScaleResult,
  age: number | null,
  completedCodes: string[],
  currentIndex: number,
  sex?: string | null,
): TriagePlan {
  let flow = [...plan.flow];
  const indicated = [...plan.indicated];
  const decisions = [...plan.decisions];
  let riskPathway = plan.riskPathway;
  let insertAt = currentIndex + 1;
  const isMale = isMaleSex(sex);

  for (const rule of ESCALATION_RULES) {
    if (rule.from !== result.scale_code) continue;
    if (!rule.when({ ...result, score: effectiveScore(result) })) continue;

    if (rule.riskPathway) riskPathway = true;
    decisions.push({ step: rule.from, reason: rule.reason });

    for (const code of rule.add) {
      if (code === "EPDS" && isMale) continue;
      if (flow.includes(code) || completedCodes.includes(code)) continue;
      if (indicated.some((i) => i.code === code)) continue;

      const c = classify(code, age, rule.reason);
      if (c.kind === "flow") {
        flow = [...flow.slice(0, insertAt), code, ...flow.slice(insertAt)];
        insertAt += 1;
      } else if (c.kind === "indicated" && c.indicated) {
        indicated.push(c.indicated);
      }
    }
  }

  const safeFlow = isMale ? flow.filter((c) => c !== "EPDS") : flow;
  const safeIndicated = isMale ? indicated.filter((i) => i.code !== "EPDS") : indicated;

  return { ...plan, flow: safeFlow, indicated: safeIndicated, decisions, riskPathway };
}

export function calcAge(birthDateISO: string): number | null {
  if (!birthDateISO) return null;
  const d = new Date(birthDateISO);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}
