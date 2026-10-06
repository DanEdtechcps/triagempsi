/**
 * Registro de auditoria — server-only.
 *
 * Grava quem fez o quê e quando. Nunca lança: uma falha de auditoria não pode
 * derrubar a operação de negócio (mas fica no log do servidor).
 */
export type AuditAction =
  | "assessment_viewed"
  | "assessment_submitted"
  | "report_exported"
  | "contact_created"
  | "invite_created"
  | "whatsapp_sent"
  | "invite_resent"
  | "note_added"
  | "email_sent"
  | "email_failed"
  | "whatsapp_result_notice"
  | "clinic_created"
  | "clinic_updated"
  | "staff_added"
  | "staff_removed"
  | "doctor_profile_saved"
  | "doctor_profile_removed"
  | "portal_patient_view"
  | "subscription_created"
  | "subscription_updated"
  | "psychoeducation_generation_requested"
  | "psychoeducation_generation_approved"
  | "psychoeducation_generation_rejected"
  | "risk_alert_sent"
  | "risk_alert_failed"
  | "assessments_listed"
  | "notes_viewed"
  | "longitudinal_viewed"
  | "ocupacional_viewed"
  | "data_anonymized"
  | "data_erased"
  | "password_reset_requested"
  | "outcome_recorded"
  | "research_settings_updated"
  | "research_export"
  | "research_consent_withdrawn";

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  assessment_viewed: "Acessou uma triagem",
  assessment_submitted: "Triagem enviada pelo paciente",
  report_exported: "Baixou relatório em PDF",
  contact_created: "Cadastrou um contato",
  invite_created: "Gerou convite de triagem",
  whatsapp_sent: "Enviou mensagem por WhatsApp",
  invite_resent: "Reenviou o questionário por WhatsApp",
  note_added: "Registrou parecer médico",
  email_sent: "E-mail de resultados enviado",
  email_failed: "Falha no envio de e-mail",
  whatsapp_result_notice: "Aviso de resultados por WhatsApp",
  clinic_created: "Criou um consultório",
  clinic_updated: "Atualizou um consultório",
  staff_added: "Vinculou um profissional",
  staff_removed: "Removeu o vínculo de um profissional",
  doctor_profile_saved: "Salvou o perfil público de um médico",
  doctor_profile_removed: "Removeu o perfil público de um médico",
  portal_patient_view: "Paciente viu o próprio resumo no portal",
  subscription_created: "Criou a assinatura de um consultório",
  subscription_updated: "Atualizou a assinatura de um consultório",
  psychoeducation_generation_requested: "Solicitou geração de material de psicoeducação por IA",
  psychoeducation_generation_approved: "Aprovou material de psicoeducação gerado por IA",
  psychoeducation_generation_rejected: "Rejeitou material de psicoeducação gerado por IA",
  risk_alert_sent: "Alerta de triagem com risco enviado à equipe",
  risk_alert_failed: "Falha ao alertar a equipe sobre triagem com risco",
  assessments_listed: "Abriu a lista de triagens",
  notes_viewed: "Leu os pareceres de uma triagem",
  longitudinal_viewed: "Consultou o acompanhamento longitudinal",
  ocupacional_viewed: "Consultou o relatório ocupacional",
  data_anonymized: "Anonimizou os dados de um titular",
  data_erased: "Excluiu os dados de um titular",
  password_reset_requested: "Pediu recuperação de senha",
  outcome_recorded: "Registrou o desfecho clínico de uma triagem",
  research_settings_updated: "Alterou a configuração de pesquisa de uma clínica",
  research_export: "Exportou o conjunto de dados de pesquisa (anonimizado)",
  research_consent_withdrawn: "Retirou o consentimento de pesquisa de um titular",
};

export async function recordAudit(input: {
  action: AuditAction;
  clinicId?: string | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  details?: Record<string, unknown>;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("audit_logs").insert({
      action: input.action,
      clinic_id: input.clinicId ?? null,
      actor_user_id: input.actorUserId ?? null,
      actor_email: input.actorEmail ?? null,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      details: JSON.parse(JSON.stringify(input.details ?? {})),
    });
    if (error) console.error("recordAudit error", error);
  } catch (e) {
    console.error("recordAudit failed", e);
  }
}

/**
 * Auditoria de LEITURA de dado clínico. Igual a recordAudit (nunca lança, não
 * bloqueia a leitura — um médico não pode ficar sem ver um paciente em risco por
 * falha de log; a falha fica no log do servidor), mas não repete a mesma leitura
 * (mesmo usuário + ação + entidade) dentro de `dedupeMinutes`, porque o painel
 * recarrega listas com frequência e isso encheria a trilha de ruído.
 */
export async function recordReadAudit(input: {
  action: AuditAction;
  actorUserId: string;
  actorEmail?: string | null;
  clinicId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  details?: Record<string, unknown>;
  dedupeMinutes?: number;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - (input.dedupeMinutes ?? 10) * 60_000).toISOString();
    let q = supabaseAdmin
      .from("audit_logs")
      .select("id")
      .eq("actor_user_id", input.actorUserId)
      .eq("action", input.action)
      .gte("created_at", since)
      .limit(1);
    q = input.entityId ? q.eq("entity_id", input.entityId) : q.is("entity_id", null);
    const { data: recent } = await q;
    if (recent && recent.length > 0) return;
    await recordAudit(input);
  } catch (e) {
    console.error("recordReadAudit failed", e);
  }
}
