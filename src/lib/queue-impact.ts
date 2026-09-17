/**
 * Impacto da fila priorizada por risco.
 *
 * A fila do painel ordena por risco em vez de ordem de chegada. Esta métrica
 * transforma essa reordenação em número: quantas posições um caso grave subiu
 * e, com a vazão de atendimento do consultório, quantos dias de espera isso
 * economizou.
 */

export type QueueItem = {
  id: string;
  submitted_at: string;
  risk: boolean;
  level: number; // maior nível de gravidade entre as escalas
};

export type QueueImpact = {
  total: number;
  graves: number;
  /** posições médias que os casos graves subiram na fila */
  posicoesGanhas: number;
  /** dias médios de espera evitados por caso grave */
  diasEconomizados: number;
  /** soma de dias evitados no período */
  diasTotaisEconomizados: number;
  slotsPorDia: number;
};

export const DEFAULT_SLOTS_POR_DIA = 6;

/**
 * Compara a posição de cada caso grave na ordem de chegada (FIFO) com a
 * posição na fila priorizada por risco.
 */
export function computeQueueImpact(
  items: QueueItem[],
  slotsPorDia = DEFAULT_SLOTS_POR_DIA,
): QueueImpact {
  const chegada = [...items].sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));
  const priorizada = [...chegada].sort((a, b) => {
    const ra = a.risk ? 1 : 0;
    const rb = b.risk ? 1 : 0;
    if (ra !== rb) return rb - ra;
    if (a.level !== b.level) return b.level - a.level;
    return a.submitted_at.localeCompare(b.submitted_at);
  });

  const posFifo = new Map(chegada.map((i, idx) => [i.id, idx]));
  const posRisco = new Map(priorizada.map((i, idx) => [i.id, idx]));

  const graves = chegada.filter((i) => i.risk || i.level >= 3);
  let ganhoTotal = 0;
  for (const g of graves) {
    const ganho = (posFifo.get(g.id) ?? 0) - (posRisco.get(g.id) ?? 0);
    if (ganho > 0) ganhoTotal += ganho;
  }

  const slots = Math.max(1, slotsPorDia);
  const posicoesGanhas = graves.length ? ganhoTotal / graves.length : 0;

  return {
    total: chegada.length,
    graves: graves.length,
    posicoesGanhas: Number(posicoesGanhas.toFixed(1)),
    diasEconomizados: Number((posicoesGanhas / slots).toFixed(1)),
    diasTotaisEconomizados: Number((ganhoTotal / slots).toFixed(1)),
    slotsPorDia: slots,
  };
}

export function impactSentence(i: QueueImpact): string {
  if (i.graves === 0) return "Nenhum caso grave na janela analisada.";
  return (
    `${i.graves} caso(s) prioritário(s) subiram em média ${i.posicoesGanhas} posições na fila — ` +
    `cerca de ${i.diasEconomizados} dia(s) de espera a menos por paciente ` +
    `(${i.diasTotaisEconomizados} dias no total), considerando ${i.slotsPorDia} atendimentos por dia.`
  );
}
