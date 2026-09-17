/**
 * Exportação FHIR R4 (Bundle de QuestionnaireResponse + Observation).
 *
 * Padrão de interoperabilidade usado por prontuários eletrônicos e pelos
 * guias Argonaut Questionnaire / SMART Markers. Como já guardamos as
 * respostas item a item em `scale_results.answers`, a conversão é direta e
 * permite entregar a triagem inteira para o sistema do consultório.
 */

import { SCALE_BY_CODE, getItemOptions } from "./scales-data";

export type FhirScaleRow = {
  scale_code: string;
  scale_name: string;
  score: number | null;
  band: string | null;
  band_level: number | null;
  risk: boolean;
  answers: Record<string, number> | null;
  created_at?: string | null;
};

export type FhirAssessment = {
  id: string;
  clinic_id: string;
  respondent_name: string;
  respondent_email?: string | null;
  respondent_phone?: string | null;
  respondent_age?: number | null;
  respondent_sex?: string | null;
  birth_date?: string | null;
  submitted_at: string;
  respondent_type?: string | null;
  informant_name?: string | null;
  informant_relation?: string | null;
  main_complaint?: string | null;
  risk_flags?: string[] | null;
};

type Json = Record<string, unknown>;

const SYSTEM = "https://triagemmedica.lovable.app/fhir/CodeSystem/escalas";

function answerText(code: string, itemId: string, value: number): string | null {
  const scale = SCALE_BY_CODE[code];
  if (!scale) return null;
  const item = scale.items.find((i) => i.id === itemId);
  const opts = item ? getItemOptions(scale, itemId) : scale?.options;
  return opts?.find((o) => o.value === value)?.label ?? null;
}

function itemText(code: string, itemId: string): string {
  const scale = SCALE_BY_CODE[code];
  return scale?.items.find((i) => i.id === itemId)?.text ?? `Item ${itemId}`;
}

export function buildFhirBundle(
  assessment: FhirAssessment,
  scales: FhirScaleRow[],
): Json {
  const patientId = `patient-${assessment.id}`;
  const patientRef = { reference: `urn:uuid:${patientId}` };

  const entries: Json[] = [
    {
      fullUrl: `urn:uuid:${patientId}`,
      resource: {
        resourceType: "Patient",
        id: patientId,
        name: [{ text: assessment.respondent_name }],
        telecom: [
          ...(assessment.respondent_email
            ? [{ system: "email", value: assessment.respondent_email }]
            : []),
          ...(assessment.respondent_phone
            ? [{ system: "phone", value: assessment.respondent_phone }]
            : []),
        ],
        ...(assessment.birth_date ? { birthDate: assessment.birth_date } : {}),
      },
    },
  ];

  for (const row of scales) {
    const answers = row.answers ?? {};
    const qrId = `qr-${assessment.id}-${row.scale_code.toLowerCase()}`;
    entries.push({
      fullUrl: `urn:uuid:${qrId}`,
      resource: {
        resourceType: "QuestionnaireResponse",
        id: qrId,
        status: "completed",
        subject: patientRef,
        authored: row.created_at ?? assessment.submitted_at,
        questionnaire: `${SYSTEM}|${row.scale_code}`,
        item: Object.entries(answers).map(([itemId, value]) => ({
          linkId: `${row.scale_code}.${itemId}`,
          text: itemText(row.scale_code, itemId),
          answer: [
            {
              valueCoding: {
                system: `${SYSTEM}/${row.scale_code}`,
                code: String(value),
                display: answerText(row.scale_code, itemId, value) ?? String(value),
              },
            },
          ],
        })),
      },
    });

    const obsId = `obs-${assessment.id}-${row.scale_code.toLowerCase()}`;
    entries.push({
      fullUrl: `urn:uuid:${obsId}`,
      resource: {
        resourceType: "Observation",
        id: obsId,
        status: "final",
        category: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/observation-category",
                code: "survey",
                display: "Survey",
              },
            ],
          },
        ],
        code: {
          coding: [{ system: SYSTEM, code: row.scale_code, display: row.scale_name }],
          text: row.scale_name,
        },
        subject: patientRef,
        effectiveDateTime: row.created_at ?? assessment.submitted_at,
        valueQuantity: { value: row.score ?? 0, unit: "pontos" },
        interpretation: row.band
          ? [{ text: row.band, coding: [{ system: SYSTEM, code: `band-${row.band_level ?? 0}` }] }]
          : undefined,
        derivedFrom: [{ reference: `urn:uuid:${qrId}` }],
      },
    });
  }

  if ((assessment.risk_flags ?? []).length > 0) {
    const raId = `risk-${assessment.id}`;
    entries.push({
      fullUrl: `urn:uuid:${raId}`,
      resource: {
        resourceType: "RiskAssessment",
        id: raId,
        status: "final",
        subject: patientRef,
        occurrenceDateTime: assessment.submitted_at,
        prediction: (assessment.risk_flags ?? []).map((flag) => ({
          outcome: { text: `Sinalização de risco em ${flag}` },
          qualitativeRisk: { text: "alto" },
        })),
      },
    });
  }

  return {
    resourceType: "Bundle",
    type: "collection",
    timestamp: assessment.submitted_at,
    meta: { source: "triagem-psiquiatrica" },
    entry: entries,
  };
}

export function downloadFhirBundle(assessment: FhirAssessment, scales: FhirScaleRow[]) {
  const bundle = buildFhirBundle(assessment, scales);
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/fhir+json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `triagem-${assessment.id.slice(0, 8)}-fhir.json`;
  a.click();
  URL.revokeObjectURL(url);
}
