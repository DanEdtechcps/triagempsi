/**
 * Métricas de acurácia da pré-triagem contra o desfecho clínico (padrão de referência = psiquiatra).
 *
 * Funções puras. Definição adotada (documentada no protocolo de pesquisa):
 *  - Teste positivo  = a triagem acionou a VIA DE RISCO (risk_flags/risk_pathway).
 *  - Referência      = o psiquiatra confirmou o risco na consulta (`risco_confirmado`).
 *  - Entram só desfechos com `risk_assessment` ≠ `nao_avaliado` (os demais não têm
 *    referência). Isso gera viés de verificação — registrado e informado na tela.
 * Intervalos de confiança de Wilson (95%), adequados para amostras pequenas.
 */

export type OutcomeRecord = {
  /** a triagem acionou a via de risco? */
  tested_positive: boolean;
  risk_assessment: "risco_confirmado" | "risco_nao_confirmado" | "nao_avaliado";
  concordance: "concorda" | "concorda_parcialmente" | "nao_concorda";
};

export type Proportion = {
  /** proporção 0–1 ou null se o denominador for 0 */
  value: number | null;
  numerator: number;
  denominator: number;
  /** IC 95% de Wilson */
  ci: [number, number] | null;
};

export type AccuracyReport = {
  total_outcomes: number;
  evaluated: number;
  not_evaluated: number;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  sensitivity: Proportion;
  specificity: Proportion;
  ppv: Proportion;
  npv: Proportion;
  concordance: {
    concorda: number;
    concorda_parcialmente: number;
    nao_concorda: number;
    rate_full_or_partial: Proportion;
  };
  /** aviso de amostra pequena (estimativas instáveis) */
  small_sample: boolean;
};

const Z95 = 1.959963984540054;

/** Intervalo de Wilson para uma proporção. */
export function wilsonInterval(successes: number, n: number, z = Z95): [number, number] | null {
  if (n <= 0) return null;
  const p = successes / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

export function proportion(numerator: number, denominator: number): Proportion {
  if (denominator <= 0) return { value: null, numerator, denominator, ci: null };
  return {
    value: numerator / denominator,
    numerator,
    denominator,
    ci: wilsonInterval(numerator, denominator),
  };
}

/** Amostra pequena: poucos casos de referência positivos OU negativos. */
export const SMALL_SAMPLE_MIN_PER_CELL = 30;

export function computeAccuracy(records: OutcomeRecord[]): AccuracyReport {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  const conc = { concorda: 0, concorda_parcialmente: 0, nao_concorda: 0 };

  for (const r of records) {
    conc[r.concordance] += 1;
    if (r.risk_assessment === "nao_avaliado") continue;
    const refPositive = r.risk_assessment === "risco_confirmado";
    if (r.tested_positive && refPositive) tp++;
    else if (r.tested_positive && !refPositive) fp++;
    else if (!r.tested_positive && refPositive) fn++;
    else tn++;
  }

  const evaluated = tp + fp + fn + tn;
  return {
    total_outcomes: records.length,
    evaluated,
    not_evaluated: records.length - evaluated,
    tp,
    fp,
    fn,
    tn,
    sensitivity: proportion(tp, tp + fn),
    specificity: proportion(tn, tn + fp),
    ppv: proportion(tp, tp + fp),
    npv: proportion(tn, tn + fn),
    concordance: {
      ...conc,
      rate_full_or_partial: proportion(conc.concorda + conc.concorda_parcialmente, records.length),
    },
    small_sample: tp + fn < SMALL_SAMPLE_MIN_PER_CELL || tn + fp < SMALL_SAMPLE_MIN_PER_CELL,
  };
}

/** Formata uma proporção como "83,3% (IC95% 67,2–92,7)" ou "—". */
export function formatProportion(p: Proportion): string {
  if (p.value === null || !p.ci) return "—";
  const pct = (x: number) => (x * 100).toFixed(1).replace(".", ",");
  return `${pct(p.value)}% (IC95% ${pct(p.ci[0])}–${pct(p.ci[1])}) · ${p.numerator}/${p.denominator}`;
}

/** Códigos CID-10 aceitos: letra + 2 dígitos, opcional ponto e até 4 alfanuméricos (ex.: F32, F32.1). */
export const ICD10_RE = /^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/;

export function normalizeIcd10(list: string[] | null | undefined): string[] {
  const out: string[] = [];
  for (const raw of list ?? []) {
    const code = raw.trim().toUpperCase();
    if (ICD10_RE.test(code) && !out.includes(code)) out.push(code);
  }
  return out.slice(0, 5);
}
