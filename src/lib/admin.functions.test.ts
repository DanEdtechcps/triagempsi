import { describe, expect, it } from "vitest";
import { evaluateStaffLimit } from "@/lib/admin.functions";

// Cobre o "fail closed" de addStaffAdmin (roadmap 2026-09-24, item #3): antes
// desta correção, uma clínica sem linha em clinic_subscriptions (o caminho
// real de criação até então, createClinicAdmin, nunca criava uma) fazia
// `sub` vir null sem erro de consulta — e o bloco de enforcement inteiro era
// pulado, deixando a clínica com vagas ilimitadas por omissão, o oposto do
// "fail closed" que o código sempre pretendeu implementar.
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

  it("permite quando a assinatura está cancelada (bypass de enforcement pré-existente, não alterado)", () => {
    const decision = evaluateStaffLimit({
      subscriptionQueryFailed: false,
      subscription: { status: "cancelada", maxProfessionals: 2 },
      currentDistinctStaffCount: 5,
    });
    expect(decision.allowed).toBe(true);
  });

  it("permite quando o plano não tem limite de profissionais (max_professionals null)", () => {
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
});
