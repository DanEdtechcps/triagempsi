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
  | "subscription_updated";


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
