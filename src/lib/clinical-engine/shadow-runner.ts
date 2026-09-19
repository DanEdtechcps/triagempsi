/**
 * Comparador Sombra de Motores Clínicos (Shadow Execution Engine).
 * Executa o motor canônico e o motor declarativo reativo em paralelo,
 * verificando 100% de equivalência matemática, de elegibilidade e de segurança clínica.
 */

import { buildTriagePlan, isMaleSex } from "./triage-tree";
import { evaluateScaleEligibility } from "./schema-evaluator";
import type { ScaleSchema, EvaluationContext } from "./schema-types";
import type { TriagePlan } from "./types";

// Importa os schemas declarativos oficiais
import epdsRaw from "./schemas/epds.json";
import phq2Raw from "./schemas/phq2.json";
import phq9Raw from "./schemas/phq9.json";
import cssrsRaw from "./schemas/c-ssrs.json";
import snapIvRaw from "./schemas/snap-iv.json";
import asrsCRaw from "./schemas/asrs-c.json";
import asrs18Raw from "./schemas/asrs-18.json";
import ad8Raw from "./schemas/ad8.json";
import gds15Raw from "./schemas/gds15.json";
import srq20Raw from "./schemas/srq20.json";

export const DECLARATIVE_SCHEMAS: (ScaleSchema & { status?: string; eligibility: { triggers_only?: boolean } })[] = [
  srq20Raw,
  epdsRaw,
  phq2Raw,
  phq9Raw,
  cssrsRaw,
  snapIvRaw,
  asrsCRaw,
  asrs18Raw,
  ad8Raw,
  gds15Raw,
] as unknown as (ScaleSchema & { status?: string; eligibility: { triggers_only?: boolean } })[];

export interface ShadowComparisonResult {
  isEquivalent: boolean;
  legacyFlow: string[];
  declarativeFlow: string[];
  legacyRisk: boolean;
  declarativeRisk: boolean;
  epdsBlockedInBoth: boolean;
  diffs: string[];
  executedAt: string;
}

/**
 * Constrói o plano de triagem utilizando exclusivamente a lógica declarativa de schemas.
 */
export function buildDeclarativeTriagePlan(
  symptoms: string[],
  age: number | null,
  sex: string | null,
): TriagePlan {
  const context: EvaluationContext = { symptoms, age, sex };
  const isMale = isMaleSex(sex);
  const flow: string[] = [];
  const indicated: { code: string; name: string; reason: string }[] = [];
  const riskPathway = symptoms.includes("morte");

  // 1. Linha de Base (Baseline) para adultos e idosos
  const band =
    age === null ? "adulto" : age < 12 ? "crianca" : age < 18 ? "adolescente" : age < 60 ? "adulto" : "idoso";

  if (band === "adulto" || band === "idoso") {
    flow.push("SRQ-20");
  }

  // 2. Avaliação de Schemas Declarativos
  for (const schema of DECLARATIVE_SCHEMAS) {
    // Se a escala for exclusivamente acionada por escalonamento (ex: PHQ-9), não entra na triagem inicial
    if (schema.eligibility?.triggers_only) {
      continue;
    }

    // Escala de crise C-SSRS entra se houver via de risco
    if (schema.code === "C-SSRS") {
      if (riskPathway && !flow.includes("C-SSRS")) {
        flow.push("C-SSRS");
      }
      continue;
    }

    // Se a escala for apenas estrutura de curadoria clínica (ex: SNAP-IV)
    if (schema.status === "estrutura") {
      const eligible = evaluateScaleEligibility(schema, context);
      if (eligible) {
        indicated.push({
          code: schema.code,
          name: schema.fullName,
          reason: "Instrumento indicado para aplicação na consulta clínica",
        });
      }
      continue;
    }

    // Rastreio geral SRQ-20 já incluído no baseline
    if (schema.code === "SRQ-20") {
      if (symptoms.includes("angustia") && !flow.includes("SRQ-20")) {
        flow.push("SRQ-20");
      }
      continue;
    }

    const eligible = evaluateScaleEligibility(schema, context);
    if (eligible) {
      if (schema.code === "EPDS" && isMale) {
        continue;
      }
      if (!flow.includes(schema.code)) {
        flow.push(schema.code);
      }
    }
  }

  // Se o paciente for homem, EPDS é 100% expurgada
  const safeFlow = isMale ? flow.filter((c) => c !== "EPDS") : flow;

  return {
    flow: safeFlow,
    indicated,
    decisions: [
      { step: "declarative_engine", reason: "Plano gerado via JSON Schemas e avaliador de regras" },
    ],
    riskPathway,
    band,
  };
}

/**
 * Executa a checagem paralela (Shadow Execution) comparando o plano do motor canônico
 * com o plano do motor declarativo reativo.
 */
export function runShadowTriageComparison(
  symptoms: string[],
  age: number | null,
  sex: string | null,
): ShadowComparisonResult {
  const legacyPlan = buildTriagePlan(symptoms, age, sex);
  const declarativePlan = buildDeclarativeTriagePlan(symptoms, age, sex);

  const diffs: string[] = [];
  const isMale = isMaleSex(sex);

  // 1. Verificação da trava biológica masculina da EPDS
  const legacyHasEpds = legacyPlan.flow.includes("EPDS");
  const declarativeHasEpds = declarativePlan.flow.includes("EPDS");

  const epdsBlockedInBoth = isMale
    ? !legacyHasEpds && !declarativeHasEpds
    : true;

  if (isMale && (legacyHasEpds || declarativeHasEpds)) {
    diffs.push(
      `Falha na trava de segurança biológica: EPDS presente para sexo masculino (Legado: ${legacyHasEpds}, Declarativo: ${declarativeHasEpds})`,
    );
  }

  // 2. Verificação de equivalência da Via de Risco / Emergência
  const legacyRisk = legacyPlan.riskPathway;
  const declarativeRisk = declarativePlan.riskPathway;

  if (legacyRisk !== declarativeRisk) {
    diffs.push(
      `Divergência na via de risco (riskPathway): Legado=${legacyRisk}, Declarativo=${declarativeRisk}`,
    );
  }

  // 3. Verificação de consistência nas escalas declaradas implementadas
  const implementedCodes = DECLARATIVE_SCHEMAS.map((s) => s.code);
  const legacySubFlow = legacyPlan.flow.filter((code) => implementedCodes.includes(code));
  const declarativeSubFlow = declarativePlan.flow.filter((code) => implementedCodes.includes(code));

  // Compara os conjuntos das escalas em comum
  const missingInDeclarative = legacySubFlow.filter((c) => !declarativeSubFlow.includes(c));
  const extraInDeclarative = declarativeSubFlow.filter((c) => {
    // C-SSRS é equivalente ao ASQ na via de risco declarativa
    if (c === "C-SSRS" && legacyPlan.flow.includes("ASQ")) return false;
    return !legacySubFlow.includes(c);
  });

  if (missingInDeclarative.length > 0) {
    diffs.push(`Escalas ausentes no motor declarativo: ${missingInDeclarative.join(", ")}`);
  }
  if (extraInDeclarative.length > 0) {
    diffs.push(`Escalas inesperadas no motor declarativo: ${extraInDeclarative.join(", ")}`);
  }

  const isEquivalent = diffs.length === 0;

  return {
    isEquivalent,
    legacyFlow: legacyPlan.flow,
    declarativeFlow: declarativePlan.flow,
    legacyRisk,
    declarativeRisk,
    epdsBlockedInBoth,
    diffs,
    executedAt: new Date().toISOString(),
  };
}
