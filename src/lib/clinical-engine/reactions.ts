/**
 * Catálogo Canônico de Reações Cruzadas (x-reactions) do TriagemPsi.
 * Define gatilhos acíclicos de escalonamento, rastreio aprofundado e protocolos de segurança.
 */

import type { ScaleReaction } from "./reactive-dag";

export const CANONICAL_REACTIONS: ScaleReaction[] = [
  // 1. Escalonamento Ultrarrápido de Humor: PHQ-2 -> PHQ-9
  {
    id: "reaction-phq2-to-phq9",
    source: "PHQ-2",
    condition: (r) => r.score >= 3,
    action: "INJECT_SCALE",
    target: "PHQ-9",
    priority: 10,
    description: "PHQ-2 positivo (≥ 3) — aprofundar gravidade de humor com PHQ-9",
  },

  // 2. Protocolo de Crise e Segurança: PHQ-9 -> C-SSRS / Plano de Segurança
  {
    id: "reaction-phq9-to-safety",
    source: "PHQ-9",
    condition: (r) => r.riskItemsTriggered.includes("9") || r.score >= 20,
    action: "TRIGGER_SAFETY_PLAN",
    target: "C-SSRS",
    priority: 100, // Máxima prioridade
    description: "Item 9 positivo ou depressão grave no PHQ-9 — acionar protocolo de segurança e C-SSRS",
  },

  // 3. Protocolo Perinatal: EPDS -> C-SSRS / Crise
  {
    id: "reaction-epds-to-safety",
    source: "EPDS",
    condition: (r) => r.riskItemsTriggered.includes("10") || r.score >= 13,
    action: "TRIGGER_SAFETY_PLAN",
    target: "C-SSRS",
    priority: 90,
    description: "Item 10 de autoagressão ou escore severo no EPDS — acionar protocolo de segurança",
  },

  // 4. Escalonamento Ultrarrápido de Ansiedade: GAD-2 -> GAD-7
  {
    id: "reaction-gad2-to-gad7",
    source: "GAD-2",
    condition: (r) => r.score >= 3,
    action: "INJECT_SCALE",
    target: "GAD-7",
    priority: 10,
    description: "GAD-2 positivo (≥ 3) — aprofundar ansiedade com GAD-7",
  },

  // 5. Escalonamento de Álcool: AUDIT-C -> AUDIT
  {
    id: "reaction-auditc-to-audit",
    source: "AUDIT-C",
    condition: (r) => r.score >= 3,
    action: "INJECT_SCALE",
    target: "AUDIT",
    priority: 10,
    description: "AUDIT-C positivo (≥ 3) — aplicar AUDIT completo (10 questões)",
  },
];
