import { SCALE_BY_CODE, getItemOptions } from "@/lib/scales-data";
import { scoreScale, type ScaleResult } from "@/lib/scoring";

/** Maior valor possível em um item da escala. */
function maxValue(code: string, itemId: string) {
  const scale = SCALE_BY_CODE[code];
  return Math.max(...getItemOptions(scale, itemId).map((o) => o.value));
}

/** Menor valor possível em um item da escala. */
function minValue(code: string, itemId: string) {
  const scale = SCALE_BY_CODE[code];
  return Math.min(...getItemOptions(scale, itemId).map((o) => o.value));
}

/**
 * Monta um conjunto de respostas com a pontuação total desejada,
 * respeitando as opções válidas de cada item.
 */
export function answersWithScore(
  code: string,
  target: number,
  overrides: Record<string, number> = {},
): Record<string, number> {
  const scale = SCALE_BY_CODE[code];
  if (!scale) throw new Error(`Escala desconhecida no teste: ${code}`);

  const answers: Record<string, number> = {};
  for (const item of scale.items) answers[item.id] = minValue(code, item.id);
  for (const [id, v] of Object.entries(overrides)) answers[id] = v;

  const total = () => Object.values(answers).reduce((a, b) => a + b, 0);
  const fixed = new Set(Object.keys(overrides));

  for (const item of scale.items) {
    if (total() >= target) break;
    if (fixed.has(item.id)) continue;
    const falta = target - total();
    const max = maxValue(code, item.id);
    const base = minValue(code, item.id);
    answers[item.id] = Math.min(max, base + falta);
  }

  if (total() !== target) {
    throw new Error(
      `Não foi possível montar ${code} com pontuação ${target} (obtido ${total()})`,
    );
  }
  return answers;
}

/** Resultado pontuado de uma escala, com pontuação-alvo e itens forçados. */
export function resultWithScore(
  code: string,
  target: number,
  overrides: Record<string, number> = {},
): ScaleResult {
  return scoreScale(code, answersWithScore(code, target, overrides));
}
