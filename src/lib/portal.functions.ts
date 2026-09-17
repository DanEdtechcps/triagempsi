import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PortalScaleResult = {
  scale_name: string;
  band: string | null;
  band_level: number | null;
};

export type PortalAssessment = {
  id: string;
  clinic_name: string;
  submitted_at: string;
  respondent_name: string;
  respondent_type: "paciente" | "familiar";
  informant_name: string | null;
  informant_relation: string | null;
  results: PortalScaleResult[];
};

/**
 * Lista as pré-avaliações do paciente logado, vinculadas pelo e-mail
 * confirmado da conta. Retorna apenas a visão filtrada (nome da escala e
 * faixa) — nunca escores brutos, respostas, trilha de decisão ou risco.
 *
 * Não depende de papel de equipe nem de cliente privilegiado: a consulta
 * roda com a identidade do próprio paciente e a RLS faz o vínculo pelo
 * e-mail verificado da sessão (políticas assessments_patient_read e
 * scale_results_patient_read).
 */
export const getMyPortalAssessments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PortalAssessment[]> => {
    const { data: userData } = await context.supabase.auth.getUser();
    const user = userData?.user;
    if (!user?.email) return [];
    if (!user.email_confirmed_at) {
      throw new Error(
        "Antes de entrar, confirme seu e-mail pelo link que enviamos na criação da conta.",
      );
    }
    const email = user.email.trim().toLowerCase().replace(/[%_]/g, "");

    // Identidade do próprio paciente: a RLS já restringe às linhas do e-mail
    // da sessão; o filtro explícito é defesa em profundidade e mantém a
    // consulta eficiente.
    const { data: rows, error } = await context.supabase
      .from("assessments")
      .select(
        "id, clinic_id, respondent_name, respondent_type, informant_name, informant_relation, submitted_at, clinics(name)",
      )
      .ilike("respondent_email", email)
      .order("submitted_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("getMyPortalAssessments error", error);
      throw new Error("Não foi possível carregar suas pré-avaliações.");
    }

    type Row = {
      id: string;
      clinic_id: string;
      respondent_name: string;
      respondent_type: string | null;
      informant_name: string | null;
      informant_relation: string | null;
      submitted_at: string;
      clinics: { name: string } | null;
    };
    const list = (rows ?? []) as unknown as Row[];
    if (list.length === 0) return [];

    const ids = list.map((r) => r.id);
    const { data: results } = await context.supabase
      .from("scale_results")
      .select("assessment_id, scale_name, band, band_level")
      .in("assessment_id", ids);

    const byAssessment = new Map<string, PortalScaleResult[]>();
    for (const r of (results ?? []) as {
      assessment_id: string;
      scale_name: string;
      band: string | null;
      band_level: number | null;
    }[]) {
      const arr = byAssessment.get(r.assessment_id) ?? [];
      arr.push({
        scale_name: r.scale_name,
        band: r.band,
        band_level: r.band_level,
      });
      byAssessment.set(r.assessment_id, arr);
    }

    // Registro LGPD: o titular acessou os próprios dados pelo portal.
    const { recordAudit } = await import("@/lib/audit.server");
    const clinicIds = [...new Set(list.map((r) => r.clinic_id))];
    await Promise.all(
      clinicIds.map((cid) =>
        recordAudit({
          action: "portal_patient_view",
          clinicId: cid,
          actorUserId: user.id,
          actorEmail: user.email,
          entityType: "assessment",
          details: { origem: "portal_paciente", triagens_visiveis: list.length },
        }),
      ),
    );

    return list.map((r) => ({
      id: r.id,
      clinic_name: r.clinics?.name ?? "Consultório",
      submitted_at: r.submitted_at,
      respondent_name: r.respondent_name,
      respondent_type:
        (r.respondent_type as "paciente" | "familiar") ?? "paciente",
      informant_name: r.informant_name,
      informant_relation: r.informant_relation,
      results: byAssessment.get(r.id) ?? [],
    }));
  });
