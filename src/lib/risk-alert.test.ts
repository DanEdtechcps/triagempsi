import { describe, expect, it } from "vitest";
import {
  MAX_ALERT_RECIPIENTS,
  buildRiskAlertEmail,
  isRiskSubmission,
  normalizeRecipients,
} from "@/lib/risk-alert";

describe("isRiskSubmission", () => {
  it("detecta por risk_pathway do resumo", () => {
    expect(isRiskSubmission({ summary: { risk_pathway: true, risk_flags: [] }, results: [] })).toBe(true);
  });
  it("detecta por risk_flags não vazio", () => {
    expect(isRiskSubmission({ summary: { risk_flags: ["PHQ9_item9"] }, results: [] })).toBe(true);
  });
  it("detecta por qualquer escala com risk=true", () => {
    expect(
      isRiskSubmission({
        summary: { risk_pathway: false, risk_flags: [] },
        results: [{ risk: false }, { risk: true }],
      }),
    ).toBe(true);
  });
  it("sem sinal de risco em lugar nenhum → false", () => {
    expect(
      isRiskSubmission({
        summary: { risk_pathway: false, risk_flags: [] },
        results: [{ risk: false }],
      }),
    ).toBe(false);
  });
});

describe("normalizeRecipients", () => {
  it("remove vazios, inválidos e duplicatas (case-insensitive)", () => {
    expect(
      normalizeRecipients([" A@x.com ", "a@x.com", null, undefined, "", "sem-arroba", "b@y.org"]),
    ).toEqual(["a@x.com", "b@y.org"]);
  });
  it(`limita a ${MAX_ALERT_RECIPIENTS} destinatários`, () => {
    const many = Array.from({ length: 30 }, (_, i) => `u${i}@x.com`);
    expect(normalizeRecipients(many)).toHaveLength(MAX_ALERT_RECIPIENTS);
  });
});

describe("buildRiskAlertEmail", () => {
  const mail = buildRiskAlertEmail({
    clinicName: "Clínica <Teste> & Cia",
    assessmentId: "0c07604f-a2d2-4330-b49f-d2ed94b9211f",
    baseUrl: "https://psiqway.com.br/",
  });

  it("aponta para o painel autenticado, sem barra duplicada", () => {
    expect(mail.link).toBe("https://psiqway.com.br/painel/0c07604f-a2d2-4330-b49f-d2ed94b9211f");
    expect(mail.text).toContain(mail.link);
    expect(mail.html).toContain(mail.link);
  });

  it("assunto marca prioridade e cita a clínica", () => {
    expect(mail.subject).toMatch(/^\[Prioridade\]/);
    expect(mail.subject).toContain("Clínica <Teste> & Cia");
  });

  it("escapa HTML do nome da clínica (sem injeção)", () => {
    expect(mail.html).not.toContain("<Teste>");
    expect(mail.html).toContain("&lt;Teste&gt; &amp; Cia");
  });

  it("não aceita barra de caminho no id (encode)", () => {
    const m = buildRiskAlertEmail({ clinicName: "C", assessmentId: "../admin", baseUrl: "https://x.com" });
    expect(m.link).toBe("https://x.com/painel/..%2Fadmin");
  });

  it("lembra CVV 188 / SAMU 192 e não contém campos de paciente", () => {
    expect(mail.text).toContain("188");
    expect(mail.text).toContain("192");
    expect(mail.text.toLowerCase()).not.toMatch(/nome do paciente|telefone|respondent|e-mail do paciente/);
  });
});
