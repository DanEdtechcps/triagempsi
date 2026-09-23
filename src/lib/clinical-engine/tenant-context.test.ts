import { describe, it, expect } from "vitest";
import {
  resolveTenantContext,
  sanitizeTenantSlug,
  assertTenantBoundary,
  bindTenantToAssessmentPayload,
  TenantBoundaryViolationError,
  TenantResolutionError,
  MissingTenantContextError,
  type TenantContext,
} from "./tenant-context";
import type { AssessmentPayload } from "./types";

describe("Clinical Engine — Isolamento Multi-Tenant (Cal.com Pattern)", () => {
  const mockBasePayload: AssessmentPayload = {
    clinic_slug: "clinica-exemplo",
    respondent_name: "Paciente Teste",
    respondent_email: "paciente@teste.com",
    respondent_phone: "11999999999",
    respondent_age: 30,
    birth_date: "1994-01-01",
    respondent_sex: "feminino",
    respondent_type: "paciente",
    informant_name: null,
    informant_relation: null,
    main_complaint: "Ansiedade generalizada",
    consent_lgpd: true,
    consent_at: new Date().toISOString(),
    invitation_token: null,
    doctor_id: null,
    symptom_path: ["ansiedade"],
    results: [],
    summary: {},
  };

  describe("Resolvedor de Slug e Contexto do Tenant (resolveTenantContext)", () => {
    it("valida e normaliza slugs bem-formatados", () => {
      expect(sanitizeTenantSlug("clinica-alpha")).toBe("clinica-alpha");
      expect(sanitizeTenantSlug("  CLINICA-BETA  ")).toBe("clinica-beta");
      expect(sanitizeTenantSlug("psicologia-2026")).toBe("psicologia-2026");
    });

    it("rejeita slugs com caracteres proibidos ou vazios", () => {
      expect(() => sanitizeTenantSlug("")).toThrow(TenantResolutionError);
      expect(() => sanitizeTenantSlug("   ")).toThrow(TenantResolutionError);
      expect(() => sanitizeTenantSlug("clinica@alfa")).toThrow(TenantResolutionError);
      expect(() => sanitizeTenantSlug("clinica_com_underline")).toThrow(TenantResolutionError);
      expect(() => sanitizeTenantSlug("clinica/hack")).toThrow(TenantResolutionError);
    });

    it("cria um objeto de contexto imutável e com features ativas", () => {
      const context = resolveTenantContext("clinica-alpha", {
        clinic_id: "c-12345",
        clinic_name: "Clínica Alpha Psiquiatria",
      });

      expect(context.clinic_id).toBe("c-12345");
      expect(context.clinic_slug).toBe("clinica-alpha");
      expect(context.clinic_name).toBe("Clínica Alpha Psiquiatria");
      expect(context.features.whatsapp_notifications).toBe(true);
      expect(Object.isFrozen(context)).toBe(true);
      expect(Object.isFrozen(context.features)).toBe(true);
    });

    it("rejeita contexto com clinic_id vazio fornecido", () => {
      expect(() => resolveTenantContext("clinica-alpha", { clinic_id: "   " })).toThrow(
        TenantResolutionError,
      );
    });
  });

  describe("Middleware de Proteção contra Vazamento Cruzado (assertTenantBoundary)", () => {
    const activeContext: TenantContext = resolveTenantContext("clinica-a", {
      clinic_id: "clinic-uuid-aaaa",
      clinic_name: "Clínica A",
    });

    it("permite acesso quando o targetClinicId coincide com o tenant ativo", () => {
      expect(() => assertTenantBoundary(activeContext, "clinic-uuid-aaaa")).not.toThrow();
    });

    it("bloqueia e lança TenantBoundaryViolationError se targetClinicId for de outro tenant", () => {
      expect(() => assertTenantBoundary(activeContext, "clinic-uuid-bbbb")).toThrow(
        TenantBoundaryViolationError,
      );
    });

    it("bloqueia operação se o contexto for nulo ou incompleto", () => {
      expect(() =>
        assertTenantBoundary(null as unknown as TenantContext, "clinic-uuid-aaaa"),
      ).toThrow(MissingTenantContextError);
    });
  });

  describe("Selagem de Payload (bindTenantToAssessmentPayload)", () => {
    const validContext = resolveTenantContext("clinica-exemplo", {
      clinic_id: "clinic-uuid-123",
      clinic_name: "Clínica Exemplo",
    });

    it("sela o payload adicionando obrigatoriamente o clinic_id do tenant ativo", () => {
      const sealed = bindTenantToAssessmentPayload(mockBasePayload, validContext);

      expect(sealed.clinic_id).toBe("clinic-uuid-123");
      expect(sealed.clinic_slug).toBe("clinica-exemplo");
      expect(sealed.respondent_name).toBe(mockBasePayload.respondent_name);
    });

    it("bloqueia tentativa de injeção cruzada quando o payload já traz clinic_id diferente", () => {
      const hostilePayload: AssessmentPayload = {
        ...mockBasePayload,
        clinic_id: "clinic-malicious-999", // Tentativa de salvar na clínica alheia
      };

      expect(() => bindTenantToAssessmentPayload(hostilePayload, validContext)).toThrow(
        TenantBoundaryViolationError,
      );
    });

    it("bloqueia payload com clinic_slug conflitante com o contexto ativo", () => {
      const mismatchedPayload: AssessmentPayload = {
        ...mockBasePayload,
        clinic_slug: "outra-clinica-alheia",
      };

      expect(() => bindTenantToAssessmentPayload(mismatchedPayload, validContext)).toThrow(
        TenantResolutionError,
      );
    });

    it("rejeita a finalização do payload se o contexto de clínica for ausente", () => {
      expect(() =>
        bindTenantToAssessmentPayload(mockBasePayload, null as unknown as TenantContext),
      ).toThrow(MissingTenantContextError);
    });
  });
});
