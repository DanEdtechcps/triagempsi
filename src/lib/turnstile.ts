/**
 * Verificação server-side do Cloudflare Turnstile (captcha).
 *
 * `fetchImpl` é injetável para teste. Sem segredo configurado devolve
 * "nao_configurado" — o ambiente continua funcionando (o limite de requisições
 * segue valendo), mas isso precisa ser configurado antes de abrir ao público.
 */
import type { CaptchaState } from "@/lib/submit-guard";

export const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VERIFY_TIMEOUT_MS = 5_000;

export async function verifyTurnstileToken(input: {
  token: string | null | undefined;
  ip: string | null;
  secret: string | undefined;
  fetchImpl?: typeof fetch;
}): Promise<CaptchaState> {
  if (!input.secret) return "nao_configurado";
  const token = (input.token ?? "").trim();
  if (!token) return "ausente";

  const body = new URLSearchParams({ secret: input.secret, response: token });
  if (input.ip) body.set("remoteip", input.ip);

  try {
    const res = await (input.fetchImpl ?? fetch)(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
    if (!res.ok) {
      // O serviço do Cloudflare falhou: não punimos o paciente por isso. O
      // limite de requisições continua protegendo o endpoint.
      console.warn("turnstile siteverify indisponível", res.status);
      return "nao_configurado";
    }
    const json = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (json.success !== true) {
      // Só os códigos do Cloudflare (ex.: invalid-input-secret, timeout-or-duplicate): sem token nem IP.
      console.warn("turnstile recusado", (json["error-codes"] ?? []).join(","));
    }
    return json.success === true ? "ok" : "invalida";
  } catch (e) {
    console.warn("turnstile siteverify inalcançável", e instanceof Error ? e.name : e);
    return "nao_configurado";
  }
}
