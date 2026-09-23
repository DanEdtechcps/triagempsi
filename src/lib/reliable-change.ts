/**
 * Mudança clinicamente confiável (Reliable Change Index) e diferença mínima
 * importante (MCID) por escala.
 *
 * O escore isolado diz "quanto"; o RCI diz se a diferença entre duas
 * aplicações é maior do que o erro de medida do instrumento — ou seja, se
 * houve melhora/piora de verdade e não apenas ruído.
 *
 *   SEM  = DP * raiz(1 - confiabilidade)
 *   RCI  = 1,96 * SEM * raiz(2)      (95% de confiança)
 *
 * Os valores abaixo vêm da literatura de cada instrumento; quando não há
 * consenso publicado usamos a estimativa conservadora e sinalizamos em
 * `nota`. São parâmetros de configuração — ajustáveis pela equipe clínica
 * sem tocar em componente.
 */

export type ChangeSpec = {
  /** diferença mínima para afirmar mudança confiável (não é ruído) */
  rci: number;
  /** diferença mínima clinicamente importante percebida pelo paciente */
  mcid: number;
  /** direção em que o escore piora (quase sempre "sobe") */
  worseDirection?: "sobe" | "desce";
  nota?: string;
};

export const CHANGE_SPECS: Record<string, ChangeSpec> = {
  "PHQ-9": { rci: 5, mcid: 5, nota: "DP 5,3 e alfa 0,89 (Kroenke, 2001)." },
  "PHQ-2": { rci: 2, mcid: 2, nota: "Escala de rastreio curta — usar como tendência." },
  "GAD-7": { rci: 4, mcid: 4, nota: "DP 4,7 e alfa 0,89 (Spitzer, 2006)." },
  "GAD-2": { rci: 2, mcid: 2, nota: "Escala de rastreio curta — usar como tendência." },
  "PHQ-15": { rci: 4, mcid: 3 },
  "PCL-5": { rci: 10, mcid: 10, nota: "Mudança de 10-20 pontos é o padrão em TEPT." },
  "BDI-II": { rci: 9, mcid: 5 },
  "SRQ-20": { rci: 4, mcid: 3 },
  "GHQ-12": { rci: 4, mcid: 3 },
  "OCI-R": { rci: 8, mcid: 5 },
  "GDS-15": { rci: 3, mcid: 3 },
  ISI: { rci: 6, mcid: 6, nota: "6 pontos = melhora moderada da insônia." },
  EPDS: { rci: 4, mcid: 4 },
  "ASRS-18": { rci: 6, mcid: 6 },
  AUDIT: { rci: 4, mcid: 3 },
  "AUDIT-C": { rci: 2, mcid: 2 },
  PGSI: { rci: 3, mcid: 3 },
  ASSIST: {
    rci: 3,
    mcid: 2,
    nota: "ASSIST-Lite (0-20, soma das 7 substâncias). A leitura clínica principal é por substância; use o total apenas como tendência.",
  },
  FTND: { rci: 2, mcid: 2 },
  MDQ: { rci: 3, mcid: 3, nota: "Instrumento categórico — variação é indicativa." },
  "SNAP-IV": { rci: 6, mcid: 5 },
  "COPSOQ-BR": { rci: 6, mcid: 5, nota: "Risco psicossocial agregado (NR-01)." },
};

export type ChangeVerdict =
  | "melhora_confiavel"
  | "melhora_parcial"
  | "estavel"
  | "piora_parcial"
  | "piora_confiavel"
  | "sem_parametro";

export const VERDICT_LABEL: Record<ChangeVerdict, string> = {
  melhora_confiavel: "Melhora clinicamente confiável",
  melhora_parcial: "Melhora ainda dentro do erro de medida",
  estavel: "Sem mudança relevante",
  piora_parcial: "Piora ainda dentro do erro de medida",
  piora_confiavel: "Piora clinicamente confiável",
  sem_parametro: "Sem parâmetro de mudança para esta escala",
};

export type ChangeAnalysis = {
  code: string;
  baseline: number;
  latest: number;
  delta: number;
  verdict: ChangeVerdict;
  label: string;
  spec: ChangeSpec | null;
  /** frase pronta para o parecer / PDF */
  narrative: string;
};

export function analyzeChange(code: string, baseline: number, latest: number): ChangeAnalysis {
  const spec = CHANGE_SPECS[code] ?? null;
  const delta = latest - baseline;
  const worseUp = (spec?.worseDirection ?? "sobe") === "sobe";
  // "ganho" positivo = melhora clínica
  const gain = worseUp ? -delta : delta;

  let verdict: ChangeVerdict = "sem_parametro";
  if (spec) {
    if (gain >= spec.rci) verdict = "melhora_confiavel";
    else if (gain >= spec.mcid) verdict = "melhora_parcial";
    else if (gain <= -spec.rci) verdict = "piora_confiavel";
    else if (gain <= -spec.mcid) verdict = "piora_parcial";
    else verdict = "estavel";
  }

  const sinal = delta > 0 ? `+${delta}` : `${delta}`;
  const narrative = spec
    ? `${code}: ${baseline} → ${latest} (${sinal} pontos). ${VERDICT_LABEL[verdict]} — ` +
      `mudança confiável a partir de ${spec.rci} pontos.`
    : `${code}: ${baseline} → ${latest} (${sinal} pontos). Sem parâmetro de mudança confiável cadastrado.`;

  return { code, baseline, latest, delta, verdict, label: VERDICT_LABEL[verdict], spec, narrative };
}

export function verdictTone(v: ChangeVerdict): "bom" | "ruim" | "neutro" {
  if (v === "melhora_confiavel" || v === "melhora_parcial") return "bom";
  if (v === "piora_confiavel" || v === "piora_parcial") return "ruim";
  return "neutro";
}
