/**
 * Cliente do Cloudflare Turnstile (captcha) — só navegador.
 *
 * O token vale ~5 min e é de uso único, então é pedido NO MOMENTO do envio, não
 * no início do questionário (que leva mais que isso). Modo `interaction-only`:
 * o widget só aparece se o Cloudflare precisar de interação do usuário.
 *
 * Sem `VITE_TURNSTILE_SITE_KEY` nada é carregado e `getTurnstileToken` devolve
 * null. Falha de carregamento (bloqueador de anúncios, rede) também devolve null:
 * o servidor decide; triagem com risco nunca depende deste token.
 */

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise: Promise<TurnstileApi | null> | null = null;

export function turnstileSiteKey(): string | null {
  const k = import.meta.env?.["VITE_TURNSTILE_SITE_KEY"] as string | undefined;
  return k && k.trim() ? k.trim() : null;
}

function loadScript(): Promise<TurnstileApi | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve(window.turnstile ?? null);
    s.onerror = () => {
      scriptPromise = null; // permite nova tentativa depois
      resolve(null);
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/** Pré-carrega o script (sem renderizar) para o token sair rápido no envio. */
export function preloadTurnstile(): void {
  if (turnstileSiteKey()) void loadScript();
}

/** Tempo extra quando o Cloudflare pede um clique do paciente (o widget aparece). */
const INTERACTION_TIMEOUT_MS = 90_000;

export async function getTurnstileToken(timeoutMs = 10_000): Promise<string | null> {
  const siteKey = turnstileSiteKey();
  if (!siteKey) return null;
  const api = await loadScript();
  if (!api) return null;

  return new Promise<string | null>((resolve) => {
    // Camada própria, escondida até o Cloudflare pedir um clique: aí vira um aviso
    // centralizado (não cobre as alternativas) com texto claro.
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "display:none;position:fixed;inset:0;z-index:70;align-items:center;justify-content:center;background:rgba(20,30,35,.45);padding:16px";
    const card = document.createElement("div");
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-live", "polite");
    card.style.cssText =
      "background:#fff;color:#26343b;border-radius:12px;padding:20px;max-width:340px;width:100%;text-align:center;font:15px/1.5 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25)";
    const msg = document.createElement("p");
    msg.textContent = "Confirme abaixo que você é uma pessoa para enviar suas respostas.";
    msg.style.cssText = "margin:0 0 14px";
    const host = document.createElement("div");
    host.style.cssText = "display:flex;justify-content:center;min-height:65px";
    card.append(msg, host);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    let widgetId: string | null = null;
    let settled = false;
    const finish = (token: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        if (widgetId) api.remove(widgetId);
      } catch {
        /* ignora */
      }
      overlay.remove();
      resolve(token);
    };
    let timer = setTimeout(() => finish(null), timeoutMs);

    try {
      widgetId = api.render(host, {
        sitekey: siteKey,
        appearance: "interaction-only",
        callback: (token: string) => finish(token),
        // O desafio precisa de um clique: dá tempo à pessoa em vez de desistir em 10 s.
        "before-interactive-callback": () => {
          if (settled) return;
          overlay.style.display = "flex";
          clearTimeout(timer);
          timer = setTimeout(() => finish(null), INTERACTION_TIMEOUT_MS);
        },
        "error-callback": () => finish(null),
        "timeout-callback": () => finish(null),
      });
    } catch {
      finish(null);
    }
  });
}
