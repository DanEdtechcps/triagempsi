/**
 * Fila de revisão em lote: guarda a ordem das triagens exibidas no painel
 * para permitir navegar "anterior / próxima" dentro do detalhe, sem voltar
 * à lista a cada caso.
 */
const KEY = "painel.review-queue";

export type ReviewQueue = { ids: string[]; label: string };

export function saveReviewQueue(ids: string[], label: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ids, label } satisfies ReviewQueue));
  } catch {
    /* sessionStorage indisponível */
  }
}

export function loadReviewQueue(): ReviewQueue | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReviewQueue;
    return Array.isArray(parsed.ids) ? parsed : null;
  } catch {
    return null;
  }
}

/** Marca uma triagem como revisada nesta sessão. */
const DONE_KEY = "painel.reviewed";

export function loadReviewed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(sessionStorage.getItem(DONE_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function toggleReviewed(id: string): string[] {
  const atual = loadReviewed();
  const próximo = atual.includes(id)
    ? atual.filter((x) => x !== id)
    : [...atual, id];
  try {
    sessionStorage.setItem(DONE_KEY, JSON.stringify(próximo));
  } catch {
    /* ignore */
  }
  return próximo;
}

/** Marca várias triagens como revisadas de uma vez (ação em lote). */
export function markReviewedBulk(ids: string[]): string[] {
  const próximo = Array.from(new Set([...loadReviewed(), ...ids]));
  try {
    sessionStorage.setItem(DONE_KEY, JSON.stringify(próximo));
  } catch {
    /* ignore */
  }
  return próximo;
}
