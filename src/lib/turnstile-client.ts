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

export async function getTurnstileToken(timeoutMs = 10_000): Promise<string | null> {
  const siteKey = turnstileSiteKey();
  if (!siteKey) return null;
  const api = await loadScript();
  if (!api) return null;

  return new Promise<string | null>((resolve) => {
    const host = document.createElement("div");
    host.style.cssText =
      "position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:70";
    document.body.appendChild(host);

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
      host.remove();
      resolve(token);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);

    try {
      widgetId = api.render(host, {
        sitekey: siteKey,
        appearance: "interaction-only",
        callback: (token: string) => finish(token),
        "error-callback": () => finish(null),
        "timeout-callback": () => finish(null),
      });
    } catch {
      finish(null);
    }
  });
}
