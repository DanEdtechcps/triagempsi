import { describe, expect, it } from "vitest";
import {
  CAAE_RE,
  canRecordOutcome,
  canWithdrawResearchConsent,
  isGlobalAdmin,
  normalizeOutcomeInput,
  resolveResearchConsent,
  validateResearchSettings,
} from "@/lib/research";
import { sha256Hex } from "@/lib/consent";

const A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

describe("permissões", () => {
  it("desfecho: admin/médico da clínica ou admin global; equipe e outra clínica não", () => {
    expect(canRecordOutcome([{ role: "doctor", clinic_id: A }], A)).toBe(true);
    expect(canRecordOutcome([{ role: "admin", clinic_id: A }], A)).toBe(true);
    expect(canRecordOutcome([{ role: "admin", clinic_id: null }], A)).toBe(true);
    expect(canRecordOutcome([{ role: "staff", clinic_id: A }], A)).toBe(false);
    expect(canRecordOutcome([{ role: "doctor", clinic_id: B }], A)).toBe(false);
    expect(canRecordOutcome([], A)).toBe(false);
  });
  it("exportar/configurar pesquisa: só admin global", () => {
    expect(isGlobalAdmin([{ role: "admin", clinic_id: null }])).toBe(true);
    expect(isGlobalAdmin([{ role: "admin", clinic_id: A }])).toBe(false);
    expect(isGlobalAdmin([{ role: "doctor", clinic_id: null }])).toBe(false);
  });
  it("retirar consentimento: admin da clínica ou global", () => {
    expect(canWithdrawResearchConsent([{ role: "admin", clinic_id: A }], A)).toBe(true);
    expect(canWithdrawResearchConsent([{ role: "doctor", clinic_id: A }], A)).toBe(false);
    expect(canWithdrawResearchConsent([{ role: "admin", clinic_id: B }], A)).toBe(false);
  });
});

describe("resolveResearchConsent", () => {
  const clinic = { research_enabled: true, research_tcle_text: "Texto do TCLE", research_tcle_version: "TCLE-v1" };
  const now = new Date("2026-10-06T12:00:00Z");

  it("com clínica habilitada e pedido do paciente: grava versão, hora e hash do texto exato", async () => {
    const r = await resolveResearchConsent(true, clinic, now);
    expect(r.research_consent).toBe(true);
    expect(r.research_consent_at).toBe(now.toISOString());
    expect(r.research_consent_version).toBe("TCLE-v1");
    expect(r.research_consent_sha256).toBe(await sha256Hex("Texto do TCLE"));
  });
  it("sem pedido do paciente, nada é gravado", async () => {
    expect((await resolveResearchConsent(false, clinic, now)).research_consent).toBe(false);
    expect((await resolveResearchConsent(undefined, clinic, now)).research_consent).toBe(false);
  });
  it("clínica sem pesquisa habilitada ignora o pedido do cliente (não confia no navegador)", async () => {
    expect((await resolveResearchConsent(true, { ...clinic, research_enabled: false }, now)).research_consent).toBe(false);
    expect((await resolveResearchConsent(true, null, now)).research_consent).toBe(false);
  });
  it("sem TCLE ou versão cadastrados não há consentimento válido", async () => {
    expect((await resolveResearchConsent(true, { ...clinic, research_tcle_text: "  " }, now)).research_consent).toBe(false);
    expect((await resolveResearchConsent(true, { ...clinic, research_tcle_version: "" }, now)).research_consent).toBe(false);
  });
});

describe("validateResearchSettings", () => {
  it("habilitar exige protocolo, TCLE e versão", () => {
    expect(validateResearchSettings({ research_enabled: true })).toHaveLength(3);
    expect(
      validateResearchSettings({
        research_enabled: true,
        research_protocol: "12345678.9.0000.0000",
        research_tcle_text: "t",
        research_tcle_version: "v1",
      }),
    ).toEqual([]);
  });
  it("desabilitar não exige nada", () => {
    expect(validateResearchSettings({ research_enabled: false })).toEqual([]);
  });
  it("formato do CAAE", () => {
    expect(CAAE_RE.test("12345678.9.0000.0000")).toBe(true);
    expect(CAAE_RE.test("123")).toBe(false);
  });
});

describe("normalizeOutcomeInput", () => {
  it("limpa CID-10 e mantém os enums", () => {
    expect(
      normalizeOutcomeInput({ concordance: "concorda", risk_assessment: "nao_avaliado", final_dx_icd10: ["f32", "lixo"] }),
    ).toEqual({ concordance: "concorda", risk_assessment: "nao_avaliado", final_dx_icd10: ["F32"] });
  });
});
