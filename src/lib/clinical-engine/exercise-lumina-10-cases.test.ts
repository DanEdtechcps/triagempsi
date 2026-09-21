import { describe, it, expect } from "vitest";
import { LUMINA_CLINICAL_CASES } from "./seeds/lumina-cases-data";
import { buildTriagePlan, applyEscalations } from "./triage-tree";
import { resolveTenantContext, bindTenantToAssessmentPayload } from "./tenant-context";
import { LUMINA_BRANDING } from "@/config/branding";
import type { ScaleResult } from "./types";

describe("Instituto Lumina de Saúde Mental — Simulação dos 10 Casos Clínicos Homologados", () => {
  const luminaContext = resolveTenantContext("lumina", {
    clinic_id: "c0000000-0000-4000-8000-000000000002",
    clinic_name: "Instituto Lumina de Saúde Mental & Neurociências",
  });

  describe("Provisionamento Institucional e Contexto Multi-Tenant da Lumina", () => {
    it("valida o branding institucional da Lumina (Púrpura #4c1d95 e Violeta #8b5cf6)", () => {
      expect(LUMINA_BRANDING.clinicSlug).toBe("lumina");
      expect(LUMINA_BRANDING.primaryColor).toBe("#4c1d95");
      expect(LUMINA_BRANDING.accentColor).toBe("#8b5cf6");
      expect(LUMINA_BRANDING.doctorName).toBe("Dr. Gustavo Mello");
      expect(luminaContext.clinic_id).toBe("c0000000-0000-4000-8000-000000000002");
    });
  });

  describe("Execução da Matriz dos 10 Casos Clínicos Ricos", () => {
    // CASO 1
    it("Caso 1 (Lucas, 34a - TDAH): ativa ASRS-18, bloqueia EPDS, telemetria média ~1200ms", () => {
      const c = LUMINA_CLINICAL_CASES[0];
      expect(c.id).toBe("lumina-case-01-lucas");

      const plan = buildTriagePlan(c.symptoms, c.age, c.sex);
      expect(plan.indicated.some((i) => i.code === "ASRS-18")).toBe(true);
      expect(plan.flow).not.toContain("EPDS"); // Trava biológica masculina

      expect(c.average_item_time_ms).toBe(1200);
      expect(c.hesitation_detected).toBe(false);

      const sealed = bindTenantToAssessmentPayload(
        {
          clinic_slug: "lumina",
          respondent_name: c.patient_name,
          respondent_email: c.patient_email,
          respondent_phone: "11988881111",
          respondent_age: c.age,
          birth_date: "1990-05-10",
          respondent_sex: c.sex,
          respondent_type: c.informant_type,
          informant_name: null,
          informant_relation: null,
          main_complaint: c.free_text_complaint,
          consent_lgpd: true,
          consent_at: new Date().toISOString(),
          invitation_token: null,
          doctor_id: "d0000000-0000-4000-8000-000000000001", // Dr. Gustavo
          symptom_path: c.symptoms,
          results: [],
          summary: {},
        },
        luminaContext,
      );
      expect(sealed.clinic_id).toBe(luminaContext.clinic_id);
    });

    // CASO 2
    it("Caso 2 (Beatriz, 29a - Pós-Parto e Risco): ativa EPDS, detecta hesitação de 14.500ms e aciona Plano de Segurança", () => {
      const c = LUMINA_CLINICAL_CASES[1];
      const plan = buildTriagePlan(c.symptoms, c.age, c.sex);

      expect(plan.flow).toContain("EPDS");
      expect(plan.riskPathway).toBe(true);

      expect(c.hesitation_detected).toBe(true);
      expect(c.hesitation_details?.response_time_ms).toBe(14500);
      expect(c.hesitation_details?.item_id).toBe("9");

      // Simulação do escalonamento com EPDS escore 19 (item 10 = 1)
      const epdsResult: ScaleResult = {
        scale_code: "EPDS",
        scale_name: "EPDS",
        score: 19,
        band: "Rastreio positivo para depressão perinatal",
        band_level: 4,
        risk: true,
        answers: c.scale_answers["EPDS"],
      };

      const updatedPlan = applyEscalations(plan, epdsResult, c.age, ["EPDS"], 0, c.sex);
      expect(updatedPlan.riskPathway).toBe(true);
      expect(updatedPlan.flow).toContain("ASQ"); // Via de risco canônica
    });

    // CASO 3
    it("Caso 3 (Rodrigo, 44a - Rituais e TOC): ativa OCI-R com tempo de resposta estável", () => {
      const c = LUMINA_CLINICAL_CASES[2];
      const plan = buildTriagePlan(c.symptoms, c.age, c.sex);

      expect(plan.flow).toContain("OCI-R");
      expect(c.average_item_time_ms).toBe(2200);
      expect(c.hesitation_detected).toBe(false);
    });

    // CASO 4
    it("Caso 4 (Gabriel, 26a - Insônia e Ansiedade): ativa ISI (escore 21) e GAD-2/7", () => {
      const c = LUMINA_CLINICAL_CASES[3];
      const plan = buildTriagePlan(c.symptoms, c.age, c.sex);

      expect(plan.flow).toContain("ISI");
      expect(plan.flow).toContain("GAD-2");
    });

    // CASO 5
    it("Caso 5 (Geraldo, 71a - Geriatria): ativa AD-8 e GDS-15 via hetero-relato do filho", () => {
      const c = LUMINA_CLINICAL_CASES[4];
      const plan = buildTriagePlan(c.symptoms, c.age, c.sex);

      expect(c.informant_type).toBe("familiar");
      expect(c.informant_relation).toBe("Filho");
      expect(plan.flow).toContain("AD-8");
      expect(plan.flow).toContain("GDS-15");
    });

    // CASO 6
    it("Caso 6 (Roberto, 45a - Limítrofe): PHQ-2 resulta em exatamente 2 e NÃO dispara PHQ-9", () => {
      const c = LUMINA_CLINICAL_CASES[5];
      const plan = buildTriagePlan(c.symptoms, c.age, c.sex);

      expect(plan.flow).toContain("PHQ-2");

      const phq2Result: ScaleResult = {
        scale_code: "PHQ-2",
        scale_name: "PHQ-2",
        score: 2, // Limítrofe (< 3)
        band: "Negativo",
        band_level: 0,
        risk: false,
        answers: c.scale_answers["PHQ-2"],
      };

      const updatedPlan = applyEscalations(plan, phq2Result, c.age, ["PHQ-2"], 0, c.sex);
      expect(updatedPlan.flow).not.toContain("PHQ-9"); // Não escala
    });

    // CASO 7
    it("Caso 7 (Vanessa, 35a - Bipolaridade): ativa MDQ e sinaliza risco de virada maníaca", () => {
      const c = LUMINA_CLINICAL_CASES[6];
      const plan = buildTriagePlan(c.symptoms, c.age, c.sex);

      expect(plan.flow).toContain("MDQ");
      expect(c.bipolar_risk_flag).toBe(true);

      const phq9Result: ScaleResult = {
        scale_code: "PHQ-9",
        scale_name: "PHQ-9",
        score: 18,
        band: "Moderadamente grave",
        band_level: 3,
        risk: false,
        answers: c.scale_answers["PHQ-9"],
      };

      const updatedPlan = applyEscalations(plan, phq9Result, c.age, ["PHQ-9"], 0, c.sex);
      expect(updatedPlan.flow).toContain("MDQ");
    });

    // CASO 8
    it("Caso 8 (Fernando, 41a - Burnout Corporativo): ativa MBI-HSS e COPSOQ-BR com PHQ-2 baixo", () => {
      const c = LUMINA_CLINICAL_CASES[7];
      const plan = buildTriagePlan(c.symptoms, c.age, c.sex);

      expect(plan.flow).toContain("MBI-HSS");
      expect(plan.flow).toContain("COPSOQ-BR");
    });

    // CASO 9
    it("Caso 9 (Helena, 39a - TEPT Pós-Assalto): ativa PC-PTSD-5 e escala para PCL-5 em escore >= 3", () => {
      const c = LUMINA_CLINICAL_CASES[8];
      const plan = buildTriagePlan(c.symptoms, c.age, c.sex);

      expect(plan.flow).toContain("PC-PTSD-5");

      const traumaResult: ScaleResult = {
        scale_code: "PC-PTSD-5",
        scale_name: "PC-PTSD-5",
        score: 5,
        band: "Positivo",
        band_level: 3,
        risk: false,
        answers: c.scale_answers["PC-PTSD-5"],
      };

      const updatedPlan = applyEscalations(plan, traumaResult, c.age, ["PC-PTSD-5"], 0, c.sex);
      expect(updatedPlan.flow).toContain("PCL-5");
    });

    // CASO 10
    it("Caso 10 (Juliano, 22a - Dependência de Substâncias): ativa ASSIST e AUDIT-C", () => {
      const c = LUMINA_CLINICAL_CASES[9];
      const plan = buildTriagePlan(c.symptoms, c.age, c.sex);

      expect(plan.flow).toContain("ASSIST");
      expect(plan.flow).toContain("AUDIT-C");
    });
  });
});
