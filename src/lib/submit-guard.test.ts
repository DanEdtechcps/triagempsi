import { describe, expect, it } from "vitest";
import {
  MSG_CAPTCHA,
  MSG_RATE,
  RATE_POLICY,
  decideSubmitAccess,
  hashKey,
} from "@/lib/submit-guard";

describe("decideSubmitAccess — triagem COM risco", () => {
  it("nunca é barrada por captcha ausente", () => {
    const d = decideSubmitAccess({ isRisk: true, captcha: "ausente", rateAllowed: { risco: true } });
    expect(d.allow).toBe(true);
  });
  it("nunca é barrada por captcha inválido", () => {
    const d = decideSubmitAccess({ isRisk: true, captcha: "invalida", rateAllowed: { risco: true } });
    expect(d.allow).toBe(true);
  });
  it("não é afetada pelo balde geral nem pelo de e-mail estourados", () => {
    const d = decideSubmitAccess({
      isRisk: true,
      captcha: "ok",
      rateAllowed: { geral: false, email: false, risco: true },
    });
    expect(d.allow).toBe(true);
  });
  it("só o balde de risco estourado a barra", () => {
    const d = decideSubmitAccess({ isRisk: true, captcha: "ok", rateAllowed: { risco: false } });
    expect(d).toMatchObject({ allow: false, reason: "rate", message: MSG_RATE });
  });
});

describe("decideSubmitAccess — triagem SEM risco", () => {
  it("captcha ok + dentro dos limites → permite", () => {
    expect(
      decideSubmitAccess({ isRisk: false, captcha: "ok", rateAllowed: { geral: true, email: true } })
        .allow,
    ).toBe(true);
  });
  it("captcha não configurado (ambiente sem chave) → permite", () => {
    expect(
      decideSubmitAccess({
        isRisk: false,
        captcha: "nao_configurado",
        rateAllowed: { geral: true, email: true },
      }).allow,
    ).toBe(true);
  });
  it("captcha ausente → barra com mensagem de captcha", () => {
    const d = decideSubmitAccess({
      isRisk: false,
      captcha: "ausente",
      rateAllowed: { geral: true, email: true },
    });
    expect(d).toMatchObject({ allow: false, reason: "captcha", message: MSG_CAPTCHA });
  });
  it("captcha inválido → barra", () => {
    expect(
      decideSubmitAccess({ isRisk: false, captcha: "invalida", rateAllowed: {} }).allow,
    ).toBe(false);
  });
  it("balde geral estourado → barra por rate", () => {
    const d = decideSubmitAccess({
      isRisk: false,
      captcha: "ok",
      rateAllowed: { geral: false, email: true },
    });
    expect(d).toMatchObject({ allow: false, reason: "rate" });
  });
  it("balde de e-mail estourado → barra por rate", () => {
    expect(
      decideSubmitAccess({ isRisk: false, captcha: "ok", rateAllowed: { geral: true, email: false } })
        .allow,
    ).toBe(false);
  });
});

describe("RATE_POLICY", () => {
  it("o balde de risco é mais folgado que o geral (risco nunca sufocado por abuso comum)", () => {
    expect(RATE_POLICY.risco.limit).toBeGreaterThan(RATE_POLICY.geral.limit);
  });
  it("limites e janelas são positivos", () => {
    for (const p of Object.values(RATE_POLICY)) {
      expect(p.limit).toBeGreaterThan(0);
      expect(p.windowSeconds).toBeGreaterThan(0);
    }
  });
});

describe("hashKey", () => {
  it("é determinístico e depende do sal e das partes", async () => {
    const a = await hashKey(["1.2.3.4", "saraiva"], "s1");
    expect(a).toBe(await hashKey(["1.2.3.4", "saraiva"], "s1"));
    expect(a).not.toBe(await hashKey(["1.2.3.4", "saraiva"], "s2"));
    expect(a).not.toBe(await hashKey(["1.2.3.5", "saraiva"], "s1"));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
  it("não vaza o IP cru no resultado", async () => {
    expect(await hashKey(["203.0.113.9"], "s")).not.toContain("203.0.113.9");
  });
  it("partes são separadas (a|bc ≠ ab|c)", async () => {
    expect(await hashKey(["a", "bc"], "s")).not.toBe(await hashKey(["ab", "c"], "s"));
  });
});
