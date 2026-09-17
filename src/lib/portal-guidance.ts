/**
 * Textos amigáveis do Portal do Paciente — visão filtrada (sem escore bruto,
 * sem sinalizações de risco, sem respostas item a item).
 */

/** Orientação por faixa de gravidade (band_level 0–4). */
export function portalGuidance(bandLevel: number | null): string {
  if (bandLevel == null) {
    return "Resultado registrado — será revisado pela equipe antes da consulta.";
  }
  if (bandLevel <= 0) return "Sem sinais relevantes neste rastreio.";
  if (bandLevel === 1) return "Sinais leves — vale comentar na sua consulta.";
  if (bandLevel === 2) {
    return "Sinais moderados — serão aprofundados na sua consulta.";
  }
  return "Sinais que merecem atenção — a equipe já foi informada e vai priorizar isso na consulta.";
}
