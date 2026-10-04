/**
 * Alerta ativo à equipe quando uma triagem chega com sinal de risco — server-only.
 *
 * Nunca lança: a triagem já está gravada e o alerta é um efeito adicional.
 * O resultado (enviado/falhou, por quê) é sempre registrado em audit_logs,
 * para a falha de entrega ser visível e não silenciosa.
 *
 * Provedor, em ordem: Resend (RESEND_API_KEY + RISK_ALERT_FROM) → e-mail
 * gerenciado legado (LOVABLE_API_KEY + domínio). Sem nenhum dos dois, registra
 * `risk_alert_failed` com `no_provider`.
 */
import { buildRiskAlertEmail, normalizeRecipients } from "@/lib/risk-alert";

const DEFAULT_BASE_URL = "https://triagempsi.pontocomumtus.workers.dev";
const SEND_TIMEOUT_MS = 8_000;

type Mail = ReturnType<typeof buildRiskAlertEmail>;
type SendOutcome = { ok: true; provider: string } | { ok: false; provider: string; reason: string };

async function sendViaResend(to: string[], mail: Mail): Promise<SendOutcome | null> {
  const key = process.env["RESEND_API_KEY"];
  const from = process.env["RISK_ALERT_FROM"];
  if (!key || !from) return null;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: mail.subject, html: mail.html, text: mail.text }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    if (res.ok) return { ok: true, provider: "resend" };
    return { ok: false, provider: "resend", reason: `http_${res.status}` };
  } catch (e) {
    return { ok: false, provider: "resend", reason: e instanceof Error ? e.name : "erro_desconhecido" };
  }
}

async function sendViaLegacy(to: string[], mail: Mail, idem: string): Promise<SendOutcome> {
  try {
    const { sendRenderedEmail } = await import("@/lib/emails.server");
    let anyOk = false;
    let lastReason = "sem_destinatario";
    for (const addr of to) {
      const r = await sendRenderedEmail({
        to: addr,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        idempotencyKey: `${idem}:${addr}`,
        label: "risk_alert",
      });
      if (r.ok) anyOk = true;
      else lastReason = r.code ?? r.reason;
    }
    return anyOk
      ? { ok: true, provider: "legacy" }
      : { ok: false, provider: "legacy", reason: lastReason };
  } catch (e) {
    return { ok: false, provider: "legacy", reason: e instanceof Error ? e.name : "erro_desconhecido" };
  }
}

async function collectRecipients(clinicId: string, doctorId: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: clinic } = await supabaseAdmin
    .from("clinics")
    .select("name, contact_email")
    .eq("id", clinicId)
    .maybeSingle();

  const userIds = new Set<string>();
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("clinic_id", clinicId)
    .in("role", ["admin", "doctor", "clinico"]);
  for (const r of roles ?? []) userIds.add(r.user_id as string);
  if (doctorId) {
    const { data: doc } = await supabaseAdmin
      .from("doctor_profiles")
      .select("user_id")
      .eq("id", doctorId)
      .eq("clinic_id", clinicId)
      .maybeSingle();
    if (doc?.user_id) userIds.add(doc.user_id as string);
  }

  const emails: (string | null)[] = [clinic?.contact_email ?? null];
  for (const id of [...userIds].slice(0, 20)) {
    try {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id);
      emails.push(data?.user?.email ?? null);
    } catch {
      /* usuário removido — ignora */
    }
  }
  return { clinicName: (clinic?.name as string | undefined) ?? "", recipients: normalizeRecipients(emails) };
}

export async function dispatchRiskAlert(input: {
  clinicId: string;
  assessmentId: string;
  doctorId: string | null;
}): Promise<{ sent: boolean; reason?: string }> {
  const { recordAudit } = await import("@/lib/audit.server");
  try {
    const { clinicName, recipients } = await collectRecipients(input.clinicId, input.doctorId);
    if (recipients.length === 0) {
      await recordAudit({
        action: "risk_alert_failed",
        clinicId: input.clinicId,
        entityType: "assessment",
        entityId: input.assessmentId,
        details: { reason: "no_recipients" },
      });
      return { sent: false, reason: "no_recipients" };
    }
    // Teto de e-mails por clínica/hora (anti-inundação por envios forjados).
    const { bumpBucket } = await import("@/lib/submit-guard.server");
    if (!(await bumpBucket("alerta", `clinica:${input.clinicId}`))) {
      await recordAudit({
        action: "risk_alert_failed",
        clinicId: input.clinicId,
        entityType: "assessment",
        entityId: input.assessmentId,
        details: { reason: "alert_throttled" },
      });
      return { sent: false, reason: "alert_throttled" };
    }
    const mail = buildRiskAlertEmail({
      clinicName,
      assessmentId: input.assessmentId,
      baseUrl: process.env["APP_BASE_URL"] ?? DEFAULT_BASE_URL,
    });
    const outcome =
      (await sendViaResend(recipients, mail)) ??
      (process.env["LOVABLE_API_KEY"]
        ? await sendViaLegacy(recipients, mail, `risk:${input.assessmentId}`)
        : ({ ok: false, provider: "none", reason: "no_provider" } as const));

    await recordAudit({
      action: outcome.ok ? "risk_alert_sent" : "risk_alert_failed",
      clinicId: input.clinicId,
      entityType: "assessment",
      entityId: input.assessmentId,
      details: {
        provider: outcome.provider,
        recipients: recipients.length,
        ...(outcome.ok ? {} : { reason: outcome.reason }),
      },
    });
    return outcome.ok ? { sent: true } : { sent: false, reason: outcome.reason };
  } catch (e) {
    console.error("dispatchRiskAlert falhou", e);
    await recordAudit({
      action: "risk_alert_failed",
      clinicId: input.clinicId,
      entityType: "assessment",
      entityId: input.assessmentId,
      details: { reason: "exception" },
    });
    return { sent: false, reason: "exception" };
  }
}
