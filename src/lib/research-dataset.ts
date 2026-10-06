/**
 * Conjunto de dados para PESQUISA — anonimização e exportação (funções puras).
 *
 * Princípios (LGPD, art. 13 e art. 12; Res. CNS 466/2012 e 510/2016 — conferir com o CEP/DPO):
 *  - só entram triagens COM consentimento de pesquisa e de clínica com a pesquisa habilitada;
 *  - nada que identifique: sem nome, e-mail, telefone, data de nascimento, IP, queixa livre,
 *    notas de profissional, médico, convite/contato;
 *  - ids viram pseudônimos com HMAC-SHA256 e sal da clínica/protocolo (não reversíveis sem o sal);
 *  - quase-identificadores generalizados (faixa etária, sexo em categorias, mês) e verificação
 *    de k-anonimato (k mínimo): células pequenas são generalizadas e, se ainda assim pequenas, suprimidas;
 *  - saída em dois arquivos (triagens e escalas) + dicionário de variáveis + manifesto.
 * Anonimização por esse método reduz, mas não elimina, o risco de reidentificação: o
 * protocolo do CEP deve declarar o método e quem pode receber o arquivo.
 */

export type RawScaleResult = {
  scale_code: string;
  score: number | null;
  band_level: number | null;
  risk: boolean | null;
  answers: Record<string, number> | null;
  estimated_items: string[] | null;
};

export type RawOutcome = {
  concordance: string;
  risk_assessment: string;
  final_dx_icd10: string[] | null;
} | null;

export type RawAssessment = {
  id: string;
  clinic_id: string;
  created_at: string;
  respondent_age: number | null;
  respondent_sex: string | null;
  respondent_type: string | null;
  symptom_path: string[] | null;
  risk_flags: string[] | null;
  summary: Record<string, unknown> | null;
  research_consent: boolean;
  research_consent_version: string | null;
  scale_results: RawScaleResult[];
  outcome: RawOutcome;
};

export type DatasetOptions = {
  /** segredo/sal do protocolo (nunca gravado no arquivo) */
  salt: string;
  /** k mínimo de k-anonimato */
  k?: number;
  /** quais clínicas têm a pesquisa habilitada */
  enabledClinicIds: Set<string>;
};

export type AssessmentRow = {
  record_id: string;
  clinic_ref: string;
  period: string; // YYYY-MM (ou YYYY após generalizar)
  age_band: string;
  sex_category: string;
  respondent_type: string;
  symptoms: string;
  risk_pathway: boolean;
  risk_flags: string;
  scales_count: number;
  telemetry_available: boolean;
  median_item_time_ms: number | null;
  outcome_concordance: string;
  outcome_risk_assessment: string;
  outcome_dx_icd10: string;
  engine_version: string;
  consent_version: string;
};

export type ScaleRow = {
  record_id: string;
  scale_code: string;
  score: number | null;
  band_level: number | null;
  risk: boolean;
  estimated_items_count: number;
  answers_json: string;
};

export type DatasetManifest = {
  generated_at: string;
  k_min: number;
  included: number;
  excluded_no_consent: number;
  excluded_clinic_not_enabled: number;
  generalized_period: number;
  generalized_age: number;
  generalized_sex: number;
  suppressed: number;
};

export type ResearchDataset = {
  assessments: AssessmentRow[];
  scales: ScaleRow[];
  manifest: DatasetManifest;
};

export function ageBand(age: number | null | undefined): string {
  if (age == null || !Number.isFinite(age) || age < 0) return "nao_informado";
  if (age < 12) return "0-11";
  if (age < 18) return "12-17";
  if (age < 30) return "18-29";
  if (age < 45) return "30-44";
  if (age < 60) return "45-59";
  if (age < 75) return "60-74";
  return "75+";
}

const COARSE_AGE: Record<string, string> = {
  "0-11": "0-17",
  "12-17": "0-17",
  "18-29": "18-59",
  "30-44": "18-59",
  "45-59": "18-59",
  "60-74": "60+",
  "75+": "60+",
};

export function coarseAgeBand(band: string): string {
  return COARSE_AGE[band] ?? band;
}

/** Normaliza o campo livre de sexo/gênero em poucas categorias (sem texto livre). */
export function sexCategory(raw: string | null | undefined): string {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s || s.includes("prefiro")) return "nao_informado";
  if (s.includes("trans") || s.includes("não bin") || s.includes("nao bin") || s.includes("outra")) {
    return "trans_nao_binario_outro";
  }
  if (s.includes("fem") || s.includes("mulher")) return "feminino_cis";
  if (s.includes("mas") || s.includes("homem")) return "masculino_cis";
  return "trans_nao_binario_outro";
}

/** HMAC-SHA256 hex truncado (pseudônimo estável por sal). */
export async function pseudonym(salt: string, value: string, length = 16): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(salt),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, length);
}

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function telemetryMedian(summary: Record<string, unknown> | null): number | null {
  const recs = (summary?.telemetry_records ?? summary?.item_telemetry) as unknown;
  if (!Array.isArray(recs)) return null;
  const times = recs
    .map((r) => (r as { response_time_ms?: unknown }).response_time_ms)
    .filter((t): t is number => typeof t === "number" && Number.isFinite(t) && t >= 0);
  return median(times);
}

function engineVersion(summary: Record<string, unknown> | null): string {
  const v = summary?.engine_version;
  return typeof v === "string" && v ? v.slice(0, 40) : "desconhecida";
}

function riskPathway(a: RawAssessment): boolean {
  const s = a.summary as { risk_pathway?: unknown } | null;
  return Boolean(s?.risk_pathway) || (a.risk_flags?.length ?? 0) > 0;
}

type Work = AssessmentRow & { _scales: ScaleRow[] };

/** Monta o conjunto anonimizado; aplica consentimento, generalização e supressão. */
export async function buildResearchDataset(
  rows: RawAssessment[],
  opts: DatasetOptions,
): Promise<ResearchDataset> {
  const k = Math.max(2, opts.k ?? 5);
  const manifest: DatasetManifest = {
    generated_at: new Date().toISOString(),
    k_min: k,
    included: 0,
    excluded_no_consent: 0,
    excluded_clinic_not_enabled: 0,
    generalized_period: 0,
    generalized_age: 0,
    generalized_sex: 0,
    suppressed: 0,
  };

  const work: Work[] = [];
  for (const a of rows) {
    if (!opts.enabledClinicIds.has(a.clinic_id)) {
      manifest.excluded_clinic_not_enabled++;
      continue;
    }
    if (!a.research_consent) {
      manifest.excluded_no_consent++;
      continue;
    }
    const recordId = await pseudonym(opts.salt, `assessment:${a.id}`);
    const clinicRef = await pseudonym(opts.salt, `clinic:${a.clinic_id}`, 8);
    const med = telemetryMedian(a.summary);
    const scales: ScaleRow[] = (a.scale_results ?? []).map((r) => ({
      record_id: recordId,
      scale_code: r.scale_code,
      score: r.score,
      band_level: r.band_level,
      risk: Boolean(r.risk),
      estimated_items_count: r.estimated_items?.length ?? 0,
      answers_json: JSON.stringify(r.answers ?? {}),
    }));
    work.push({
      record_id: recordId,
      clinic_ref: clinicRef,
      period: a.created_at.slice(0, 7),
      age_band: ageBand(a.respondent_age),
      sex_category: sexCategory(a.respondent_sex),
      respondent_type: a.respondent_type === "familiar" ? "familiar" : "paciente",
      symptoms: (a.symptom_path ?? []).join("|"),
      risk_pathway: riskPathway(a),
      risk_flags: (a.risk_flags ?? []).join("|"),
      scales_count: scales.length,
      telemetry_available: med !== null,
      median_item_time_ms: med,
      outcome_concordance: a.outcome?.concordance ?? "sem_desfecho",
      outcome_risk_assessment: a.outcome?.risk_assessment ?? "sem_desfecho",
      outcome_dx_icd10: (a.outcome?.final_dx_icd10 ?? []).join("|"),
      engine_version: engineVersion(a.summary),
      consent_version: a.research_consent_version ?? "",
      _scales: scales,
    });
  }

  // k-anonimato sobre os quase-identificadores (clínica, período, faixa etária, sexo).
  const key = (w: Work) => [w.clinic_ref, w.period, w.age_band, w.sex_category].join("¦");
  const sizes = () => {
    const m = new Map<string, number>();
    for (const w of work) m.set(key(w), (m.get(key(w)) ?? 0) + 1);
    return m;
  };

  // Passo 1: período mensal → anual
  let m = sizes();
  for (const w of work) {
    if ((m.get(key(w)) ?? 0) < k && w.period.length === 7) {
      w.period = w.period.slice(0, 4);
      manifest.generalized_period++;
    }
  }
  // Passo 2: faixa etária fina → grossa
  m = sizes();
  for (const w of work) {
    if ((m.get(key(w)) ?? 0) < k) {
      const c = coarseAgeBand(w.age_band);
      if (c !== w.age_band) {
        w.age_band = c;
        manifest.generalized_age++;
      }
    }
  }
  // Passo 3: sexo → suprimido
  m = sizes();
  for (const w of work) {
    if ((m.get(key(w)) ?? 0) < k && w.sex_category !== "suprimido") {
      w.sex_category = "suprimido";
      manifest.generalized_sex++;
    }
  }
  // Passo 4: o que ainda ficar em célula < k sai do arquivo
  m = sizes();
  const kept: Work[] = [];
  for (const w of work) {
    if ((m.get(key(w)) ?? 0) < k) manifest.suppressed++;
    else kept.push(w);
  }

  manifest.included = kept.length;
  return {
    assessments: kept.map(({ _scales: _s, ...row }) => row),
    scales: kept.flatMap((w) => w._scales),
    manifest,
  };
}

/** CSV (RFC 4180) com BOM opcional para abrir bem no Excel. */
export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: (keyof T & string)[]): string {
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.join(",");
  const body = rows.map((r) => columns.map((c) => esc(r[c])).join(","));
  return [head, ...body].join("\r\n") + "\r\n";
}

export const ASSESSMENT_COLUMNS: (keyof AssessmentRow & string)[] = [
  "record_id",
  "clinic_ref",
  "period",
  "age_band",
  "sex_category",
  "respondent_type",
  "symptoms",
  "risk_pathway",
  "risk_flags",
  "scales_count",
  "telemetry_available",
  "median_item_time_ms",
  "outcome_concordance",
  "outcome_risk_assessment",
  "outcome_dx_icd10",
  "engine_version",
  "consent_version",
];

export const SCALE_COLUMNS: (keyof ScaleRow & string)[] = [
  "record_id",
  "scale_code",
  "score",
  "band_level",
  "risk",
  "estimated_items_count",
  "answers_json",
];

export const DATA_DICTIONARY: { file: string; variable: string; type: string; description: string }[] = [
  { file: "triagens.csv", variable: "record_id", type: "texto (16 hex)", description: "Pseudônimo da triagem (HMAC-SHA256 com sal do protocolo). Não reversível sem o sal." },
  { file: "triagens.csv", variable: "clinic_ref", type: "texto (8 hex)", description: "Pseudônimo da clínica de origem." },
  { file: "triagens.csv", variable: "period", type: "AAAA-MM ou AAAA", description: "Mês do envio; generalizado para o ano quando a célula era pequena (k-anonimato)." },
  { file: "triagens.csv", variable: "age_band", type: "categoria", description: "Faixa etária (0-11, 12-17, 18-29, 30-44, 45-59, 60-74, 75+; ou 0-17, 18-59, 60+ se generalizada)." },
  { file: "triagens.csv", variable: "sex_category", type: "categoria", description: "feminino_cis, masculino_cis, trans_nao_binario_outro, nao_informado ou suprimido." },
  { file: "triagens.csv", variable: "respondent_type", type: "categoria", description: "paciente ou familiar (quem respondeu)." },
  { file: "triagens.csv", variable: "symptoms", type: "lista (|)", description: "Sintomas marcados na entrada do questionário (identificadores do motor)." },
  { file: "triagens.csv", variable: "risk_pathway", type: "booleano", description: "A pré-triagem acionou a via de risco (teste positivo)." },
  { file: "triagens.csv", variable: "risk_flags", type: "lista (|)", description: "Escalas/sinais que acionaram o risco." },
  { file: "triagens.csv", variable: "scales_count", type: "inteiro", description: "Número de escalas aplicadas." },
  { file: "triagens.csv", variable: "telemetry_available", type: "booleano", description: "Há tempos de resposta reais capturados." },
  { file: "triagens.csv", variable: "median_item_time_ms", type: "inteiro", description: "Mediana do tempo por item, em ms (vazio sem telemetria)." },
  { file: "triagens.csv", variable: "outcome_concordance", type: "categoria", description: "Concordância do psiquiatra com a classificação: concorda, concorda_parcialmente, nao_concorda ou sem_desfecho." },
  { file: "triagens.csv", variable: "outcome_risk_assessment", type: "categoria", description: "Referência para risco na consulta: risco_confirmado, risco_nao_confirmado, nao_avaliado ou sem_desfecho." },
  { file: "triagens.csv", variable: "outcome_dx_icd10", type: "lista (|)", description: "Diagnóstico(s) final(is) CID-10 (até 5), sem texto livre." },
  { file: "triagens.csv", variable: "engine_version", type: "texto", description: "Versão do motor de regras/escalas que gerou a classificação." },
  { file: "triagens.csv", variable: "consent_version", type: "texto", description: "Versão do TCLE aceito pelo participante." },
  { file: "escalas.csv", variable: "record_id", type: "texto", description: "Liga à triagem (triagens.csv)." },
  { file: "escalas.csv", variable: "scale_code", type: "texto", description: "Código da escala (ex.: PHQ-9, GAD-7, SRQ-20)." },
  { file: "escalas.csv", variable: "score", type: "número", description: "Escore bruto da escala." },
  { file: "escalas.csv", variable: "band_level", type: "inteiro", description: "Nível da faixa de gravidade (0 = sem relevância)." },
  { file: "escalas.csv", variable: "risk", type: "booleano", description: "A escala sinalizou risco." },
  { file: "escalas.csv", variable: "estimated_items_count", type: "inteiro", description: "Itens completados por parada adaptativa (não respondidos de fato)." },
  { file: "escalas.csv", variable: "answers_json", type: "JSON", description: "Respostas por item: {\"id_do_item\": valor}. Só números; sem texto livre." },
];

export function dictionaryCsv(): string {
  return toCsv(DATA_DICTIONARY, ["file", "variable", "type", "description"]);
}
