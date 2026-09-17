import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AssessmentListItem = {
  id: string;
  respondent_name: string;
  respondent_age: number | null;
  respondent_email?: string | null;
  respondent_type: "paciente" | "familiar";
  informant_name?: string | null;
  informant_relation?: string | null;
  submitted_at: string;
  created_at: string;
  status: string;
  risk_flags: string[];
  summary: {
    highlights?: { domain: string; code: string; score: number; band: string; level: number }[];
    risk_pathway?: boolean;
    symptoms?: string[];
    indicated_scales?: { code: string; name: string; reason: string }[];
  };
  scales: { scale_code: string; score: number | null; band: string | null; band_level: number | null; risk: boolean }[];
  clinic_id: string;
  clinic_name?: string | null;
  doctor_id?: string | null;
  doctor_name?: string | null;
};


export type MyAccess = {
  hasAccess: boolean;
  isAdmin: boolean;
  /** true = acesso global (todas as clínicas) */
  global: boolean;
  clinics: { id: string; name: string; slug: string }[];
  roles: string[];
};

/** Papéis do usuário logado e clínicas que ele pode ver. */
export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyAccess> => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role, clinic_id")
      .eq("user_id", context.userId);

    if (error) {
      console.error("getMyAccess error", error);
      throw new Error("Não foi possível verificar seu acesso.");
    }

    const roles = (data ?? []).map((r) => r.role as string);
    const global = (data ?? []).some((r) => r.clinic_id === null);
    const ids = (data ?? [])
      .map((r) => r.clinic_id as string | null)
      .filter((v): v is string => !!v);

    let clinics: MyAccess["clinics"] = [];
    if (global) {
      const { data: all } = await context.supabase
        .from("clinics")
        .select("id, name, slug")
        .order("name");
      clinics = (all ?? []) as MyAccess["clinics"];
    } else if (ids.length) {
      const { data: mine } = await context.supabase
        .from("clinics")
        .select("id, name, slug")
        .in("id", ids)
        .order("name");
      clinics = (mine ?? []) as MyAccess["clinics"];
    }

    return {
      hasAccess: (data ?? []).length > 0,
      isAdmin: roles.includes("admin"),
      global,
      clinics,
      roles,
    };
  });

export const listAssessments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("assessments")
      .select(
        "id, clinic_id, respondent_name, respondent_age, respondent_email, respondent_type, informant_name, informant_relation, status, submitted_at, created_at, risk_flags, summary, doctor_id, clinics(name), doctor_profiles(display_name), scale_results(scale_code, score, band, band_level, risk)",
      )

      .order("submitted_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("listAssessments error", error);
      throw new Error("Não foi possível carregar as triagens.");
    }

    const rows = (data ?? []).map((a) => ({
      id: a.id as string,
      clinic_id: a.clinic_id as string,
      clinic_name:
        ((a as unknown as { clinics: { name: string } | null }).clinics?.name ??
          null) as string | null,
      doctor_id: ((a as { doctor_id?: string | null }).doctor_id ?? null),
      doctor_name:
        ((a as unknown as { doctor_profiles: { display_name: string } | null })
          .doctor_profiles?.display_name ?? null),
      respondent_name: a.respondent_name as string,
      respondent_age: (a.respondent_age as number | null) ?? null,
      respondent_email: (a.respondent_email as string | null) ?? null,
      respondent_type: (((a as { respondent_type?: string }).respondent_type ??
        "paciente") as "paciente" | "familiar"),
      informant_name: ((a as { informant_name?: string | null }).informant_name ?? null),
      informant_relation:
        ((a as { informant_relation?: string | null }).informant_relation ?? null),
      status: (a.status as string) ?? "completed",
      submitted_at: a.submitted_at as string,
      created_at: ((a as { created_at?: string }).created_at ??
        a.submitted_at) as string,

      risk_flags: (a.risk_flags as string[]) ?? [],
      summary: (a.summary ?? {}) as AssessmentListItem["summary"],
      scales: ((a as unknown as { scale_results: AssessmentListItem["scales"] })
        .scale_results ?? []) as AssessmentListItem["scales"],
    })) satisfies AssessmentListItem[];

    // Risco sempre no topo
    rows.sort((x, y) => {
      const rx = hasRisk(x) ? 1 : 0;
      const ry = hasRisk(y) ? 1 : 0;
      if (rx !== ry) return ry - rx;
      return y.submitted_at.localeCompare(x.submitted_at);
    });

    return rows;
  });

function hasRisk(a: AssessmentListItem) {
  return a.risk_flags.length > 0 || a.summary?.risk_pathway === true;
}

export const getAssessment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: a, error } = await context.supabase
      .from("assessments")
      .select("*, scale_results(*), doctor_profiles(display_name, specialty)")
      .eq("id", data.id)
      .maybeSingle();

    if (error) {
      console.error("getAssessment error", error);
      throw new Error("Não foi possível carregar a triagem.");
    }

    if (!a) {
      // RLS filtrou: a triagem existe fora do escopo do usuário (ou foi removida).
      const { accessDeniedError } = await import("@/lib/access-error");
      throw accessDeniedError(
        "Esta triagem não está disponível para o seu perfil — ela pertence a um consultório fora do seu acesso ou foi removida.",
      );
    }

    if (a) {
      const { recordAudit } = await import("@/lib/audit.server");
      await recordAudit({
        action: "assessment_viewed",
        clinicId: (a as { clinic_id?: string }).clinic_id ?? null,
        actorUserId: context.userId,
        actorEmail: (context.claims as { email?: string })?.email ?? null,
        entityType: "assessment",
        entityId: data.id,
        details: {
          respondent_name: (a as { respondent_name?: string }).respondent_name ?? null,
          preenchido_por:
            (a as { respondent_type?: string }).respondent_type === "familiar"
              ? `familiar/responsável${
                  (a as { informant_name?: string }).informant_name
                    ? ` — ${(a as { informant_name?: string }).informant_name}`
                    : ""
                }${
                  (a as { informant_relation?: string }).informant_relation
                    ? ` (${(a as { informant_relation?: string }).informant_relation})`
                    : ""
                }`
              : "o próprio paciente",
        },

      });
    }
    return a;
  });
