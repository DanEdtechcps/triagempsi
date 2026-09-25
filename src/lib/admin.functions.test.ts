import { describe, expect, it } from "vitest";
import { evaluateStaffLimit } from "@/lib/admin.functions";

// Cobre o "fail closed" de addStaffAdmin (roadmap 2026-09-24, itens #2 e #3):
// - uma clínica sem linha em clinic_subscriptions (createClinicAdmin, antes
//   do provisionamento atômico, nunca criava uma) fazia `sub` vir null sem
//   erro de consulta — e o bloco de enforcement inteiro era pulado, deixando
//   a clínica com vagas ilimitadas por omissão.
// - assinatura "cancelada" pulava o enforcement inteiro quando o plano não
//   tinha maxProfessionals definido — o oposto do esperado, já que
//   upsertSubscriptionAdmin (billing.functions.ts) desativa a clínica
//   inteira (clinics.is_active = false) quando o status vira "cancelada".
//   A regra correta é bloquear qualquer novo vínculo nesse status, sempre.
describe("evaluateStaffLimit", () => {
  it("nega quando a consulta à assinatura falha", () => {
    const decision = evaluateStaffLimit({
      subscriptionQueryFailed: true,
      subscription: null,
      currentDistinctStaffCount: 0,
    });
    expect(decision.allowed).toBe(false);
  });

  it("nega quando a clínica não tem nenhuma assinatura (dado legado incompleto) — o bug central", () => {
    const decision = evaluateStaffLimit({
      subscriptionQueryFailed: false,
      subscription: null,
      currentDistinctStaffCount: 0,
    });
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.reason).toMatch(/não tem uma assinatura/i);
    }
  });

  it("bloqueia qualquer novo vínculo quando a assinatura está cancelada, mesmo abaixo do limite do plano", () => {
    const decision = evaluateStaffLimit({
      subscriptionQueryFailed: false,
      subscription: { status: "cancelada", maxProfessionals: 10 },
      currentDistinctStaffCount: 0,
    });
    expect(decision.allowed).toBe(false);
  });

  it("bloqueia quando cancelada mesmo sem limite definido no plano (achado: ordem invertida permitia bypass)", () => {
    const decision = evaluateStaffLimit({
      subscriptionQueryFailed: false,
      subscription: { status: "cancelada", maxProfessionals: null },
      currentDistinctStaffCount: 5,
    });
    expect(decision.allowed).toBe(false);
  });

  it("permite quando o plano não tem limite de profissionais (max_professionals null) e não está cancelada", () => {
    const decision = evaluateStaffLimit({
      subscriptionQueryFailed: false,
      subscription: { status: "ativa", maxProfessionals: null },
      currentDistinctStaffCount: 999,
    });
    expect(decision.allowed).toBe(true);
  });

  it("permite adicionar profissional quando ainda há vaga no limite do plano", () => {
    const decision = evaluateStaffLimit({
      subscriptionQueryFailed: false,
      subscription: { status: "ativa", maxProfessionals: 2 },
      currentDistinctStaffCount: 1,
    });
    expect(decision.allowed).toBe(true);
  });

  it("nega quando o limite de profissionais do plano já foi atingido", () => {
    const decision = evaluateStaffLimit({
      subscriptionQueryFailed: false,
      subscription: { status: "ativa", maxProfessionals: 2 },
      currentDistinctStaffCount: 2,
    });
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.reason).toMatch(/até 2 profissionais/i);
    }
  });

  it("nega quando o limite já foi ultrapassado", () => {
    const decision = evaluateStaffLimit({
      subscriptionQueryFailed: false,
      subscription: { status: "ativa", maxProfessionals: 2 },
      currentDistinctStaffCount: 3,
    });
    expect(decision.allowed).toBe(false);
  });

  it("aplica o limite normalmente para outros status não-ativos (ex.: inadimplente)", () => {
    const decision = evaluateStaffLimit({
      subscriptionQueryFailed: false,
      subscription: { status: "inadimplente", maxProfessionals: 3 },
      currentDistinctStaffCount: 3,
    });
    expect(decision.allowed).toBe(false);
  });

  it("aplica o limite normalmente para status suspensa", () => {
    const decision = evaluateStaffLimit({
      subscriptionQueryFailed: false,
      subscription: { status: "suspensa", maxProfessionals: 3 },
      currentDistinctStaffCount: 2,
    });
    expect(decision.allowed).toBe(true);
  });
});
