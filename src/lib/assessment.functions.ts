import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const AnswerRecord = z.record(z.string(), z.number().int().min(0).max(4));

const ScaleResultInput = z.object({
  scale_code: z.string().min(1).max(20),
  scale_name: z.string().min(1).max(160),
  score: z.number().int().min(0),
  band: z.string().min(1).max(80),
  band_level: z.number().int().min(0).max(5),
  answers: AnswerRecord,
  risk: z.boolean(),
  informant: z.enum(["paciente", "familiar"]).optional(),
  score_adjusted: z.number().int().min(0).optional(),
  informant_note: z.string().max(600).nullable().optional(),
});

const SubmitSchema = z.object({
  clinic_slug: z.string().trim().min(1).max(80),
  respondent_name: z.string().trim().min(2).max(120),
  respondent_email: z.string().trim().email().max(200),
  respondent_phone: z.string().trim().max(40).optional().nullable(),
  respondent_age: z.number().int().min(0).max(120).optional().nullable(),
  birth_date: z.string().trim().max(20).optional().nullable(),
  respondent_sex: z.string().max(40).optional().nullable(),
  respondent_type: z.enum(["paciente", "familiar"]).default("paciente"),
  informant_name: z.string().trim().max(120).optional().nullable(),
  informant_relation: z.string().trim().max(80).optional().nullable(),
  main_complaint: z.string().trim().max(2000).optional().nullable(),
  consent_lgpd: z.literal(true),
  consent_at: z.string().trim().max(40).optional().nullable(),
  invitation_token: z.string().trim().max(120).optional().nullable(),
  doctor_id: z.string().uuid().optional().nullable(),
  symptom_path: z.array(z.string().max(40)).max(30).default([]),
  results: z.array(ScaleResultInput).min(0).max(20),
  summary: z.object({
    highlights: z.array(z.any()),
    symptoms: z.array(z.string()).default([]),
    indicated_scales: z.array(z.any()).default([]),
    routing_decisions: z.array(z.any()).default([]),
    age_band: z.string().max(80).nullable().default(null),
    informant: z.enum(["paciente", "familiar"]).default("paciente"),
    informant_notes: z.array(z.any()).default([]),
    risk_pathway: z.boolean().default(false),
    risk_flags: z.array(z.string()),
  }),

});

export const submitAssessment = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => SubmitSchema.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Resolver clínica pelo slug
    const { data: clinic, error: cErr } = await supabaseAdmin
      .from("clinics")
      .select("id")
      .eq("slug", data.clinic_slug)
      .eq("is_active", true)
      .maybeSingle();
    if (cErr || !clinic) {
      console.error("submitAssessment clinic lookup error", cErr);
      throw new Error("Clínica inválida.");
    }
    const clinicId = clinic.id;

    // Resolver convite se houver token (deve pertencer à mesma clínica)
    let invitationId: string | null = null;
    let contactId: string | null = null;
    if (data.invitation_token) {
      const { data: inv } = await supabaseAdmin
        .from("invitations")
        .select("id, contact_id, status, expires_at, clinic_id")
        .eq("token", data.invitation_token)
        .maybeSingle();
      if (
        inv &&
        inv.clinic_id === clinicId &&
        inv.status !== "used" &&
        (!inv.expires_at || new Date(inv.expires_at) > new Date())
      ) {
        invitationId = inv.id;
        contactId = inv.contact_id;
      }
    }

    // Validar o médico escolhido: precisa ser um perfil listado da mesma clínica
    let doctorId: string | null = null;
    let doctorName: string | null = null;
    if (data.doctor_id) {
      const { data: doc } = await supabaseAdmin
        .from("doctor_profiles")
        .select("id, display_name")
        .eq("id", data.doctor_id)
        .eq("clinic_id", clinicId)
        .eq("is_listed", true)
        .maybeSingle();
      doctorId = (doc?.id as string | undefined) ?? null;
      doctorName = (doc?.display_name as string | undefined) ?? null;
    }

    const { data: assessment, error: aErr } = await supabaseAdmin
      .from("assessments")
      .insert({
        clinic_id: clinicId,
        respondent_name: data.respondent_name,
        respondent_email: data.respondent_email,
        respondent_phone: data.respondent_phone,
        respondent_age: data.respondent_age,
        birth_date: data.birth_date || null,
        respondent_sex: data.respondent_sex,
        respondent_type: data.respondent_type,
        informant_name: data.respondent_type === "familiar" ? data.informant_name : null,
        informant_relation:
          data.respondent_type === "familiar" ? data.informant_relation : null,
        main_complaint: data.main_complaint,
        consent_lgpd: data.consent_lgpd,
        consent_at: data.consent_at ?? new Date().toISOString(),
        symptom_path: data.symptom_path,
        invitation_id: invitationId,
        contact_id: contactId,
        doctor_id: doctorId,
        risk_flags: data.summary.risk_flags,
        summary: data.summary,
        status: "submitted",
      })
      .select("id")
      .single();

    if (aErr || !assessment) {
      console.error("submitAssessment insert error", aErr);
      throw new Error("Não foi possível salvar sua triagem. Tente novamente.");
    }

    if (data.results.length > 0) {
      const rows = data.results.map((r) => ({
        assessment_id: assessment.id,
        scale_code: r.scale_code,
        scale_name: r.scale_name,
        score: r.score,
        band: r.band,
        band_level: r.band_level,
        answers: r.answers,
        risk: r.risk,
        notes: r.informant_note ?? null,
      }));

      const { error: rErr } = await supabaseAdmin.from("scale_results").insert(rows);
      if (rErr) {
        console.error("scale_results insert error", rErr);
        throw new Error("Erro ao salvar respostas.");
      }
    }

    if (invitationId) {
      await supabaseAdmin
        .from("invitations")
        .update({ status: "used", used_at: new Date().toISOString() })
        .eq("id", invitationId);
    }

    const { recordAudit } = await import("@/lib/audit.server");
    await recordAudit({
      action: "assessment_submitted",
      clinicId: (clinicId as string) ?? null,
      entityType: "assessment",
      entityId: assessment.id as string,
      details: {
        respondent_name: data.respondent_name,
        risk: (data.summary.risk_flags ?? []).length > 0,
        origem: invitationId ? "convite" : "link publico",
        medico_escolhido: doctorName,
        preenchido_por:
          data.respondent_type === "familiar"
            ? `familiar/responsável${
                data.informant_name ? ` — ${data.informant_name}` : ""
              }${data.informant_relation ? ` (${data.informant_relation})` : ""}`
            : "o próprio paciente",
      },

    });

    return { ok: true, assessment_id: assessment.id };
  });
