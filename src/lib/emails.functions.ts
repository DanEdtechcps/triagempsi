import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { EmailDelivery } from "@/lib/emails.server";
import { maskEmail } from "@/lib/auth-ui";

export type EmailDeliveryRow = EmailDelivery;

export type EmailStatusPayload = {
  domainConfigured: boolean;
  deliveries: EmailDeliveryRow[];
  history_starts_at: string | null;
  error: string | null;
};

/**
 * Estado do envio de e-mails + últimos envios. O histórico vem da nossa trilha de
 * auditoria (email_sent / email_failed), já isolada por clínica pelo RLS, e não de um painel
 * externo. Só guardamos o destinatário MASCARADO (sem PHI).
 */
export const getEmailStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EmailStatusPayload> => {
    const { senderDomain } = await import("@/lib/emails.server");
    const domainConfigured = Boolean(senderDomain());
    const { data, error } = await context.supabase
      .from("audit_logs")
      .select("created_at, action, details")
      .in("action", ["email_sent", "email_failed"])
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      return {
        domainConfigured,
        deliveries: [],
        history_starts_at: null,
        error: "Não foi possível ler o histórico de envios.",
      };
    }
    const deliveries: EmailDeliveryRow[] = (data ?? []).map((r) => {
      const d = (r.details ?? {}) as Record<string, unknown>;
      const sent = r.action === "email_sent";
      return {
        timestamp: r.created_at as string,
        recipient: (d["destinatario_mascarado"] as string | undefined) ?? "(não registrado)",
        event_type: sent ? "sent" : "failed",
        status: sent ? null : ((d["erro"] as string | undefined) ?? null),
        message_id: (d["message_id"] as string | undefined) ?? null,
      };
    });
    return { domainConfigured, deliveries, history_starts_at: null, error: null };
  });

/** Triagens recentes disponíveis para (re)envio dos resultados básicos. */
export const listEmailTargets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("assessments")
      .select("id, respondent_name, respondent_email, submitted_at")
      .order("submitted_at", { ascending: false })
      .limit(50);
    if (error) throw new Error("Não foi possível carregar as triagens.");
    return (data ?? []) as {
      id: string;
      respondent_name: string;
      respondent_email: string;
      submitted_at: string;
    }[];
  });

/** Pré-visualização do e-mail com os dados reais da triagem (não envia nada). */
export const previewResultsEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        assessment_id: z.string().uuid(),
        audience: z.enum(["profissional", "paciente"]),
        to: z.string().email().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { buildAssessmentEmail } = await import("@/lib/email/results-payload.server");
    const { assertClinicAccess } = await import("@/lib/painel-access.server");
    const built = await buildAssessmentEmail(
      context.supabase,
      data.assessment_id,
      data.audience,
      data.to,
    );
    // Dupla checagem de escopo: a triagem tem de ser de uma clínica do usuário.
    await assertClinicAccess(context.supabase, context.userId, built.clinicId);
    return {
      to: built.to,
      subject: built.subject,
      html: built.html,
      text: built.text,
      respondent_name: built.respondentName,
    };
  });

/** Reenvia o e-mail de resultados básicos e registra o resultado na auditoria. */
export const resendResultsEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        assessment_id: z.string().uuid(),
        audience: z.enum(["profissional", "paciente"]),
        to: z.string().email().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { buildAssessmentEmail } = await import("@/lib/email/results-payload.server");
    const { assertClinicAccess } = await import("@/lib/painel-access.server");
    const built = await buildAssessmentEmail(
      context.supabase,
      data.assessment_id,
      data.audience,
      data.to,
    );
    // Dupla checagem de escopo antes de qualquer disparo real.
    await assertClinicAccess(context.supabase, context.userId, built.clinicId);
    const to = built.to;
    if (!to) throw new Error("Nenhum destinatário disponível para este envio.");
    const a = {
      id: data.assessment_id,
      clinic_id: built.clinicId,
      respondent_name: built.respondentName,
    };

    const { sendRenderedEmail } = await import("@/lib/emails.server");
    const sent = await sendRenderedEmail({
      to,
      subject: built.subject,
      html: built.html,
      text: built.text,
      label: `resultados-${data.audience}`,
      idempotencyKey: `resend-${data.assessment_id}-${data.audience}-${Date.now()}`,
      // White-label: o e-mail sai com o nome da clínica e a resposta cai na caixa dela.
      fromName: built.clinicName || null,
      replyTo: built.clinicEmail,
    });

    // Número da tentativa: envios anteriores registrados para esta triagem + 1.
    const { count: previousAttempts } = await context.supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("entity_type", "assessment")
      .eq("entity_id", data.assessment_id)
      .in("action", ["email_sent", "email_failed"]);
    const attempt = (previousAttempts ?? 0) + 1;

    const { recordAudit } = await import("@/lib/audit.server");
    await recordAudit({
      action: sent.ok ? "email_sent" : "email_failed",
      clinicId: a.clinic_id as string,
      actorUserId: context.userId,
      actorEmail: (context.claims as { email?: string })?.email ?? null,
      entityType: "assessment",
      entityId: a.id as string,
      details: {
        triagem_id: data.assessment_id,
        destinatario_id: built.contactId,
        tentativa: attempt,
        destinatario_mascarado: maskEmail(to),
        publico: data.audience,
        provedor: sent.provider,
        ...(sent.ok ? { message_id: sent.message_id } : { erro: sent.reason, codigo: sent.code }),
      },
    });

    // Aviso por WhatsApp ao contato somente quando o e-mail saiu com sucesso.
    let whatsapp: { to_phone: string; body: string; link: string } | null = null;
    if (sent.ok) {
      const { notifyResultsByWhatsapp } = await import("@/lib/whatsapp-notice.server");
      whatsapp = await notifyResultsByWhatsapp(context.supabase, {
        assessmentId: data.assessment_id,
        audience: data.audience,
        actorUserId: context.userId,
        actorEmail: (context.claims as { email?: string })?.email ?? null,
      });
    }

    return { ...sent, whatsapp };
  });
