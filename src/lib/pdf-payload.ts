import type { PdfReportData } from "@/lib/pdf-report";

type ScaleRow = {
  scale_code: string;
  scale_name: string;
  score: number | null;
  band: string | null;
  band_level: number | null;
  risk: boolean;
  answers: Record<string, number>;
};

/** Monta o payload do relatório a partir de uma triagem carregada do banco. */
export function buildPdfPayload(
  a: Record<string, unknown> & { scale_results?: ScaleRow[] },
): PdfReportData {
  const summary = (a.summary ?? {}) as {
    symptoms?: string[];
    risk_pathway?: boolean;
    indicated_scales?: { code: string; name: string; reason: string }[];
    routing_decisions?: { step: string; reason: string }[];
    age_band?: string | null;
  };
  const riskFlags = (a.risk_flags as string[]) ?? [];
  return {
    respondent_name: String(a.respondent_name ?? "Paciente"),
    respondent_age: (a.respondent_age as number | null) ?? null,
    birth_date: (a.birth_date as string | null) ?? null,
    respondent_sex: (a.respondent_sex as string | null) ?? null,
    respondent_type:
      (a.respondent_type as "paciente" | "familiar" | null) ?? "paciente",
    informant_name: (a.informant_name as string | null) ?? null,
    informant_relation: (a.informant_relation as string | null) ?? null,
    respondent_email: (a.respondent_email as string | null) ?? null,
    respondent_phone: (a.respondent_phone as string | null) ?? null,
    main_complaint: (a.main_complaint as string | null) ?? null,
    submitted_at: (a.submitted_at as string | null) ?? null,
    symptoms: summary.symptoms ?? [],
    scales: (a.scale_results ?? []).map((s) => ({
      scale_code: s.scale_code,
      scale_name: s.scale_name,
      score: s.score,
      band: s.band,
      band_level: s.band_level,
      risk: s.risk,
      answers: s.answers,
    })),
    riskPathway: Boolean(summary.risk_pathway),
    riskFlags,
    decisions: summary.routing_decisions ?? [],
    indicated: summary.indicated_scales ?? [],
    ageBand: summary.age_band ?? null,
  };

}
