/**
 * Caixa de saída local para triagens com risco de suicídio.
 *
 * Regra de segurança: uma triagem com sinal de risco nunca pode se perder por
 * falha de rede. Antes de enviar, o payload é guardado aqui; só é apagado
 * depois que o servidor confirma. Se o envio falhar, tentamos de novo com
 * recuo progressivo, ao reabrir a página e quando a conexão voltar.
 *
 * Trade-off consciente: enquanto não houver confirmação, o payload (com PHI)
 * fica no armazenamento do navegador. Por isso ele expira em OUTBOX_TTL_MS e
 * é apagado assim que o servidor confirma o recebimento.
 *
 * Sem dependência de React nem do DOM: o `Storage` é injetado para teste.
 */

export const OUTBOX_TTL_MS = 24 * 60 * 60 * 1000;
export const RETRY_DELAYS_MS = [2_000, 5_000, 15_000, 30_000, 60_000] as const;

export type OutboxEntry<P = unknown> = {
  submission_id: string;
  payload: P;
  created_at: number;
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function outboxKey(slug: string): string {
  return `triagem:outbox:${slug}`;
}

export function saveOutbox<P>(storage: StorageLike, slug: string, entry: OutboxEntry<P>): boolean {
  try {
    storage.setItem(outboxKey(slug), JSON.stringify(entry));
    return true;
  } catch {
    // Cota cheia ou navegador em modo privado: o envio segue só em memória.
    return false;
  }
}

export function clearOutbox(storage: StorageLike, slug: string): void {
  try {
    storage.removeItem(outboxKey(slug));
  } catch {
    /* ignora */
  }
}

/** Lê a entrada pendente; descarta (e apaga) entradas corrompidas ou vencidas. */
export function loadOutbox<P = unknown>(
  storage: StorageLike,
  slug: string,
  now: number = Date.now(),
): OutboxEntry<P> | null {
  let raw: string | null = null;
  try {
    raw = storage.getItem(outboxKey(slug));
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<OutboxEntry<P>>;
    const valid =
      typeof parsed.submission_id === "string" &&
      parsed.submission_id.length > 0 &&
      typeof parsed.created_at === "number" &&
      parsed.payload !== undefined &&
      now - parsed.created_at <= OUTBOX_TTL_MS;
    if (!valid) {
      clearOutbox(storage, slug);
      return null;
    }
    return parsed as OutboxEntry<P>;
  } catch {
    clearOutbox(storage, slug);
    return null;
  }
}

export type DeliveryResult = { ok: true; attempts: number } | { ok: false; attempts: number; error: unknown };

/**
 * Tenta enviar; em falha, espera o próximo atraso e tenta de novo.
 * `delays.length + 1` tentativas no total. `sleep` e `shouldStop` são
 * injetados para teste e para cancelar ao desmontar a tela.
 */
export async function deliverWithRetry(
  send: () => Promise<unknown>,
  opts: {
    delays?: readonly number[];
    sleep?: (ms: number) => Promise<void>;
    shouldStop?: () => boolean;
    /** Chamado a cada falha, antes da espera — a UI avisa o paciente na hora. */
    onFailure?: (attempt: number, error: unknown) => void;
  } = {},
): Promise<DeliveryResult> {
  const delays = opts.delays ?? RETRY_DELAYS_MS;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let attempts = 0;
  let lastError: unknown;
  for (let i = 0; i <= delays.length; i++) {
    if (opts.shouldStop?.()) return { ok: false, attempts, error: lastError ?? new Error("cancelado") };
    attempts++;
    try {
      await send();
      return { ok: true, attempts };
    } catch (e) {
      lastError = e;
      opts.onFailure?.(attempts, e);
      if (i < delays.length) await sleep(delays[i]);
    }
  }
  return { ok: false, attempts, error: lastError };
}
