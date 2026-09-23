/**
 * Envio e histórico de e-mails — server-only.
 *
 * Usa a infraestrutura de e-mail gerenciada da plataforma. Nenhuma fila ou
 * tabela de e-mail é criada no projeto: o histórico vem da API de logs.
 */
import { listEmailLogs, sendLovableEmail, EmailAPIError } from "@lovable.dev/email-js";

export type EmailDelivery = {
  timestamp: string;
  recipient: string;
  event_type: string;
  status: string | null;
  message_id: string | null;
};

function apiKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Envio de e-mail não está configurado neste projeto.");
  return key;
}

/** Domínio remetente verificado, quando já configurado. */
export function senderDomain(): string | null {
  return process.env["EMAIL_SENDER_DOMAIN"] ?? process.env["LOVABLE_EMAIL_SENDER_DOMAIN"] ?? null;
}

/** Últimos eventos de entrega (enviado, recusado, devolvido, bloqueado…). */
export async function fetchEmailDeliveries(limit = 100): Promise<{
  deliveries: EmailDelivery[];
  history_starts_at: string | null;
}> {
  const res = await listEmailLogs({ limit }, { apiKey: apiKey() });
  return {
    deliveries: (res.data ?? []).map((e) => ({
      timestamp: e.timestamp,
      recipient: e.recipient,
      event_type: e.event_type,
      status: e.status ?? null,
      message_id: e.message_id ?? null,
    })),
    history_starts_at: res.history_starts_at ?? null,
  };
}

/** Payload essencial devolvido pelo provedor de e-mail, para auditoria. */
export type ProviderPayload = {
  message_id: string | null;
  status: string | number | null;
  code: string | null;
  success: boolean | null;
  retry_after_seconds: number | null;
  reason: string | null;
};

export type SendResult =
  | { ok: true; message_id: string | null; provider: ProviderPayload }
  | { ok: false; reason: string; code: string | null; provider: ProviderPayload };

/** Dispara um e-mail já renderizado, devolvendo o resultado do provedor. */
export async function sendRenderedEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
  label?: string;
}): Promise<SendResult> {
  const domain = senderDomain();
  if (!domain) {
    const reason =
      "Nenhum domínio de envio configurado. Configure o domínio para liberar o disparo de e-mails.";
    return {
      ok: false,
      reason,
      code: "no_email_domain",
      provider: {
        message_id: null,
        status: null,
        code: "no_email_domain",
        success: false,
        retry_after_seconds: null,
        reason,
      },
    };
  }
  try {
    const res = await sendLovableEmail(
      {
        to: input.to,
        from: `triagem@${domain}`,
        sender_domain: domain,
        subject: input.subject,
        html: input.html,
        text: input.text,
        label: input.label,
        idempotency_key: input.idempotencyKey,
      },
      { apiKey: apiKey(), idempotencyKey: input.idempotencyKey },
    );
    const raw = res as unknown as {
      success?: boolean;
      message_id?: string | null;
      status?: string | number | null;
      reason?: string | null;
    };
    const provider: ProviderPayload = {
      message_id: raw.message_id ?? null,
      status: raw.status ?? null,
      code: null,
      success: raw.success ?? true,
      retry_after_seconds: null,
      reason: raw.reason ?? null,
    };
    return raw.success === false
      ? { ok: false, reason: raw.reason ?? "Envio recusado pelo provedor.", code: null, provider }
      : { ok: true, message_id: provider.message_id, provider };
  } catch (e) {
    if (e instanceof EmailAPIError) {
      const code = e.code ?? String(e.status);
      return {
        ok: false,
        reason: e.message,
        code,
        provider: {
          message_id: null,
          status: e.status ?? null,
          code,
          success: false,
          retry_after_seconds: e.retryAfterSeconds ?? null,
          reason: e.message,
        },
      };
    }
    const reason = e instanceof Error ? e.message : "Falha desconhecida no envio.";
    return {
      ok: false,
      reason,
      code: null,
      provider: {
        message_id: null,
        status: null,
        code: null,
        success: false,
        retry_after_seconds: null,
        reason,
      },
    };
  }
}
