/**
 * Monta o e-mail de resultados básicos a partir dos dados reais da triagem.
 * Server-only: usado tanto pela pré-visualização quanto pelo disparo.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildResultsEmail } from "@/lib/email/results-email";

export type BuiltAssessmentEmail = {
  to: string | null;
  subject: string;
  html: string;
  text: string;
  clinicId: string;
  contactId: string | null;
  respondentName: string;
};

/**
 * Destinatários legítimos de uma triagem: o próprio paciente, o e-mail do
 * consultório e os contatos cadastrados nesse mesmo consultório (a consulta a
 * `contacts` já é filtrada por RLS conforme o acesso do usuário).
 */
async function allowedEmailsForAssessment(
  supabase: SupabaseClient,
  input: {
    clinicId: string;
    contactId: string | null;
    respondentEmail: string | null;
    clinicEmail: string | null;
  },
): Promise<Set<string>> {
  const allowed = new Set<string>();
  const add = (v?: string | null) => {
    if (v) allowed.add(v.trim().toLowerCase());
  };
  add(input.respondentEmail);
  add(input.clinicEmail);

  const { data: contacts } = await supabase
    .from("contacts")
    .select("email")
    .eq("clinic_id", input.clinicId)
    .limit(2000);
  for (const c of (contacts ?? []) as { email: string | null }[]) add(c.email);

  return allowed;
}

export async function buildAssessmentEmail(
  supabase: SupabaseClient,
  assessmentId: string,
  audience: "profissional" | "paciente",
  toOverride?: string,
): Promise<BuiltAssessmentEmail> {
  const { data: a } = await supabase
    .from("assessments")
    .select(
      "id, clinic_id, contact_id, respondent_name, respondent_email, respondent_type, informant_name, informant_relation, main_complaint, submitted_at",
    )
    .eq("id", assessmentId)
    .maybeSingle();
  if (!a) {
    // RLS já filtra por clínica: sem linha = fora do escopo do usuário.
    const { accessDeniedError } = await import("@/lib/access-error");
    throw accessDeniedError(
      "Esta triagem pertence a um consultório fora do seu acesso, então o e-mail não pode ser preparado nem enviado.",
    );
  }

  const { data: clinic } = await supabase
    .from("clinics")
    .select("name, contact_email")
    .eq("id", a.clinic_id as string)
    .maybeSingle();

  const { data: results } = await supabase
    .from("scale_results")
    .select("scale_code, scale_name, score, band, risk, answers")
    .eq("assessment_id", assessmentId);

  const defaultTo =
    audience === "paciente"
      ? ((a.respondent_email as string | null) ?? null)
      : ((clinic?.contact_email as string | null) ??
        (a.respondent_email as string | null) ??
        null);

  let to = defaultTo;
  if (toOverride) {
    const allowed = await allowedEmailsForAssessment(supabase, {
      clinicId: a.clinic_id as string,
      contactId: (a.contact_id as string | null) ?? null,
      respondentEmail: (a.respondent_email as string | null) ?? null,
      clinicEmail: (clinic?.contact_email as string | null) ?? null,
    });
    if (!allowed.has(toOverride.trim().toLowerCase())) {
      const { accessDeniedError } = await import("@/lib/access-error");
      throw accessDeniedError(
        "Este destinatário não pertence à triagem nem aos contatos do seu consultório. Envie apenas para o paciente, o contato vinculado ou o e-mail do consultório.",
      );
    }
    to = toOverride.trim();
  }

  const { subject, html, text } = buildResultsEmail({
    clinicName: (clinic?.name as string) ?? "Triagem",
    respondentName: a.respondent_name as string,
    submittedAt: a.submitted_at as string,
    respondentType: (a.respondent_type as "paciente" | "familiar") ?? "paciente",
    informantName: (a.informant_name as string | null) ?? null,
    informantRelation: (a.informant_relation as string | null) ?? null,
    mainComplaint: (a.main_complaint as string | null) ?? null,
    audience,
    results: (results ?? []).map((r) => ({
      scale_code: r.scale_code as string,
      scale_name: r.scale_name as string,
      score: (r.score as number | null) ?? null,
      band: (r.band as string | null) ?? null,
      risk: Boolean(r.risk),
      answers: (r.answers as Record<string, number> | null) ?? null,
    })),
  });

  return {
    to,
    subject,
    html,
    text,
    clinicId: a.clinic_id as string,
    contactId: (a.contact_id as string | null) ?? null,
    respondentName: a.respondent_name as string,
  };
}
