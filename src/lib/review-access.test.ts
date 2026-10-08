import { describe, expect, it, vi } from "vitest";
import { isAccessDenied } from "./access-error";
import { authenticateReviewer, requireDecisor, type ReviewerRow } from "./review-access";
import { generateReviewToken, hashReviewToken } from "./review-token";

const ativo: ReviewerRow = {
  id: "r1",
  name: "Dr. Saraiva",
  role: "decisor",
  is_active: true,
  revoked_at: null,
};

describe("authenticateReviewer", () => {
  it("aceita o token cujo hash existe e devolve nome e papel (nunca o hash)", async () => {
    const token = generateReviewToken();
    const esperado = await hashReviewToken(token);
    const lookup = vi.fn(async (h: string) => (h === esperado ? ativo : null));
    const r = await authenticateReviewer(token, lookup);
    expect(r).toEqual({ id: "r1", name: "Dr. Saraiva", role: "decisor" });
    expect(lookup).toHaveBeenCalledWith(esperado);
  });

  it("token malformado nem chega ao banco", async () => {
    const lookup = vi.fn(async () => ativo);
    await expect(authenticateReviewer("curto", lookup)).rejects.toSatisfy(isAccessDenied);
    await expect(authenticateReviewer(undefined, lookup)).rejects.toSatisfy(isAccessDenied);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("token desconhecido, desativado ou revogado dão a mesma recusa", async () => {
    const token = generateReviewToken();
    const msgs: string[] = [];
    for (const row of [
      null,
      { ...ativo, is_active: false },
      { ...ativo, revoked_at: "2026-10-08T00:00:00Z" },
    ]) {
      try {
        await authenticateReviewer(token, async () => row);
      } catch (e) {
        expect(isAccessDenied(e)).toBe(true);
        msgs.push((e as Error).message);
      }
    }
    expect(msgs).toHaveLength(3);
    expect(new Set(msgs).size).toBe(1);
  });
});

describe("requireDecisor", () => {
  it("decisor passa; avaliador é recusado", () => {
    expect(() => requireDecisor({ id: "a", name: "A", role: "decisor" })).not.toThrow();
    expect(() => requireDecisor({ id: "b", name: "B", role: "avaliador" })).toThrowError(/decisor/);
  });
});
