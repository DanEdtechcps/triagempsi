/**
 * Autenticação do link pessoal do Estúdio de validação — lógica com o acesso ao banco INJETADO
 * (função `lookup`), para testar sem simular o Supabase. O I/O real fica em review-studio.functions.ts.
 */
import { accessDeniedError } from "./access-error";
import { hashReviewToken, isWellFormedReviewToken } from "./review-token";
import type { ReviewerRole } from "./review-studio";

export type ReviewerRow = {
  id: string;
  name: string;
  role: ReviewerRole;
  is_active: boolean;
  revoked_at: string | null;
};

export type Reviewer = { id: string; name: string; role: ReviewerRole };

const MENSAGEM = "Link inválido ou desativado. Peça um novo link a quem enviou este.";

/** Valida o token e devolve o avaliador. Qualquer falha dá a MESMA mensagem (não revela se o token existe). */
export async function authenticateReviewer(
  token: unknown,
  lookup: (tokenHash: string) => Promise<ReviewerRow | null>,
): Promise<Reviewer> {
  if (!isWellFormedReviewToken(token)) throw accessDeniedError(MENSAGEM);
  const row = await lookup(await hashReviewToken(token));
  if (!row || !row.is_active || row.revoked_at) throw accessDeniedError(MENSAGEM);
  return { id: row.id, name: row.name, role: row.role };
}

/** Só o decisor grava decisão final e exporta. */
export function requireDecisor(reviewer: Reviewer): void {
  if (reviewer.role !== "decisor") {
    throw accessDeniedError("Só o médico curador (decisor) pode fazer isto.");
  }
}
