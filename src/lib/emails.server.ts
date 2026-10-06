/**
 * Envio de e-mails transacionais do app (resultados, alertas) — server-only.
 *
 * Provedor: Resend (RESEND_API_KEY) com remetente do domínio verificado (RISK_ALERT_FROM).
 * Substitui o serviço de e-mail do Lovable, que deixou de existir após a migração.
 */
import { buildFrom, senderDomainOf } from "@/lib/mail-sender";

export type EmailDelivery = {
  timestamp: string;
  recipient: string;
  event_type: string;
  status: string | null;
  message_id: string | null;
};

const SEND_TIMEOUT_MS = 10_000;

/** Domínio remetente verificado, ou null quando o envio não está configurado. */
export function senderDomain(): string | null {
  if (!process.env["RESEND_API_KEY"]) return null;
  return senderDomainOf(process.env["RISK_ALERT_FROM"]);
}

/** Payload essencial devolvido pelo provedor, para auditoria. */
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

function failure(
  reason: string,
  code: string | null,
  status: string | number | null = null,
): SendResult {
  return {
    ok: false,
    reason,
    code,
    provider: {
      message_id: null,
      status,
      code,
      success: false,
      retry_after_seconds: null,
      reason,
    },
  };
}

/**
 * Dispara um e-mail já renderizado. `fromName` é o nome exibido (a clínica, no white-label;
 * padrão: Psiqway) e `replyTo` faz a resposta do paciente cair na caixa da clínica.
 */
export async function sendRenderedEmail(input: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
  label?: string;
  fromName?: string | null;
  replyTo?: string | null;
}): Promise<SendResult> {
  const key = process.env["RESEND_API_KEY"];
  const from = buildFrom(process.env["RISK_ALERT_FROM"], "resultados", input.fromName);
  if (!key || !from) {
    return failure(
      "O envio de e-mails ainda não está configurado neste ambiente.",
      "no_email_provider",
    );
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  if (input.idempotencyKey) headers["Idempotency-Key"] = input.idempotencyKey.slice(0, 256);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({
        from,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        ...(input.label
          ? { tags: [{ name: "tipo", value: input.label.replace(/[^A-Za-z0-9_-]/g, "_") }] }
          : {}),
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    const body = (await res.json().catch(() => ({}))) as {
      id?: string;
      name?: string;
      message?: string;
    };
    if (!res.ok) {
      const retry = Number(res.headers.get("retry-after"));
      const f = failure(
        body.message ?? `Recusado pelo provedor (HTTP ${res.status}).`,
        body.name ?? String(res.status),
        res.status,
      );
      if (!f.ok && Number.isFinite(retry) && retry > 0) f.provider.retry_after_seconds = retry;
      return f;
    }
    return {
      ok: true,
      message_id: body.id ?? null,
      provider: {
        message_id: body.id ?? null,
        status: res.status,
        code: null,
        success: true,
        retry_after_seconds: null,
        reason: null,
      },
    };
  } catch (e) {
    return failure(
      e instanceof Error && e.name === "TimeoutError"
        ? "O provedor de e-mail demorou demais para responder."
        : "Não foi possível falar com o provedor de e-mail.",
      "network",
    );
  }
}
