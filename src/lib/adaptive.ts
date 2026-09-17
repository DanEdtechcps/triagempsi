/**
 * Administração adaptativa das escalas (inspirada em item banks tipo
 * PROMIS/CAT-MH, mas determinística e auditável).
 *
 * Em vez de estimar theta por IRT — o que exigiria parâmetros licenciados —
 * usamos parada por limites (bounds): a cada resposta calculamos o menor e o
 * maior escore final ainda possíveis. Quando os dois caem na mesma faixa de
 * gravidade e nenhum item de risco ficou de fora, o restante da escala não
 * muda a conclusão clínica e pode ser encerrado.
 *
 * Vantagens: reduz itens sem perder a faixa, é exato (não probabilístico) e
 * a trilha de decisão consegue explicar por que a escala parou.
 */

import { SCALE_BY_CODE, getItemOptions } from "./scales-data";
import type { Scale } from "./scale-types";

/** Escalas longas onde a economia de itens compensa. */
export const ADAPTIVE_MIN_ITEMS = 8;

export type AdaptiveState = {
  /** encerra a escala agora */
  stop: boolean;
  itemsAnswered: number;
  itemsTotal: number;
  itemsSaved: number;
  /** faixa já determinada, quando stop = true */
  band?: string;
  reason?: string;
};

function itemRange(scale: Scale, itemId: string): { min: number; max: number } {
  const opts = getItemOptions(scale, itemId);
  const values = opts.map((o) => o.value);
  return { min: Math.min(...values), max: Math.max(...values) };
}

export function isAdaptiveEligible(scale: Scale | undefined): boolean {
  if (!scale) return false;
  if (scale.items.length < ADAPTIVE_MIN_ITEMS) return false;
  // Escalas categóricas / de contagem de sintomas precisam de todos os itens.
  if (["MDQ", "SCOFF", "AD-8", "AQ-10", "ASSIST"].includes(scale.code)) return false;
  return true;
}

/**
 * Decide se a escala pode ser encerrada com as respostas já dadas.
 * `answers` contém apenas os itens respondidos até agora.
 */
export function evaluateAdaptive(
  scaleCode: string,
  answers: Record<string, number>,
): AdaptiveState {
  const scale = SCALE_BY_CODE[scaleCode];
  const total = scale?.items.length ?? 0;
  const answered = Object.keys(answers).length;
  const base: AdaptiveState = {
    stop: false,
    itemsAnswered: answered,
    itemsTotal: total,
    itemsSaved: 0,
  };
  if (!scale || !isAdaptiveEligible(scale)) return base;

  const pending = scale.items.filter((i) => !(i.id in answers));
  if (pending.length === 0) return base;

  // Itens de risco nunca são pulados.
  const riskItems = new Set(scale.riskItems ?? []);
  if (pending.some((i) => riskItems.has(i.id))) return base;

  // Mínimo de itens antes de considerar parada (evita cortar cedo demais).
  if (answered < Math.max(4, Math.ceil(total * 0.4))) return base;

  const current = Object.values(answers).reduce((a, b) => a + (Number(b) || 0), 0);
  let addMin = 0;
  let addMax = 0;
  for (const item of pending) {
    const r = itemRange(scale, item.id);
    addMin += r.min;
    addMax += r.max;
  }

  const bandOf = (score: number) =>
    scale.bands.find((b) => score >= b.min && score <= b.max) ??
    scale.bands[scale.bands.length - 1];

  const low = bandOf(current + addMin);
  const high = bandOf(current + addMax);

  if (low.label === high.label) {
    return {
      stop: true,
      itemsAnswered: answered,
      itemsTotal: total,
      itemsSaved: pending.length,
      band: low.label,
      reason:
        `Faixa "${low.label}" já definida com ${answered} de ${total} itens — ` +
        `nenhuma combinação das respostas restantes mudaria a classificação.`,
    };
  }

  return base;
}

/**
 * Completa as respostas faltantes com o valor mais provável (a mediana da
 * escala) para que o escore final continue comparável entre aplicações.
 * O item completado fica marcado na trilha como estimado.
 */
export function completeAdaptiveAnswers(
  scaleCode: string,
  answers: Record<string, number>,
): { answers: Record<string, number>; estimated: string[] } {
  const scale = SCALE_BY_CODE[scaleCode];
  if (!scale) return { answers, estimated: [] };
  const out = { ...answers };
  const estimated: string[] = [];
  const answeredValues = Object.values(answers);
  const media =
    answeredValues.length > 0
      ? answeredValues.reduce((a, b) => a + b, 0) / answeredValues.length
      : 0;

  for (const item of scale.items) {
    if (item.id in out) continue;
    const r = itemRange(scale, item.id);
    const value = Math.max(r.min, Math.min(r.max, Math.round(media)));
    out[item.id] = value;
    estimated.push(item.id);
  }
  return { answers: out, estimated };
}
