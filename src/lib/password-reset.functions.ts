import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Pedido de recuperação de senha — público.
 *
 * Em vez do e-mail padrão do Supabase (inglês, remetente deles), geramos o link
 * de recuperação com a service role e enviamos NOSSO e-mail, em português, pelo
 * Resend, com link do nosso domínio. Se o Resend não estiver configurado, cai no
 * envio padrão do Supabase para o fluxo nunca ficar quebrado.
 *
 * A resposta é SEMPRE a mesma (ok), exista ou não a conta, e há limite de pedidos
 * por e-mail e por IP: sem enumeração de usuários e sem inundar caixas alheias.
 */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ email: z.string().trim().toLowerCase().email().max(200) }).parse(raw),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const generic = { ok: true } as const;
    const { getRequest } = await import("@tanstack/react-start/server");
    const { bumpBucket } = await import("@/lib/submit-guard.server");
    const { hashKey } = await import("@/lib/submit-guard");
    const { pickClientIp } = await import("@/lib/consent");
    const { recordAudit } = await import("@/lib/audit.server");
    const { buildPasswordResetEmail, buildResetLink, deriveAccessSender } = await import(
      "@/lib/auth-email"
    );

    const request = getRequest();
    const ip = pickClientIp(
      request?.headers.get("cf-connecting-ip") ?? request?.headers.get("x-forwarded-for"),
    );
    const salt = process.env["RATE_LIMIT_SALT"] ?? process.env["SUPABASE_PROJECT_ID"] ?? "triagem";
    const emailOk = await bumpBucket("senha_email", await hashKey([data.email], salt));
    const ipOk = await bumpBucket("senha_ip", await hashKey([ip ?? "sem-ip"], salt));
    if (!emailOk || !ipOk) {
      console.warn("pedido de recuperação de senha barrado por limite");
      return generic;
    }

    const base =
      process.env["APP_BASE_URL"] ?? (request ? new URL(request.url).origin : "") ?? "";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: data.email,
    });
    const tokenHash = link?.properties?.hashed_token;
    if (error || !tokenHash) return generic; // conta inexistente: mesma resposta.
    const userId = link?.user?.id ?? null;

    const key = process.env["RESEND_API_KEY"];
    const from = deriveAccessSender(process.env["RISK_ALERT_FROM"]);
    let sent = false;
    let provider = "none";

    if (key && from && base) {
      provider = "resend";
      const mail = buildPasswordResetEmail({ link: buildResetLink(base, tokenHash) });
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from,
            to: [data.email],
            subject: mail.subject,
            html: mail.html,
            text: mail.text,
          }),
          signal: AbortSignal.timeout(8_000),
        });
        sent = res.ok;
        if (!res.ok) console.error("recuperação de senha: Resend recusou", res.status);
      } catch (e) {
        console.error("recuperação de senha: falha ao chamar o Resend", e);
      }
    }

    if (!sent) {
      // Fallback: e-mail padrão do Supabase (melhor que nenhum e-mail).
      provider = provider === "resend" ? "resend+supabase" : "supabase";
      const { error: fbErr } = await supabaseAdmin.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${base}/reset-password`,
      });
      sent = !fbErr;
    }

    await recordAudit({
      action: "password_reset_requested",
      entityType: "user",
      entityId: userId,
      details: { sent, provider },
    });
    return generic;
  });
