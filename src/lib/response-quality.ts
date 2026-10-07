/**
 * Índice de qualidade da resposta — sinal de APOIO ao médico, nunca decisão.
 *
 * Regras de segurança (invioláveis):
 *  - NÃO altera a classificação, o escore, a via de risco nem o alerta à equipe;
 *  - itens de risco ficam fora da análise de tempo;
 *  - "qualidade baixa" significa apenas "confirmar na consulta": quem responde
 *    tudo igual pode estar, de fato, muito mal (e idosos, pessoas com baixa
 *    escolaridade ou em sofrimento agudo respondem diferente do esperado);
 *  - os limiares abaixo são PROVISÓRIOS: a literatura consultada não trouxe
 *    pontos de corte confiáveis para questionários de sintomas; devem ser
 *    calibrados com os dados do piloto.
 *
 * Funções puras (sem rede nem banco), testáveis.
 */

/** Tempo abaixo do qual uma resposta é tratada como "muito rápida" (provisório). */
export const RAPID_RESPONSE_MS = 600;
/** Proporção de respostas muito rápidas que caracteriza preenchimento apressado (provisório). */
export const RAPID_SHARE_THRESHOLD = 0.5;
/** Mínimo de itens com tempo para avaliar o ritmo. */
export const MIN_ITEMS_FOR_TIMING = 10;
/** Escalas com menos itens que isso não são avaliadas para "tudo igual". */
export const MIN_ITEMS_FOR_STRAIGHTLINE = 8;
/** Diferença mínima (em pontos) entre respostas ao MESMO enunciado para marcar inconsistência. */
export const REPEATED_ITEM_DIFF = 2;

export type QualityLevel = "adequada" | "atencao" | "baixa";

export type QualityFlagCode =
  | "ritmo_apressado"
  | "respostas_uniformes"
  | "item_repetido_inconsistente"
  | "risco_discordante";

export type QualityFlag = { code: QualityFlagCode; message: string };

export type QualityScaleInput = {
  scale_code: string;
  answers: Record<string, number> | null | undefined;
  /** itens completados por parada adaptativa (não respondidos de fato) */
  estimated_items?: string[] | null;
  /** nº de opções distintas da escala (2 = Sim/Não) — informado pelo chamador */
  option_count?: number;
  /** enunciado de cada item (para comparar o mesmo enunciado em escalas diferentes) */
  item_texts?: Record<string, string>;
  /** menor e maior valor possíveis (para escalar a diferença) */
  value_range?: [number, number];
};

export type TelemetryInput = {
  scale_code: string;
  item_id: string;
  response_time_ms: number;
  is_risk_item?: boolean;
};

export type QualityInput = {
  scales: QualityScaleInput[];
  telemetry?: TelemetryInput[] | null;
  /** ids dos sintomas marcados na entrada (ex.: "morte") */
  symptoms?: string[] | null;
};

export type QualityReport = {
  level: QualityLevel;
  flags: QualityFlag[];
  telemetry_available: boolean;
  items_analyzed: number;
  /** sempre verdadeiro: o índice não muda a classificação nem o alerta */
  informational_only: true;
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

/** Maior sequência de valores iguais consecutivos (índice "longstring"). */
export function longestRun(values: number[]): number {
  let best = 0;
  let cur = 0;
  let prev: number | null = null;
  for (const v of values) {
    cur = prev !== null && v === prev ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = v;
  }
  return best;
}

function sortedItemIds(answers: Record<string, number>): string[] {
  return Object.keys(answers).sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    return Number.isFinite(na) && Number.isFinite(nb) ? na - nb : a.localeCompare(b);
  });
}

function rapidShare(telemetry: TelemetryInput[]): { share: number; n: number } {
  const timed = telemetry.filter((t) => !t.is_risk_item && Number.isFinite(t.response_time_ms));
  if (!timed.length) return { share: 0, n: 0 };
  const rapid = timed.filter((t) => t.response_time_ms < RAPID_RESPONSE_MS).length;
  return { share: rapid / timed.length, n: timed.length };
}

function uniformFlags(scales: QualityScaleInput[]): QualityFlag[] {
  const out: QualityFlag[] = [];
  for (const s of scales) {
    if (!s.answers) continue;
    // Escalas Sim/Não e de contagem de sintomas não são avaliadas (uniformidade é esperada).
    if ((s.option_count ?? 99) <= 2) continue;
    const estimated = new Set(s.estimated_items ?? []);
    const ids = sortedItemIds(s.answers).filter((id) => !estimated.has(id));
    if (ids.length < MIN_ITEMS_FOR_STRAIGHTLINE) continue;
    const vals = ids.map((id) => s.answers![id]);
    if (longestRun(vals) === vals.length) {
      out.push({
        code: "respostas_uniformes",
        message: `${s.scale_code}: todas as ${vals.length} respostas foram iguais. Pode refletir um quadro real; confirmar na consulta.`,
      });
    }
  }
  return out;
}

function repeatedItemFlags(scales: QualityScaleInput[]): QualityFlag[] {
  type Seen = { scale: string; item: string; value: number; span: number };
  const byText = new Map<string, Seen[]>();
  for (const s of scales) {
    if (!s.answers || !s.item_texts) continue;
    const [lo, hi] = s.value_range ?? [0, 3];
    const span = Math.max(1, hi - lo);
    const estimated = new Set(s.estimated_items ?? []);
    for (const [item, value] of Object.entries(s.answers)) {
      const text = s.item_texts[item];
      if (!text || estimated.has(item)) continue;
      const key = norm(text);
      const list = byText.get(key) ?? [];
      list.push({ scale: s.scale_code, item, value: value - lo, span });
      byText.set(key, list);
    }
  }
  const out: QualityFlag[] = [];
  for (const list of byText.values()) {
    const distinctScales = new Set(list.map((l) => l.scale));
    if (distinctScales.size < 2) continue;
    // só compara escalas com a mesma amplitude de resposta
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.scale === b.scale || a.span !== b.span) continue;
        if (Math.abs(a.value - b.value) >= REPEATED_ITEM_DIFF) {
          out.push({
            code: "item_repetido_inconsistente",
            message: `O mesmo enunciado recebeu respostas diferentes em ${a.scale} (item ${a.item}) e ${b.scale} (item ${b.item}).`,
          });
        }
      }
    }
  }
  return out;
}

function riskDiscordanceFlags(input: QualityInput): QualityFlag[] {
  const out: QualityFlag[] = [];
  const asq = input.scales.find((s) => s.scale_code === "ASQ");
  const asqScore = asq?.answers ? Object.values(asq.answers).reduce((a, b) => a + b, 0) : null;
  const phq9 = input.scales.find((s) => s.scale_code === "PHQ-9");
  if (asqScore === 0 && (phq9?.answers?.["9"] ?? 0) > 0) {
    out.push({
      code: "risco_discordante",
      message:
        "O item 9 do PHQ-9 (pensamentos de morte/autolesão) foi positivo, mas o ASQ foi negativo. Tratar como risco e confirmar na consulta.",
    });
  }
  if (asqScore === 0 && (input.symptoms ?? []).includes("morte")) {
    out.push({
      code: "risco_discordante",
      message:
        "O paciente marcou pensamentos de morte ou de se machucar, mas o ASQ foi negativo. Tratar como risco e confirmar na consulta.",
    });
  }
  return out;
}

/** Calcula o índice. Nunca lança; sem dados devolve "adequada" com a ressalva de telemetria ausente. */
export function assessResponseQuality(input: QualityInput): QualityReport {
  const flags: QualityFlag[] = [];
  const telemetry = input.telemetry ?? [];
  const telemetryAvailable = telemetry.length > 0;

  let strongSpeeding = false;
  if (telemetryAvailable) {
    const { share, n } = rapidShare(telemetry);
    if (n >= MIN_ITEMS_FOR_TIMING && share >= RAPID_SHARE_THRESHOLD) {
      strongSpeeding = true;
      flags.push({
        code: "ritmo_apressado",
        message: `${Math.round(share * 100)}% das respostas (de ${n} itens) levaram menos de ${RAPID_RESPONSE_MS / 1000} s. Confirmar a leitura na consulta.`,
      });
    }
  }

  flags.push(...uniformFlags(input.scales));
  flags.push(...repeatedItemFlags(input.scales));
  flags.push(...riskDiscordanceFlags(input));

  const items = input.scales.reduce((n, s) => n + Object.keys(s.answers ?? {}).length, 0);
  let level: QualityLevel = "adequada";
  if (flags.length > 0) level = "atencao";
  if (strongSpeeding || flags.filter((f) => f.code !== "risco_discordante").length >= 2) level = "baixa";

  return {
    level,
    flags,
    telemetry_available: telemetryAvailable,
    items_analyzed: items,
    informational_only: true,
  };
}

export const QUALITY_LABEL: Record<QualityLevel, string> = {
  adequada: "Qualidade adequada",
  atencao: "Atenção: confirmar na consulta",
  baixa: "Qualidade baixa: confirmar na consulta",
};
