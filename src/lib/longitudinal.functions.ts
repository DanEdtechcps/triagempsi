import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Acompanhamento longitudinal: agrupa as triagens da mesma pessoa (mesmo
 * consultório + mesmo e-mail) para mostrar a curva de cada escala ao longo do
 * tempo, em vez de tratar a triagem como evento único.
 */

export type SeriePonto = {
  assessment_id: string;
  submitted_at: string;
  scales: {
    code: string;
    name: string;
    score: number | null;
    band: string | null;
    level: number | null;
    risk: boolean;
  }[];
  risk_flags: string[];
};

export type SerieItem = {
  key: string;
  clinic_id: string;
  clinic_name: string | null;
  nome: string;
  email: string;
  aplicacoes: number;
  primeira: string;
  ultima: string;
  pontos: SeriePonto[];
};

type Row = {
  id: string;
  clinic_id: string;
  respondent_name: string;
  respondent_email: string | null;
  submitted_at: string;
  risk_flags: unknown;
  clinics: { name: string } | null;
  scale_results: {
    scale_code: string;
    scale_name: string;
    score: number | null;
    band: string | null;
    band_level: number | null;
    risk: boolean;
  }[];
};

function buildSeries(rows: Row[]): SerieItem[] {
  const map = new Map<string, SerieItem>();

  for (const a of rows) {
    const email = (a.respondent_email ?? "").trim().toLowerCase();
    if (!email) continue;
    const key = `${a.clinic_id}:${email}`;
    const ponto: SeriePonto = {
      assessment_id: a.id,
      submitted_at: a.submitted_at,
      risk_flags: Array.isArray(a.risk_flags) ? (a.risk_flags as string[]) : [],
      scales: (a.scale_results ?? []).map((s) => ({
        code: s.scale_code,
        name: s.scale_name,
        score: s.score,
        band: s.band,
        level: s.band_level,
        risk: s.risk,
      })),
    };

    const existing = map.get(key);
    if (existing) {
      existing.pontos.push(ponto);
      existing.aplicacoes += 1;
      if (a.submitted_at < existing.primeira) existing.primeira = a.submitted_at;
      if (a.submitted_at > existing.ultima) {
        existing.ultima = a.submitted_at;
        existing.nome = a.respondent_name;
      }
    } else {
      map.set(key, {
        key,
        clinic_id: a.clinic_id,
        clinic_name: a.clinics?.name ?? null,
        nome: a.respondent_name,
        email,
        aplicacoes: 1,
        primeira: a.submitted_at,
        ultima: a.submitted_at,
        pontos: [ponto],
      });
    }
  }

  const series = [...map.values()];
  for (const s of series) s.pontos.sort((x, y) => x.submitted_at.localeCompare(y.submitted_at));
  series.sort((a, b) => {
    if (a.aplicacoes !== b.aplicacoes) return b.aplicacoes - a.aplicacoes;
    return b.ultima.localeCompare(a.ultima);
  });
  return series;
}

const SELECT =
  "id, clinic_id, respondent_name, respondent_email, submitted_at, risk_flags, clinics(name), scale_results(scale_code, scale_name, score, band, band_level, risk)";

/** Todas as pessoas com pelo menos duas aplicações (curva possível). */
export const listSeries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SerieItem[]> => {
    const { data, error } = await context.supabase
      .from("assessments")
      .select(SELECT)
      .order("submitted_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("listSeries error", error);
      throw new Error("Não foi possível carregar o acompanhamento longitudinal.");
    }
    return buildSeries((data ?? []) as unknown as Row[]);
  });

/** Série de uma pessoa específica, a partir de uma triagem existente. */
export const getSerieForAssessment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }): Promise<SerieItem | null> => {
    const { data: base } = await context.supabase
      .from("assessments")
      .select("clinic_id, respondent_email")
      .eq("id", data.id)
      .maybeSingle();

    // Remove curingas de ILIKE (% e _) antes de usar o e-mail como padrão de
    // busca — sem isso, "_" (válido na parte local de um e-mail) casa com
    // "qualquer caractere" e mistura o histórico longitudinal de pacientes
    // diferentes da mesma clínica. Mesmo padrão de portal.functions.ts.
    const email = (base?.respondent_email ?? "").trim().toLowerCase().replace(/[%_]/g, "");
    if (!base || !email) return null;

    const { data: rows, error } = await context.supabase
      .from("assessments")
      .select(SELECT)
      .eq("clinic_id", base.clinic_id)
      .ilike("respondent_email", email)
      .order("submitted_at", { ascending: true })
      .limit(60);

    if (error) {
      console.error("getSerieForAssessment error", error);
      return null;
    }
    return buildSeries((rows ?? []) as unknown as Row[])[0] ?? null;
  });
