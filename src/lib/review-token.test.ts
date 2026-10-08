import { describe, expect, it } from "vitest";
import {
  generateReviewToken,
  hashReviewToken,
  isWellFormedReviewToken,
  reviewLink,
  tokenFromHash,
} from "./review-token";

describe("token do link pessoal", () => {
  it("gera 43 caracteres base64url, diferentes a cada vez", () => {
    const a = generateReviewToken();
    const b = generateReviewToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it("o hash é SHA-256 em hexadecimal e é estável", async () => {
    const t = generateReviewToken();
    const h1 = await hashReviewToken(t);
    const h2 = await hashReviewToken(t);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(h1).toBe(h2);
    expect(await hashReviewToken(generateReviewToken())).not.toBe(h1);
  });

  it("o hash conhecido bate (SHA-256 de 'abc')", async () => {
    expect(await hashReviewToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("rejeita token malformado", () => {
    expect(isWellFormedReviewToken("curto")).toBe(false);
    expect(isWellFormedReviewToken("x".repeat(44))).toBe(false);
    expect(isWellFormedReviewToken(`${"a".repeat(42)}!`)).toBe(false);
    expect(isWellFormedReviewToken(undefined)).toBe(false);
    expect(isWellFormedReviewToken(generateReviewToken())).toBe(true);
  });

  it("o link põe o token no fragmento e dá para ler de volta", () => {
    const t = generateReviewToken();
    const link = reviewLink("https://psiqway.com.br/", t);
    expect(link).toBe(`https://psiqway.com.br/revisao/estudio#t=${t}`);
    expect(tokenFromHash(new URL(link).hash)).toBe(t);
  });

  it("não lê token inválido do fragmento", () => {
    expect(tokenFromHash("")).toBeNull();
    expect(tokenFromHash("#t=curto")).toBeNull();
    expect(tokenFromHash("#outro=1")).toBeNull();
  });
});
