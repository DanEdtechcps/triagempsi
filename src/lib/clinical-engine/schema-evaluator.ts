/**
 * Avaliador de Schemas Declarativos do Motor Clínico (TriagemPsi Clinical Engine).
 * Executa regras puras e determinísticas de elegibilidade e pontuação psicométrica
 * a partir de contratos JSON Schema sem dependência de UI ou estado externo.
 */

import type {
  ScaleSchema,
  EvaluationContext,
  SchemaScoreResult,
  ScoringBand,
} from "./schema-types";
import { isMaleSex } from "./triage-tree";

/**
 * Avalia se uma escala atende aos critérios de elegibilidade do paciente.
 * 
 * Regras:
 * 1. Sexo: Se o sexo for masculino e a escala possuir 'masculino' em 'sex_exclude', retorna false.
 * 2. Idade: Se a idade do paciente estiver fora de [min_age, max_age], retorna false.
 * 3. Sintomas: Se a escala exigir sintomas ('required_symptoms') e nenhum deles estiver presente, retorna false.
 */
export function evaluateScaleEligibility(
  schema: ScaleSchema,
  context: EvaluationContext,
): boolean {
  const { sex, age, symptoms = [] } = context;
  const elig = schema.eligibility;

  if (!elig) return true;

  // 1. Verificação de exclusão por sexo (ex: EPDS perinatal)
  if (elig.sex_exclude && elig.sex_exclude.length > 0) {
    const isMale = isMaleSex(sex);
    const excludesMale = elig.sex_exclude.some((e) => {
      const el = e.toLowerCase();
      return el === "masculino" || el === "homem" || el === "male" || el === "m";
    });

    if (isMale && excludesMale) {
      return false;
    }

    if (sex) {
      const normalizedSex = sex.trim().toLowerCase();
      if (elig.sex_exclude.some((e) => e.toLowerCase() === normalizedSex)) {
        return false;
      }
    }
  }

  // 1b. Verificação de inclusão exclusiva por sexo
  if (elig.sex_include && elig.sex_include.length > 0) {
    if (!sex) return false;
    const isMale = isMaleSex(sex);
    const includesMale = elig.sex_include.some((e) => {
      const el = e.toLowerCase();
      return el === "masculino" || el === "homem" || el === "male" || el === "m";
    });

    if (isMale && !includesMale) return false;
    if (!isMale && includesMale && elig.sex_include.length === 1) return false;
  }

  // 2. Verificação de Faixa Etária
  if (age !== null && age !== undefined) {
    if (elig.min_age !== undefined && age < elig.min_age) {
      return false;
    }
    if (elig.max_age !== undefined && age > elig.max_age) {
      return false;
    }
  }

  // 3. Verificação de Sintomas Obrigatórios
  if (elig.required_symptoms && elig.required_symptoms.length > 0) {
    const hasRequiredSymptom = elig.required_symptoms.some((req) =>
      symptoms.includes(req),
    );
    if (!hasRequiredSymptom) {
      return false;
    }
  }

  return true;
}

/**
 * Calcula a pontuação e classificação de gravidade psicométrica baseada no schema.
 */
export function scoreSchemaScale(
  schema: ScaleSchema,
  answers: Record<string, number>,
): SchemaScoreResult {
  let score = 0;
  let maxScore = 0;
  const riskItemsTriggered: string[] = [];
  let highestEndorsedItemNumber = 0;

  schema.items.forEach((item, index) => {
    const itemOptions = item.options ?? schema.options ?? [];
    const maxItemVal = itemOptions.length > 0
      ? Math.max(...itemOptions.map((o) => o.value))
      : 0;
    maxScore += maxItemVal;

    const val = answers[item.id] ?? 0;
    score += val;
    if (val > 0) highestEndorsedItemNumber = index + 1;

    // Checagem de itens de risco
    const isRiskItem =
      item.is_risk ||
      schema.riskItems?.includes(item.id) ||
      false;

    if (isRiskItem && val > 0) {
      riskItemsTriggered.push(item.id);
    }
  });

  // Encontra a faixa (band) correspondente. Instrumentos hierárquicos
  // (scoringMethod: "highest_item_band") usam o item de maior severidade
  // respondido positivamente em vez da soma — ver schema-types.ts.
  const bandKey =
    schema.scoringMethod === "highest_item_band" ? highestEndorsedItemNumber : score;
  let matchedBand: ScoringBand | null = null;
  for (const band of schema.bands) {
    if (bandKey >= band.min && bandKey <= band.max) {
      matchedBand = band;
      break;
    }
  }

  const isPositive = schema.positiveCutoff !== undefined
    ? score >= schema.positiveCutoff
    : (matchedBand?.level ?? 0) >= 2;

  const isRisk =
    riskItemsTriggered.length > 0 ||
    (matchedBand?.is_risk ?? false);

  return {
    scale_code: schema.code,
    score,
    maxScore,
    band: matchedBand,
    isPositive,
    isRisk,
    riskItemsTriggered,
  };
}
