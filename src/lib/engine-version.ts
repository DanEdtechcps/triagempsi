/**
 * Versão e "impressão digital" do motor de regras/escalas que classificou uma triagem.
 * Gravada em cada avaliação para rastrear, em pesquisa e auditoria, QUAL conjunto de
 * regras produziu o resultado. A impressão digital muda quando muda qualquer regra de
 * roteamento/escalonamento, código, itens ou ponto de corte das escalas deste build.
 */
import { ALL_SCALES } from "@/lib/scales-data";
import { ESCALATION_RULES, ROUTING_RULES } from "@/lib/clinical-engine/triage-tree";
import { sha256Hex } from "@/lib/consent";

/** Versão humana do motor — aumentar a cada mudança clínica deliberada. */
export const ENGINE_VERSION = "2026.10.06";

export async function engineFingerprint(): Promise<string> {
  const routing = JSON.stringify(ROUTING_RULES);
  const escalation = ESCALATION_RULES.map(
    (r) => `${r.from}|${r.add.join(",")}|${r.reason}|${r.riskPathway ? 1 : 0}|${String(r.when)}`,
  ).join("\n");
  const scales = ALL_SCALES.map(
    (s) =>
      `${s.code}|${s.status ?? "ativa"}|${s.items.length}|${s.positiveCutoff ?? ""}|${s.bands
        .map((b) => `${b.min}-${b.max}`)
        .join(",")}`,
  ).join("\n");
  return (await sha256Hex(`${routing}\n${escalation}\n${scales}`)).slice(0, 12);
}

export async function engineVersionLabel(): Promise<string> {
  return `${ENGINE_VERSION}+${await engineFingerprint()}`;
}
