import { describe, expect, it } from "vitest";
import { fillerLabel, pickClientIp, resolveConsentAt, sha256Hex } from "@/lib/consent";

const NOW = new Date("2026-10-04T12:00:00.000Z");

describe("resolveConsentAt", () => {
  it("aceita horário recente do cliente", () => {
    expect(resolveConsentAt("2026-10-04T11:50:00.000Z", NOW)).toBe("2026-10-04T11:50:00.000Z");
  });
  it("sem valor → agora do servidor", () => {
    expect(resolveConsentAt(null, NOW)).toBe(NOW.toISOString());
    expect(resolveConsentAt(undefined, NOW)).toBe(NOW.toISOString());
  });
  it("lixo não parseável → agora do servidor", () => {
    expect(resolveConsentAt("não é data", NOW)).toBe(NOW.toISOString());
  });
  it("data no futuro além da tolerância → agora (cliente não forja)", () => {
    expect(resolveConsentAt("2026-10-05T12:00:00.000Z", NOW)).toBe(NOW.toISOString());
  });
  it("tolera pequeno desvio de relógio (2 min à frente)", () => {
    expect(resolveConsentAt("2026-10-04T12:02:00.000Z", NOW)).toBe("2026-10-04T12:02:00.000Z");
  });
  it("muito antiga (> 24h) → agora (não aceita consentimento antigo reaproveitado)", () => {
    expect(resolveConsentAt("2026-10-02T12:00:00.000Z", NOW)).toBe(NOW.toISOString());
  });
});

describe("sha256Hex", () => {
  it("bate com o vetor conhecido de 'abc'", async () => {
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
  it("muda com qualquer alteração do texto", async () => {
    expect(await sha256Hex("Concordo.")).not.toBe(await sha256Hex("Concordo"));
  });
});

describe("pickClientIp", () => {
  it("pega o primeiro de uma cadeia", () => {
    expect(pickClientIp("203.0.113.9, 10.0.0.1")).toBe("203.0.113.9");
  });
  it("aceita IPv6", () => {
    expect(pickClientIp("2001:db8::1")).toBe("2001:db8::1");
  });
  it("rejeita vazio, nulo e conteúdo estranho", () => {
    expect(pickClientIp("")).toBeNull();
    expect(pickClientIp(null)).toBeNull();
    expect(pickClientIp("1.2.3.4; DROP TABLE")).toBeNull();
    expect(pickClientIp("<script>")).toBeNull();
  });
});

describe("fillerLabel", () => {
  it("nunca inclui nome de pessoa", () => {
    expect(fillerLabel("familiar")).toBe("familiar/responsável");
    expect(fillerLabel("paciente")).toBe("o próprio paciente");
    expect(fillerLabel(undefined)).toBe("o próprio paciente");
  });
});
