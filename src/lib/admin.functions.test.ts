import { describe, expect, it } from "vitest";
import { evaluateStaffLimit } from "@/lib/admin.functions";

// evaluateStaffLimit decide se addStaffAdmin pode vincular um novo
// profissional ao consultório. Achado: assinatura "cancelada" pulava o
// enforcement inteiro, permitindo profissionais ilimitados — o oposto do
// esperado, já que upsertSubscriptionAdmin (billing.functions.ts) desativa
// a clínica inteira (clinics.is_active = false) quando o status vira
// "cancelada". A regra correta é bloquear qualquer novo vínculo nesse status.
describe("evaluateStaffLimit", () => {
  it("bloqueia qualquer novo vínculo quando a assinatura está cancelada, mesmo abaixo do limite do plano", () => {
    const result = evaluateStaffLimit({ status: "cancelada", maxProfessionals: 10 }, 0);
    expect(result.allowed).toBe(false);
  });

  it("bloqueia quando cancelada mesmo sem limite definido no plano", () => {
    const result = evaluateStaffLimit({ status: "cancelada", maxProfessionals: null }, 0);
    expect(result.allowed).toBe(false);
  });

  it("permite vincular quando não há assinatura registrada para o consultório", () => {
    const result = evaluateStaffLimit(null, 5);
    expect(result).toEqual({ allowed: true });
  });

  it("permite vincular quando o plano não define limite de profissionais", () => {
    const result = evaluateStaffLimit({ status: "ativa", maxProfessionals: null }, 100);
    expect(result).toEqual({ allowed: true });
  });

  it("permite vincular quando a contagem atual está abaixo do limite", () => {
    const result = evaluateStaffLimit({ status: "ativa", maxProfessionals: 5 }, 4);
    expect(result).toEqual({ allowed: true });
  });

  it("bloqueia quando a contagem atual já atingiu o limite", () => {
    const result = evaluateStaffLimit({ status: "ativa", maxProfessionals: 5 }, 5);
    expect(result.allowed).toBe(false);
  });

  it("bloqueia quando a contagem atual excede o limite", () => {
    const result = evaluateStaffLimit({ status: "ativa", maxProfessionals: 5 }, 6);
    expect(result.allowed).toBe(false);
  });

  it("aplica o limite normalmente para outros status não-ativos (ex.: inadimplente)", () => {
    const result = evaluateStaffLimit({ status: "inadimplente", maxProfessionals: 3 }, 3);
    expect(result.allowed).toBe(false);
  });

  it("aplica o limite normalmente para status suspensa", () => {
    const result = evaluateStaffLimit({ status: "suspensa", maxProfessionals: 3 }, 2);
    expect(result).toEqual({ allowed: true });
  });
});
