import { getStartContext } from "@tanstack/start-storage-context";

type CloudflareAIBinding = {
  run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
};

type RequestWithCloudflareRuntime = Request & {
  runtime?: { cloudflare?: { env?: { AI?: CloudflareAIBinding } } };
};

/**
 * Acessa o binding `AI` (Cloudflare Workers AI) do Worker em execução.
 *
 * Nitro v3 anexa o runtime do Cloudflare ao próprio objeto Request como
 * `request.runtime.cloudflare.env` (ver
 * node_modules/nitro/dist/docs/0.docs/15.migration.md — mudou do padrão v2
 * `event.context.cloudflare.env`). O TanStack Start expõe esse mesmo Request
 * via `getStartContext().request` dentro de uma server function.
 *
 * Isto NUNCA é exercitável em `bun run dev` (roda em Vite puro, não no
 * runtime do Cloudflare) — só via `wrangler dev` ou depois de um deploy
 * real. Ver `documentação viva/06_RUNBOOK_REPRODUCAO_DO_ZERO.md`.
 */
export function getWorkersAI(): CloudflareAIBinding {
  const ctx = getStartContext({ throwIfNotFound: false });
  const request = ctx?.request as RequestWithCloudflareRuntime | undefined;
  const ai = request?.runtime?.cloudflare?.env?.AI;
  if (!ai) {
    throw new Error(
      "Binding Workers AI (env.AI) indisponível nesta requisição. Isso só existe rodando sob o runtime real do Cloudflare Worker (wrangler dev ou produção) — bun run dev não expõe bindings do Cloudflare.",
    );
  }
  return ai;
}
