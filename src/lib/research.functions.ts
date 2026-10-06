import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  canRecordOutcome,
  canWithdrawResearchConsent,
  isGlobalAdmin,
  normalizeOutcomeInput,
  validateResearchSettings,
  type RoleRow,
} from "@/lib/research";
import { computeAccuracy, type AccuracyReport, type OutcomeRecord } from "@/lib/outcome-metrics";

async function loadRoles(
  supabase: { from: (t: "user_roles") => unknown },
  userId: string,
): Promise<RoleRow[]> {
  const q = supabase.from("user_roles") as {
    select: (c: string) => { eq: (k: string, v: string) => Promise<{ data: RoleRow[] | null; error: unknown }> };
  };
  const { data, error } = await q.select("role, clinic_id").eq("user_id", userId);
  if (error) throw new Error("Não foi possível verificar seu acesso.");
  return (data ?? []) as RoleRow[];
}

/** Coluna jsonb que deveria ser lista de texto → lista de texto segura. */
const asStringList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

const emailOf = (claims: unknown) => (claims as { email?: string } | undefined)?.email ?? null;

/* ------------------------------------------------------------------ */
/* Desfecho clínico                                                    */
/* ------------------------------------------------------------------ */

export type OutcomeDto = {
  concordance: "concorda" | "concorda_parcialmente" | "nao_concorda";
  risk_assessment: "risco_confirmado" | "risco_nao_confirmado" | "nao_avaliado";
  final_dx_icd10: string[];
  updated_at: string;
} | null;

export const getAssessmentOutcome = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ assessment_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }): Promise<OutcomeDto> => {
    // RLS: só enxerga se a triagem for de uma clínica do usuário.
    const { data: row } = await context.supabase
      .from("assessment_outcomes")
      .select("concordance, risk_assessment, final_dx_icd10, updated_at")
      .eq("assessment_id", data.assessment_id)
      .maybeSingle();
    if (!row) return null;
    return {
      concordance: row.concordance as NonNullable<OutcomeDto>["concordance"],
      risk_assessment: row.risk_assessment as NonNullable<OutcomeDto>["risk_assessment"],
      final_dx_icd10: row.final_dx_icd10 ?? [],
      updated_at: row.updated_at,
    };
  });

export const saveAssessmentOutcome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        assessment_id: z.string().uuid(),
        concordance: z.enum(["concorda", "concorda_parcialmente", "nao_concorda"]),
        risk_assessment: z.enum(["risco_confirmado", "risco_nao_confirmado", "nao_avaliado"]),
        final_dx_icd10: z.array(z.string().max(12)).max(10).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { accessDeniedError } = await import("@/lib/access-error");
    const { data: a } = await context.supabase
      .from("assessments")
      .select("id, clinic_id")
      .eq("id", data.assessment_id)
      .maybeSingle();
    if (!a) throw accessDeniedError("Esta triagem não está disponível para o seu perfil.");

    const roles = await loadRoles(context.supabase as never, context.userId);
    if (!canRecordOutcome(roles, a.clinic_id as string)) {
      throw accessDeniedError("Apenas médicos e administradores da clínica registram o desfecho.");
    }

    const clean = normalizeOutcomeInput(data);
    const { error } = await context.supabase.from("assessment_outcomes").upsert(
      {
        assessment_id: data.assessment_id,
        clinic_id: a.clinic_id as string,
        recorded_by: context.userId,
        concordance: clean.concordance,
        risk_assessment: clean.risk_assessment,
        final_dx_icd10: clean.final_dx_icd10.length ? clean.final_dx_icd10 : null,
      },
      { onConflict: "assessment_id" },
    );
    if (error) {
      console.error("saveAssessmentOutcome", error.message);
      throw new Error("Não foi possível salvar o desfecho.");
    }

    const { recordAudit } = await import("@/lib/audit.server");
    await recordAudit({
      action: "outcome_recorded",
      clinicId: a.clinic_id as string,
      actorUserId: context.userId,
      actorEmail: emailOf(context.claims),
      entityType: "assessment",
      entityId: data.assessment_id,
      details: { concordance: clean.concordance, risk_assessment: clean.risk_assessment },
    });
    return { ok: true as const };
  });

/** Relatório de acurácia da pré-triagem (sens/espec/VPP/VPN) das clínicas que o usuário enxerga. */
export const getAccuracyReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ clinic_id: z.string().uuid().optional() }).parse(raw ?? {}),
  )
  .handler(async ({ data, context }): Promise<AccuracyReport> => {
    let q = context.supabase
      .from("assessment_outcomes")
      .select("assessment_id, concordance, risk_assessment")
      .limit(5000);
    if (data.clinic_id) q = q.eq("clinic_id", data.clinic_id);
    const { data: outs, error } = await q;
    if (error) throw new Error("Não foi possível calcular o relatório.");
    const ids = (outs ?? []).map((o) => o.assessment_id);
    const positive = new Map<string, boolean>();
    for (let i = 0; i < ids.length; i += 200) {
      const { data: as } = await context.supabase
        .from("assessments")
        .select("id, risk_flags, summary")
        .in("id", ids.slice(i, i + 200));
      for (const a of as ?? []) {
        const s = a.summary as { risk_pathway?: unknown } | null;
        positive.set(a.id, Boolean(s?.risk_pathway) || asStringList(a.risk_flags).length > 0);
      }
    }
    const records: OutcomeRecord[] = (outs ?? []).map((o) => ({
      tested_positive: positive.get(o.assessment_id) ?? false,
      risk_assessment: o.risk_assessment as OutcomeRecord["risk_assessment"],
      concordance: o.concordance as OutcomeRecord["concordance"],
    }));
    return computeAccuracy(records);
  });

/* ------------------------------------------------------------------ */
/* Configuração da pesquisa por clínica (admin global)                 */
/* ------------------------------------------------------------------ */

export type ResearchSettings = {
  clinic_id: string;
  research_enabled: boolean;
  research_protocol: string | null;
  research_tcle_text: string | null;
  research_tcle_version: string | null;
  consented_count: number;
  total_count: number;
};

export const listResearchSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<(ResearchSettings & { name: string })[]> => {
    const { accessDeniedError } = await import("@/lib/access-error");
    const roles = await loadRoles(context.supabase as never, context.userId);
    if (!isGlobalAdmin(roles)) throw accessDeniedError("Apenas o administrador global acessa a pesquisa.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: clinics } = await supabaseAdmin
      .from("clinics")
      .select("id, name, research_enabled, research_protocol, research_tcle_text, research_tcle_version")
      .order("name");
    const out: (ResearchSettings & { name: string })[] = [];
    for (const c of clinics ?? []) {
      const [{ count: total }, { count: consented }] = await Promise.all([
        supabaseAdmin.from("assessments").select("id", { count: "exact", head: true }).eq("clinic_id", c.id),
        supabaseAdmin
          .from("assessments")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", c.id)
          .eq("research_consent", true),
      ]);
      out.push({
        clinic_id: c.id,
        name: c.name,
        research_enabled: c.research_enabled,
        research_protocol: c.research_protocol,
        research_tcle_text: c.research_tcle_text,
        research_tcle_version: c.research_tcle_version,
        total_count: total ?? 0,
        consented_count: consented ?? 0,
      });
    }
    return out;
  });

export const saveResearchSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        clinic_id: z.string().uuid(),
        research_enabled: z.boolean(),
        research_protocol: z.string().trim().max(60).nullable().optional(),
        research_tcle_text: z.string().trim().max(20000).nullable().optional(),
        research_tcle_version: z.string().trim().max(40).nullable().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { accessDeniedError } = await import("@/lib/access-error");
    const roles = await loadRoles(context.supabase as never, context.userId);
    if (!isGlobalAdmin(roles)) throw accessDeniedError("Apenas o administrador global configura a pesquisa.");
    const errors = validateResearchSettings(data);
    if (errors.length) throw new Error(errors.join(" "));

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("clinics")
      .update({
        research_enabled: data.research_enabled,
        research_protocol: data.research_protocol?.trim() || null,
        research_tcle_text: data.research_tcle_text?.trim() || null,
        research_tcle_version: data.research_tcle_version?.trim() || null,
      })
      .eq("id", data.clinic_id);
    if (error) {
      console.error("saveResearchSettings", error.message);
      throw new Error("Não foi possível salvar a configuração.");
    }
    const { recordAudit } = await import("@/lib/audit.server");
    await recordAudit({
      action: "research_settings_updated",
      clinicId: data.clinic_id,
      actorUserId: context.userId,
      actorEmail: emailOf(context.claims),
      entityType: "clinic",
      entityId: data.clinic_id,
      details: { research_enabled: data.research_enabled, tcle_version: data.research_tcle_version ?? null },
    });
    return { ok: true as const };
  });

/* ------------------------------------------------------------------ */
/* Retirada de consentimento de pesquisa                               */
/* ------------------------------------------------------------------ */

export const withdrawResearchConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ assessment_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { accessDeniedError } = await import("@/lib/access-error");
    const { data: a } = await context.supabase
      .from("assessments")
      .select("id, clinic_id")
      .eq("id", data.assessment_id)
      .maybeSingle();
    if (!a) throw accessDeniedError("Esta triagem não está disponível para o seu perfil.");
    const roles = await loadRoles(context.supabase as never, context.userId);
    if (!canWithdrawResearchConsent(roles, a.clinic_id as string)) {
      throw accessDeniedError("Apenas administradores da clínica registram a retirada do consentimento.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("assessments")
      .update({
        research_consent: false,
        research_consent_at: null,
        research_consent_version: null,
        research_consent_sha256: null,
      })
      .eq("id", data.assessment_id);
    if (error) throw new Error("Não foi possível registrar a retirada.");
    const { recordAudit } = await import("@/lib/audit.server");
    await recordAudit({
      action: "research_consent_withdrawn",
      clinicId: a.clinic_id as string,
      actorUserId: context.userId,
      actorEmail: emailOf(context.claims),
      entityType: "assessment",
      entityId: data.assessment_id,
      details: {},
    });
    return { ok: true as const };
  });

/* ------------------------------------------------------------------ */
/* Exportação anonimizada (admin global)                               */
/* ------------------------------------------------------------------ */

export type ResearchExport = {
  triagens_csv: string;
  escalas_csv: string;
  dicionario_csv: string;
  manifest: import("@/lib/research-dataset").DatasetManifest;
};

export const exportResearchDataset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        clinic_id: z.string().uuid(),
        k_min: z.number().int().min(3).max(50).default(5),
        confirm: z.literal(true),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }): Promise<ResearchExport> => {
    const { accessDeniedError } = await import("@/lib/access-error");
    const roles = await loadRoles(context.supabase as never, context.userId);
    if (!isGlobalAdmin(roles)) throw accessDeniedError("Apenas o administrador global exporta dados de pesquisa.");

    const salt = process.env["RESEARCH_HASH_SALT"];
    if (!salt || salt.length < 16) {
      throw new Error(
        "Falta o segredo RESEARCH_HASH_SALT (mínimo 16 caracteres) no servidor. Cadastre-o como segredo do Worker antes de exportar.",
      );
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: clinic } = await supabaseAdmin
      .from("clinics")
      .select("id, research_enabled, research_protocol")
      .eq("id", data.clinic_id)
      .maybeSingle();
    if (!clinic?.research_enabled || !clinic.research_protocol) {
      throw new Error("A pesquisa não está habilitada para esta clínica (exige protocolo do CEP e TCLE).");
    }

    // Só campos necessários; nada de nome/e-mail/telefone/queixa/IP entra na consulta.
    const { data: rows, error } = await supabaseAdmin
      .from("assessments")
      .select(
        "id, clinic_id, created_at, respondent_age, respondent_sex, respondent_type, symptom_path, risk_flags, summary, research_consent, research_consent_version, scale_results(scale_code, score, band_level, risk, answers, estimated_items), assessment_outcomes(concordance, risk_assessment, final_dx_icd10)",
      )
      .eq("clinic_id", data.clinic_id)
      .eq("research_consent", true)
      .limit(20000);
    if (error) {
      console.error("exportResearchDataset", error.message);
      throw new Error("Não foi possível montar o conjunto de dados.");
    }

    const { buildResearchDataset, toCsv, ASSESSMENT_COLUMNS, SCALE_COLUMNS, dictionaryCsv } = await import(
      "@/lib/research-dataset"
    );
    const raw = (rows ?? []).map((r) => {
      const oc = (r as unknown as { assessment_outcomes: unknown }).assessment_outcomes;
      const outcome = Array.isArray(oc) ? (oc[0] ?? null) : (oc ?? null);
      return {
        id: r.id,
        clinic_id: r.clinic_id,
        created_at: r.created_at,
        respondent_age: r.respondent_age,
        respondent_sex: r.respondent_sex,
        respondent_type: r.respondent_type,
        symptom_path: asStringList(r.symptom_path),
        risk_flags: asStringList(r.risk_flags),
        summary: (r.summary as Record<string, unknown> | null) ?? null,
        research_consent: r.research_consent,
        research_consent_version: r.research_consent_version,
        scale_results: ((r as unknown as { scale_results: unknown[] }).scale_results ?? []) as never[],
        outcome: outcome as never,
      };
    });

    const ds = await buildResearchDataset(raw, {
      salt: `${salt}:${clinic.research_protocol}`,
      k: data.k_min,
      enabledClinicIds: new Set([data.clinic_id]),
    });

    const { recordAudit } = await import("@/lib/audit.server");
    await recordAudit({
      action: "research_export",
      clinicId: data.clinic_id,
      actorUserId: context.userId,
      actorEmail: emailOf(context.claims),
      entityType: "clinic",
      entityId: data.clinic_id,
      details: {
        included: ds.manifest.included,
        suppressed: ds.manifest.suppressed,
        k_min: ds.manifest.k_min,
        protocol: clinic.research_protocol,
      },
    });

    return {
      triagens_csv: toCsv(ds.assessments, ASSESSMENT_COLUMNS),
      escalas_csv: toCsv(ds.scales, SCALE_COLUMNS),
      dicionario_csv: dictionaryCsv(),
      manifest: ds.manifest,
    };
  });
