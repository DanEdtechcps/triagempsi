import { SCALE_BY_CODE, type Scale, type ScaleBand } from "./scales-data";

/** Quem preencheu o questionário. */
export type Informant = "paciente" | "familiar";

export const INFORMANT_LABEL: Record<Informant, string> = {
  paciente: "O próprio paciente",
  familiar: "Familiar ou responsável",
};

/**
 * Domínios internalizantes: quando descritos por um terceiro, tendem a ser
 * subnotificados (o familiar não enxerga o sofrimento interno). Nesses casos
 * aplicamos uma margem de sensibilidade de 1 ponto no ponto de corte.
 */
const INTERNALIZANTES = new Set([
  "depressao",
  "ansiedade",
  "risco",
  "trauma",
  "obsessivo",
  "somatico",
  "geral",
]);

export type ScaleResult = {
  scale_code: string;
  scale_name: string;
  score: number;
  band: string;
  band_level: number;
  answers: Record<string, number>;
  risk: boolean;
  /** informante que respondeu esta escala */
  informant?: Informant;
  /**
   * escore usado nas regras de encaminhamento/classificação — igual ao bruto,
   * exceto quando o ajuste por informante se aplica
   */
  score_adjusted?: number;
  /** observação clínica sobre a validade do escore diante do informante */
  informant_note?: string | null;
  /** escores por subescala (ex.: substâncias do ASSIST-Lite), quando a escala tem */
  subscores?: SubscoreResult[];
};

/** Escore de uma subescala, com faixa e conduta recomendada. */
export type SubscoreResult = {
  key: string;
  label: string;
  score: number;
  /** escore máximo possível da subescala */
  max: number;
  band: string;
  band_level: number;
  recommendation?: string;
};

function bandFor(scale: { bands: ScaleBand[] }, score: number): ScaleBand {
  return (
    scale.bands.find((b) => score >= b.min && score <= b.max) ??
    scale.bands[scale.bands.length - 1]
  );
}

/**
 * Pontua cada subescala da escala (ex.: substâncias do ASSIST-Lite).
 * Itens pulados pela ramificação chegam gravados como 0 — entram na soma
 * sem efeito, como manda o manual do instrumento.
 */
export function computeSubscores(
  scale: Scale,
  answers: Record<string, number>,
): SubscoreResult[] | undefined {
  if (!scale.subscales?.length) return undefined;
  return scale.subscales.map((sub) => {
    const score = sub.items.reduce(
      (acc, id) => acc + (Number(answers[id]) || 0),
      0,
    );
    const band = bandFor({ bands: sub.bands }, score) as (typeof sub.bands)[number];
    return {
      key: sub.key,
      label: sub.label,
      score,
      max: sub.bands[sub.bands.length - 1]?.max ?? sub.items.length,
      band: band.label,
      band_level: band.level,
      recommendation: band.recommendation,
    };
  });
}

/** Escore que vale para regras de corte e escalonamento. */
export function effectiveScore(r: ScaleResult): number {
  return r.score_adjusted ?? r.score;
}

export function scoreScale(
  scaleCode: string,
  answers: Record<string, number>,
  informant: Informant = "paciente",
): ScaleResult {
  const scale = SCALE_BY_CODE[scaleCode];
  if (!scale) throw new Error(`Escala desconhecida: ${scaleCode}`);

  const score = Object.values(answers).reduce((a, b) => a + (Number(b) || 0), 0);

  // Ajuste conforme o informante -------------------------------------------
  const mode = scale.informantMode ?? "auto";
  let adjusted = score;
  let note: string | null = null;

  if (informant === "familiar" && mode === "auto") {
    const cutoff = scale.positiveCutoff;
    if (cutoff != null && INTERNALIZANTES.has(scale.domain) && score === cutoff - 1) {
      adjusted = cutoff;
      note =
        "Respondido por familiar/responsável em escala de autorrelato: aplicada margem de sensibilidade de 1 ponto (sintomas internalizantes costumam ser subnotificados por terceiros). Escore bruto " +
        `${score}, considerado ${adjusted} para fins de rastreio — confirmar com o paciente.`;
    } else {
      note =
        "Respondido por familiar/responsável em escala de autorrelato: escore heteroinformado, deve ser confirmado com o paciente em consulta.";
    }
  } else if (informant === "paciente" && mode === "hetero") {
    note =
      "Escala prevista para resposta de um responsável/observador; foi preenchida pelo próprio paciente — interpretar com cautela.";
  }

  const band = bandFor(scale, adjusted);

  // Subescalas (ex.: ASSIST-Lite): a faixa exibida deriva da pior
  // classificação entre as substâncias, não do escore total.
  const subscores = computeSubscores(scale, answers);
  let bandLabel = band.label;
  let bandLevel = band.level;
  if (subscores) {
    const worstLevel = Math.max(...subscores.map((s) => s.band_level));
    const atWorst = subscores.filter((s) => s.band_level === worstLevel && worstLevel > 0);
    bandLevel = worstLevel;
    bandLabel =
      atWorst.length === 0
        ? "Baixo risco em todas as substâncias"
        : `${atWorst[0].band} — ${atWorst.map((s) => s.label).join(", ")}`;
  }

  // Regras de risco: itens sinalizados na configuração da escala
  let risk = false;
  for (const itemId of scale.riskItems ?? []) {
    if ((answers[itemId] ?? 0) > 0) risk = true;
  }
  // Escalas cujo domínio é risco: qualquer resposta positiva sinaliza
  if (scale.domain === "risco" && adjusted >= (scale.positiveCutoff ?? 1)) {
    risk = true;
  }

  return {
    scale_code: scale.code,
    scale_name: scale.fullName,
    score,
    band: bandLabel,
    band_level: bandLevel,
    answers,
    risk,
    informant,
    score_adjusted: adjusted,
    informant_note: note,
    subscores,
  };
}

export function shouldTrigger(scaleCode: string, result: ScaleResult): string | null {
  const scale = SCALE_BY_CODE[scaleCode];
  if (!scale?.triggersScale || scale.positiveCutoff == null) return null;
  return result.score >= scale.positiveCutoff ? scale.triggersScale : null;
}

export function summarize(
  results: ScaleResult[],
  extra?: {
    symptoms?: string[];
    indicated?: { code: string; name: string; reason: string }[];
    riskPathway?: boolean;
    /** trilha de decisões do encaminhamento (sintoma/idade → escala → escalada) */
    decisions?: { step: string; reason: string }[];
    ageBand?: string;
    informant?: Informant;
  },
) {

  const byDomain: Record<string, ScaleResult> = {};
  for (const r of results) {
    const s = SCALE_BY_CODE[r.scale_code];
    if (!s) continue;
    const existing = byDomain[s.domain];
    if (!existing || (existing.band_level ?? 0) < r.band_level) {
      byDomain[s.domain] = r;
    }
  }
  const riskFlags = results.filter((r) => r.risk).map((r) => r.scale_code);
  if (extra?.riskPathway && !riskFlags.includes("VIA_RISCO")) {
    riskFlags.push("VIA_RISCO");
  }
  return {
    highlights: Object.entries(byDomain).map(([domain, r]) => ({
      domain,
      code: r.scale_code,
      score: r.score,
      band: r.band,
      level: r.band_level,
    })),
    symptoms: extra?.symptoms ?? [],
    indicated_scales: extra?.indicated ?? [],
    routing_decisions: extra?.decisions ?? [],
    age_band: extra?.ageBand ?? null,
    informant: extra?.informant ?? "paciente",
    informant_notes: results
      .filter((r) => r.informant_note)
      .map((r) => ({ code: r.scale_code, note: r.informant_note as string })),
    risk_pathway: Boolean(extra?.riskPathway),
    risk_flags: riskFlags,
  };
}

