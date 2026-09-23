/**
 * Motor de Avaliação e Triggers de Psicoeducação - TriagemPsi
 * Avalia as 28 escalas psiquiátricas e determina os temas de orientação clínica recomendados.
 */

import {
  OFFICIAL_PSYCHOEDUCATION_TOPICS,
  PSYCHO_TOPIC_BY_SLUG,
  type PsychoTopicDefinition,
} from "./psychoeducation-data";
import type { ScaleResult } from "./scoring";
import { isSafetyPlanTriggered } from "./safety-plan";

export type PsychoTriggerResult = {
  topic: PsychoTopicDefinition;
  trigger_reason: string;
  is_manual?: boolean;
  priority: number; // menor = maior prioridade (ex: 1 para crise)
};

export type ClinicPsychoOverride = {
  topic_slug: string;
  is_enabled: boolean;
  auto_trigger: boolean;
};

export type PsychoTriggerSpec = {
  topicSlug: string;
  title: string;
  scales: string[];
  criterion: string;
  priority: "urgente" | "rotina";
  description: string;
};

export const PSYCHOEDUCATION_TRIGGER_SPECS: PsychoTriggerSpec[] = [
  {
    topicSlug: "crise-emocional",
    title: "Crise emocional e apoio prioritário",
    scales: ["PHQ-9 (Item 9)", "C-SSRS", "RISK-COMPOSITE"],
    criterion: "PHQ-9 item 9 ≥ 1, C-SSRS positivo ou via de risco clínico",
    priority: "urgente",
    description: "Aciona acolhimento de emergência, canais CVV 188 / SAMU 192 e plano de segurança.",
  },
  {
    topicSlug: "depressao-humor",
    title: "Depressão e humor baixo",
    scales: ["PHQ-9", "PHQ-2"],
    criterion: "PHQ-9 ≥ 10 ou PHQ-2 ≥ 3",
    priority: "rotina",
    description: "Orientações de TCC, ativação comportamental e higiene circadiana.",
  },
  {
    topicSlug: "ansiedade-preocupacao",
    title: "Ansiedade e preocupação excessiva",
    scales: ["GAD-7", "GAD-2"],
    criterion: "GAD-7 ≥ 10 ou GAD-2 ≥ 3",
    priority: "rotina",
    description: "Técnicas de respiração 4-4-6, Grounding 5-4-3-2-1 e regulação cognitiva.",
  },
  {
    topicSlug: "insonia-sono",
    title: "Insônia e higiene do sono",
    scales: ["ISI"],
    criterion: "ISI ≥ 15 (insônia clínica)",
    priority: "rotina",
    description: "Diretrizes de TCC-I, controle de estímulos e regra dos 25 minutos.",
  },
  {
    topicSlug: "tdah-adultos",
    title: "TDAH em adultos (atenção e organização)",
    scales: ["ASRS-18"],
    criterion: "ASRS-18 Parte A positiva ou faixa moderada/grave",
    priority: "rotina",
    description: "Estratégias de funções executivas, micropassos e externalização mental.",
  },
  {
    topicSlug: "oscilacoes-humor",
    title: "Oscilações de humor (espectro bipolar)",
    scales: ["MDQ"],
    criterion: "MDQ positivo (≥ 7 itens concomitantes com prejuízo)",
    priority: "rotina",
    description: "Estabilidade de ritmo biológico e vigilância de sintomas de aceleração.",
  },
  {
    topicSlug: "alcool-substancias",
    title: "Álcool e substâncias",
    scales: ["AUDIT", "DAST-10", "CRAFFT"],
    criterion: "AUDIT ≥ 8, DAST-10 ≥ 3 ou CRAFFT ≥ 2",
    priority: "rotina",
    description: "Redução progressiva de danos sem estigma ou julgamento moral.",
  },
  {
    topicSlug: "trauma-tept",
    title: "Trauma e estresse pós-traumático",
    scales: ["PCL-5"],
    criterion: "PCL-5 ≥ 31 (rastreio provável de TEPT)",
    priority: "rotina",
    description: "Psicoeducação sobre intrusão/hiperativação e caminhos de restabelecimento seguro.",
  },
  {
    topicSlug: "burnout-esgotamento",
    title: "Burnout e esgotamento",
    scales: ["MBI-HSS", "PSS-10"],
    criterion: "MBI-HSS exaustão ≥ 28 ou PSS-10 ≥ 27",
    priority: "rotina",
    description: "Dimensões do esgotamento laboral e desconexão digital protetora.",
  },
  {
    topicSlug: "bem-estar-prevencao",
    title: "Bem-estar e prevenção na vida e no envelhecimento",
    scales: ["WHO-5"],
    criterion: "WHO-5 ≤ 12 (baixo bem-estar) ou disparado universalmente",
    priority: "rotina",
    description: "BDNF, vínculos presenciais, senso de propósito e dignidade no envelhecimento.",
  },
];

// Re-exports de Plano de Segurança e Apoio à Decisão Clínica
export * from "./safety-plan";
export * from "./clinical-decision-support";

/**
 * Avalia os resultados das escalas e retorna os tópicos de psicoeducação indicados.
 * Totalmente puro (sem efeitos colaterais), seguro para execução no browser ou SSR.
 */
export function evaluatePsychoeducationTriggers(
  scaleResults: Array<{
    scale_code: string;
    score?: number | null;
    band?: string | null;
    band_level?: number | null;
    risk?: boolean;
    answers?: Record<string, number>;
  }>,
  options?: {
    riskPathway?: boolean;
    clinicOverrides?: Record<string, { is_enabled: boolean; auto_trigger: boolean }>;
    manualSlugs?: string[];
  },
): PsychoTriggerResult[] {
  const mapResults = new Map(scaleResults.map((r) => [r.scale_code.toUpperCase(), r]));
  const triggered: PsychoTriggerResult[] = [];
  const addedSlugs = new Set<string>();

  const isEnabled = (slug: string): boolean => {
    const override = options?.clinicOverrides?.[slug];
    if (override && !override.is_enabled) return false;
    return true;
  };

  const isAutoEnabled = (slug: string): boolean => {
    const override = options?.clinicOverrides?.[slug];
    if (override && (!override.is_enabled || !override.auto_trigger)) return false;
    return true;
  };

  // Helper para adicionar tema
  const addTopic = (slug: string, reason: string, priority: number, isManual = false) => {
    if (addedSlugs.has(slug)) return;
    const topic = PSYCHO_TOPIC_BY_SLUG.get(slug);
    if (!topic) return;
    if (!isManual && !isAutoEnabled(slug)) return;
    if (isManual && !isEnabled(slug)) return;

    addedSlugs.add(slug);
    triggered.push({
      topic,
      trigger_reason: reason,
      is_manual: isManual,
      priority,
    });
  };

  // 1. Crise emocional e ideação suicida (PRIORIDADE 1)
  // A decisão de disparo usa isSafetyPlanTriggered (safety-plan.ts) — única
  // fonte de verdade pra essa checagem, em vez de reimplementá-la aqui e
  // arriscar as duas divergirem (era exatamente esse o caso: esta função
  // reimplementava a mesma lógica de isSafetyPlanTriggered, que ficava sem
  // nenhum chamador real fora dos próprios testes).
  const phq9 = mapResults.get("PHQ-9");
  const cssrs = mapResults.get("C-SSRS");
  const riskComp = mapResults.get("RISK-COMPOSITE");
  const hasItem9 = phq9?.answers && Number(phq9.answers["9"]) >= 1;
  const hasCssrsRisk = cssrs && (cssrs.risk || (cssrs.score ?? 0) >= 1);
  const hasCompositeRisk = riskComp && (riskComp.risk || (riskComp.score ?? 0) >= 1);

  if (isSafetyPlanTriggered({ scaleResults, riskPathway: options?.riskPathway })) {
    const reasons: string[] = [];
    if (hasItem9) reasons.push("PHQ-9 item 9 positivo");
    if (hasCssrsRisk) reasons.push(`C-SSRS escore ${cssrs?.score ?? "positivo"}`);
    if (hasCompositeRisk) reasons.push("Sinais agregados de risco");
    if (options?.riskPathway && !reasons.length) reasons.push("Via de acolhimento ativada");

    addTopic("crise-emocional", reasons.join(" · "), 1);
  }

  // 2. Depressão e humor baixo
  const phq2 = mapResults.get("PHQ-2");
  if ((phq9 && (phq9.score ?? 0) >= 10) || (phq2 && (phq2.score ?? 0) >= 3)) {
    const rReason = (phq9 && (phq9.score ?? 0) >= 10)
      ? `PHQ-9 escore ${phq9.score} (${phq9.band ?? "moderado a grave"})`
      : `PHQ-2 rastreio inicial ${phq2?.score}`;
    addTopic("depressao-humor", rReason, 2);
  }

  // 3. Ansiedade e preocupação excessiva
  const gad7 = mapResults.get("GAD-7");
  const gad2 = mapResults.get("GAD-2");
  if ((gad7 && (gad7.score ?? 0) >= 10) || (gad2 && (gad2.score ?? 0) >= 3)) {
    const rReason = (gad7 && (gad7.score ?? 0) >= 10)
      ? `GAD-7 escore ${gad7.score} (${gad7.band ?? "moderado a grave"})`
      : `GAD-2 rastreio inicial ${gad2?.score}`;
    addTopic("ansiedade-preocupacao", rReason, 2);
  }

  // 4. Insônia e higiene do sono
  const isi = mapResults.get("ISI");
  if (isi && (isi.score ?? 0) >= 15) {
    addTopic("insonia-sono", `ISI escore ${isi.score} (${isi.band ?? "insônia clínica"})`, 3);
  }

  // 5. TDAH em adultos
  const asrs = mapResults.get("ASRS-18");
  if (asrs && ((asrs.band_level ?? 0) >= 2 || (asrs.band ?? "").toLowerCase().includes("positivo"))) {
    addTopic("tdah-adultos", `ASRS-18 rastreio positivo de sintomas (${asrs.band})`, 4);
  }

  // 6. Oscilações de humor (espectro bipolar)
  const mdq = mapResults.get("MDQ");
  if (mdq && ((mdq.score ?? 0) >= 7 || (mdq.band ?? "").toLowerCase().includes("positivo"))) {
    addTopic("oscilacoes-humor", `MDQ escore ${mdq.score} (sintomas de aceleração e oscilação)`, 4);
  }

  // 7. Álcool e substâncias
  const audit = mapResults.get("AUDIT");
  const dast = mapResults.get("DAST-10");
  const crafft = mapResults.get("CRAFFT");
  if (
    (audit && (audit.score ?? 0) >= 8) ||
    (dast && (dast.score ?? 0) >= 3) ||
    (crafft && (crafft.score ?? 0) >= 2)
  ) {
    const reasons: string[] = [];
    if (audit && (audit.score ?? 0) >= 8) reasons.push(`AUDIT ${audit.score}`);
    if (dast && (dast.score ?? 0) >= 3) reasons.push(`DAST-10 ${dast.score}`);
    if (crafft && (crafft.score ?? 0) >= 2) reasons.push(`CRAFFT ${crafft.score}`);
    addTopic("alcool-substancias", `Rastreio de substâncias (${reasons.join(", ")})`, 4);
  }

  // 8. Trauma e estresse pós-traumático
  const pcl5 = mapResults.get("PCL-5");
  if (pcl5 && (pcl5.score ?? 0) >= 31) {
    addTopic("trauma-tept", `PCL-5 escore ${pcl5.score} (sintomas pós-traumáticos)`, 5);
  }

  // 9. Burnout e esgotamento
  const mbi = mapResults.get("MBI-HSS");
  const pss = mapResults.get("PSS-10");
  if ((mbi && (mbi.score ?? 0) >= 28) || (pss && (pss.score ?? 0) >= 27)) {
    const reason = mbi && (mbi.score ?? 0) >= 28 ? `MBI-HSS escore ${mbi.score}` : `PSS-10 escore ${pss?.score}`;
    addTopic("burnout-esgotamento", `Sobrecarga e estresse elevado (${reason})`, 5);
  }

  // 10. Bem-estar e prevenção + Longevidade
  const who5 = mapResults.get("WHO-5");
  if (who5 && (who5.score ?? 0) <= 12) {
    addTopic("bem-estar-prevencao", `WHO-5 escore ${who5.score} (baixo índice de bem-estar)`, 6);
  } else if (triggered.length === 0) {
    // Se nenhum tema patológico foi acionado, oferece o guia preventivo de saúde mental e hábitos diários
    addTopic("bem-estar-prevencao", "Orientações gerais de prevenção e promoção de saúde mental", 10);
  }

  // Tópicos manuais liberados pelo médico (override)
  if (options?.manualSlugs?.length) {
    for (const slug of options.manualSlugs) {
      addTopic(slug, "Liberado manualmente pelo profissional", 0, true);
    }
  }

  // Ordena por prioridade clínica (menor prioridade numérica primeiro)
  return triggered.sort((a, b) => a.priority - b.priority);
}
