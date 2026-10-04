/**
 * Orquestra captcha + limite de requisições do envio público — server-only.
 * Política (pura) em submit-guard.ts; aqui só o I/O.
 *
 * Falhas de infraestrutura (banco do limitador fora do ar) NÃO barram o
 * paciente: o limitador abre (fail-open) e registra no log do servidor.
 */
import { getRequest } from "@tanstack/react-start/server";
import {
  RATE_POLICY,
  decideSubmitAccess,
  hashKey,
  type CaptchaState,
  type GuardDecision,
  type RateBucket,
} from "@/lib/submit-guard";
import { verifyTurnstileToken } from "@/lib/turnstile";

export async function bumpBucket(bucket: RateBucket, key: string): Promise<boolean> {
  const { limit, windowSeconds } = RATE_POLICY[bucket];
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // A função é nova (migration 20261004000000) e ainda não está em types.ts.
    const rpc = supabaseAdmin.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: { allowed: boolean }[] | null; error: unknown }>;
    const { data, error } = await rpc.call(supabaseAdmin, "check_public_rate_limit", {
      p_key: `${bucket}:${key}`,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error || !data?.[0]) {
      console.error("check_public_rate_limit falhou — liberando (fail-open)", error);
      return true;
    }
    return data[0].allowed;
  } catch (e) {
    console.error("limitador indisponível — liberando (fail-open)", e);
    return true;
  }
}

export async function guardPublicSubmit(input: {
  clinicSlug: string;
  email: string;
  isRisk: boolean;
  captchaToken: string | null | undefined;
}): Promise<GuardDecision> {
  const request = getRequest();
  const ip = request?.headers.get("cf-connecting-ip") ?? request?.headers.get("x-forwarded-for") ?? null;
  const salt = process.env["RATE_LIMIT_SALT"] ?? process.env["SUPABASE_PROJECT_ID"] ?? "triagem";

  // Risco não passa por captcha: não gastamos tempo nem arriscamos barrar.
  const captcha: CaptchaState = input.isRisk
    ? "nao_configurado"
    : await verifyTurnstileToken({
        token: input.captchaToken,
        ip,
        secret: process.env["TURNSTILE_SECRET_KEY"],
      });

  const ipKey = await hashKey([ip ?? "sem-ip", input.clinicSlug], salt);
  const rateAllowed: Partial<Record<RateBucket, boolean>> = {};
  if (input.isRisk) {
    rateAllowed.risco = await bumpBucket("risco", ipKey);
  } else if (captcha !== "ausente" && captcha !== "invalida") {
    // Só consome limite quem passou pelo captcha (evita gastar banco com bot óbvio).
    rateAllowed.geral = await bumpBucket("geral", ipKey);
    const emailKey = await hashKey([input.email.toLowerCase(), input.clinicSlug], salt);
    rateAllowed.email = await bumpBucket("email", emailKey);
  }

  const decision = decideSubmitAccess({ isRisk: input.isRisk, captcha, rateAllowed });
  if (!decision.allow) {
    console.warn("envio público barrado", decision.reason, input.clinicSlug);
  }
  return decision;
}
