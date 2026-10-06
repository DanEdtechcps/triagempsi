/**
 * Política anti-abuso do envio público de triagem — parte pura (sem I/O).
 *
 * Princípio inegociável: uma triagem COM RISCO nunca é barrada por captcha, e
 * só é barrada por limite de requisições num balde próprio, bem mais folgado.
 * Perder um aviso de risco de suicídio é pior do que aceitar um envio falso.
 */

export type RateBucket = "geral" | "risco" | "email" | "alerta" | "senha_email" | "senha_ip";

export const RATE_POLICY: Record<RateBucket, { limit: number; windowSeconds: number }> = {
  // Por IP + clínica. Folgado de propósito: a recepção de uma clínica pode ter
  // vários pacientes no mesmo Wi-Fi (mesmo IP público).
  geral: { limit: 12, windowSeconds: 600 },
  // Balde separado, para abuso no envio comum nunca consumir o do risco.
  // `isRisk` vem do cliente: um robô pode se declarar "risco" para pular o
  // captcha. Por isso o balde não é largo demais (e há teto de alertas abaixo).
  risco: { limit: 20, windowSeconds: 600 },
  // Mesma pessoa/e-mail repetindo a triagem na mesma clínica.
  email: { limit: 5, windowSeconds: 3600 },
  // E-mails de alerta à equipe, por clínica. Acima disso a triagem continua
  // gravada e no topo do painel, mas o e-mail é suprimido (anti-inundação).
  alerta: { limit: 20, windowSeconds: 3600 },
  // Recuperação de senha: poucos pedidos por e-mail (não inundar a caixa de ninguém)
  // e um teto maior por IP.
  senha_email: { limit: 3, windowSeconds: 3600 },
  senha_ip: { limit: 10, windowSeconds: 3600 },
};

export type CaptchaState = "ok" | "ausente" | "invalida" | "nao_configurado";

export type GuardDecision =
  | { allow: true; captcha: CaptchaState }
  | { allow: false; reason: "captcha" | "rate"; message: string; captcha: CaptchaState };

export const MSG_CAPTCHA =
  "Não conseguimos confirmar que você é uma pessoa. Recarregue a página e tente enviar de novo.";
export const MSG_RATE =
  "Muitos envios em pouco tempo. Aguarde alguns minutos e tente novamente.";

/**
 * @param isRisk        a triagem tem sinal de risco
 * @param captchaState  resultado da verificação do Turnstile
 * @param rateAllowed   resultado de cada balde que foi consultado
 */
export function decideSubmitAccess(input: {
  isRisk: boolean;
  captcha: CaptchaState;
  rateAllowed: Partial<Record<RateBucket, boolean>>;
}): GuardDecision {
  const { isRisk, captcha, rateAllowed } = input;

  if (isRisk) {
    // Risco: só o balde de risco pode barrar; captcha ausente/inválido é
    // aceito (e registrado em auditoria pelo chamador).
    if (rateAllowed.risco === false) {
      return { allow: false, reason: "rate", message: MSG_RATE, captcha };
    }
    return { allow: true, captcha };
  }

  if (captcha === "ausente" || captcha === "invalida") {
    return { allow: false, reason: "captcha", message: MSG_CAPTCHA, captcha };
  }
  if (rateAllowed.geral === false || rateAllowed.email === false) {
    return { allow: false, reason: "rate", message: MSG_RATE, captcha };
  }
  return { allow: true, captcha };
}

/** SHA-256 hex de partes concatenadas — nunca guardamos IP/e-mail crus na chave. */
export async function hashKey(parts: string[], salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}\u0000${parts.join("\u0000")}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
