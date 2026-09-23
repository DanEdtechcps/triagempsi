import { describe, expect, it } from "vitest";
import { isInvitationValidForClinic } from "@/lib/assessment.functions";

// Cobre o isolamento real entre clínicas em submitAssessment — o caminho
// que de fato roda em produção. tenant-context.ts tinha 9 testes próprios
// mas nunca era chamado por nenhuma rota real (achado #17 da auditoria);
// estes testes exercitam a função que assessment.functions.ts usa de
// verdade pra decidir se um convite pertence à clínica resolvida.
describe("isInvitationValidForClinic", () => {
  const now = new Date("2026-09-23T12:00:00Z");

  it("aceita convite da mesma clínica, não usado e não expirado", () => {
    const inv = { clinic_id: "clinic-a", status: "pending", expires_at: null };
    expect(isInvitationValidForClinic(inv, "clinic-a", now)).toBe(true);
  });

  it("rejeita convite de outra clínica — isolamento multi-tenant", () => {
    // O caso central: um convite/doctor_id de uma clínica não pode ser
    // aceito ao submeter sob o slug de outra clínica.
    const inv = { clinic_id: "clinic-b", status: "pending", expires_at: null };
    expect(isInvitationValidForClinic(inv, "clinic-a", now)).toBe(false);
  });

  it("rejeita convite já usado", () => {
    const inv = { clinic_id: "clinic-a", status: "used", expires_at: null };
    expect(isInvitationValidForClinic(inv, "clinic-a", now)).toBe(false);
  });

  it("rejeita convite expirado", () => {
    const inv = {
      clinic_id: "clinic-a",
      status: "pending",
      expires_at: "2026-09-20T00:00:00Z",
    };
    expect(isInvitationValidForClinic(inv, "clinic-a", now)).toBe(false);
  });

  it("aceita convite com expiração no futuro", () => {
    const inv = {
      clinic_id: "clinic-a",
      status: "pending",
      expires_at: "2026-12-31T00:00:00Z",
    };
    expect(isInvitationValidForClinic(inv, "clinic-a", now)).toBe(true);
  });

  it("rejeita quando o convite não existe", () => {
    expect(isInvitationValidForClinic(null, "clinic-a", now)).toBe(false);
  });
});
