import { describe, expect, it } from "vitest";
import { BRANDING, GENERIC_BRANDING, resolveBranding } from "./branding";

// Achado #3 do ROADMAP_ESCALA_SAAS_2026-09-24.md: resolveBranding() caía no
// fallback "Saraiva" pra qualquer campo ausente de QUALQUER clínica nova —
// nome do médico, CRM, disclaimer de emergência de outra clínica incluídos.
describe("resolveBranding", () => {
  it("retorna o branding genérico quando não há clínica nenhuma", () => {
    expect(resolveBranding(null)).toEqual(GENERIC_BRANDING);
    expect(resolveBranding(undefined)).toEqual(GENERIC_BRANDING);
  });

  it("uma clínica nova sem nenhum branding customizado recebe o fallback genérico, nunca dado da Saraiva ou da Lumina", () => {
    const branding = resolveBranding({ slug: "clinica-nova", name: "Clínica Nova" });

    expect(branding.clinicSlug).toBe("clinica-nova");
    expect(branding.clinicName).toBe("Clínica Nova");

    // Nenhum campo ausente vira dado real de outra clínica.
    expect(branding.doctorName).toBe(GENERIC_BRANDING.doctorName);
    expect(branding.doctorCredentials).toBe(GENERIC_BRANDING.doctorCredentials);
    expect(branding.primaryColor).toBe(GENERIC_BRANDING.primaryColor);
    expect(branding.accentColor).toBe(GENERIC_BRANDING.accentColor);
    expect(branding.disclaimer).toBe(GENERIC_BRANDING.disclaimer);
    expect(branding.consentCopy).toBe(GENERIC_BRANDING.consentCopy);
    expect(branding.emergency.message).toBe(GENERIC_BRANDING.emergency.message);
    expect(branding.contactEmail).toBeNull();

    expect(branding.doctorName).not.toBe("Dr. José Ribamar Fernandes Saraiva Junior");
    expect(branding.doctorName).not.toBe("Dr. Gustavo Mello");
    expect(branding.primaryColor).not.toBe("#1e4d5c"); // cor da Saraiva
    expect(branding.primaryColor).not.toBe("#4c1d95"); // cor da Lumina
  });

  it("CVV e SAMU são sempre os números nacionais fixos, independente da clínica", () => {
    const branding = resolveBranding({ slug: "clinica-nova", name: "Clínica Nova" });
    expect(branding.emergency.cvvPhone).toBe("188");
    expect(branding.emergency.samuPhone).toBe("192");
  });

  it("usa os dados da clínica do banco quando presentes, sem pedir nada da Saraiva/Lumina", () => {
    const branding = resolveBranding({
      slug: "outra-clinica",
      name: "Outra Clínica",
      doctor_name: "Dra. Fulana de Tal",
      doctor_credentials: "CRM-SP 12345",
      primary_color: "#123456",
      accent_color: "#654321",
      contact_email: "contato@outraclinica.med.br",
      disclaimer: "Aviso legal customizado desta clínica.",
      emergency_message: "Mensagem de crise customizada desta clínica.",
    });

    expect(branding.doctorName).toBe("Dra. Fulana de Tal");
    expect(branding.doctorCredentials).toBe("CRM-SP 12345");
    expect(branding.primaryColor).toBe("#123456");
    expect(branding.accentColor).toBe("#654321");
    expect(branding.contactEmail).toBe("contato@outraclinica.med.br");
    expect(branding.disclaimer).toBe("Aviso legal customizado desta clínica.");
    expect(branding.emergency.message).toBe("Mensagem de crise customizada desta clínica.");
    // CVV/SAMU continuam fixos mesmo com emergency_message customizado.
    expect(branding.emergency.cvvPhone).toBe("188");
    expect(branding.emergency.samuPhone).toBe("192");
  });

  it("reproduz o branding da Saraiva a partir da linha equivalente vinda do banco (comportamento visível não muda)", () => {
    const saraivaRow = {
      slug: "saraiva",
      name: "Saraiva Clínica de Psiquiatria",
      doctor_name: "Dr. José Ribamar Fernandes Saraiva Junior",
      doctor_credentials: "CRM-RS 29349 | RQE 30038",
      tagline: "Cuidado psiquiátrico com escuta, ciência e humanidade",
      short_tagline: "Psiquiatria que acolhe e orienta",
      city: "Passo Fundo/RS",
      primary_color: "#1e4d5c",
      accent_color: "#3d8b8b",
      contact_email: "contato@clinicasaraiva.med.br",
      intro_copy:
        "Seja bem-vindo(a). Este questionário breve ajuda o Dr. José Ribamar Fernandes Saraiva Junior a conhecer seu momento antes da consulta. Assim, nosso tempo juntos pode ser dedicado ao que realmente importa: uma escuta atenta e individualizada. Suas respostas são protegidas por sigilo ético.",
      done_copy:
        "Muito obrigado por dedicar seu tempo. Suas informações foram enviadas com segurança ao Dr. Saraiva e servirão de base para a sua consulta.",
    };

    expect(resolveBranding(saraivaRow)).toEqual(BRANDING);
  });

  it("reproduz o branding da Lumina a partir da linha equivalente vinda do banco, sem herdar nada da Saraiva", () => {
    const luminaRow = {
      slug: "lumina",
      name: "Instituto Lumina de Saúde Mental & Neurociências",
      doctor_name: "Dr. Gustavo Mello",
      doctor_credentials: "CRM 198765-SP · Psiquiatria de Adultos & Neurociências",
      tagline: "Psiquiatria de Precisão, Neurociências e Acolhimento Humano",
      short_tagline: "Psiquiatria de Precisão & Neurociências",
      city: "São Paulo/SP",
      primary_color: "#4c1d95",
      accent_color: "#8b5cf6",
      contact_email: "contato@lumina.med.br",
      contact_phone: "11988887777",
      website_url: "https://lumina.med.br",
      intro_copy:
        "Seja bem-vindo(a) ao Instituto Lumina de Saúde Mental & Neurociências. Este questionário personalizado organiza seus relatos clínicos antes da consulta, permitindo foco nas suas necessidades reais.",
      done_copy:
        "Muito obrigado por preencher sua pré-triagem. Suas informações foram enviadas com sigilo ético ao corpo clínico do Instituto Lumina.",
    };

    const branding = resolveBranding(luminaRow);

    expect(branding.clinicName).toBe("Instituto Lumina de Saúde Mental & Neurociências");
    expect(branding.doctorName).toBe("Dr. Gustavo Mello");
    expect(branding.primaryColor).toBe("#4c1d95");
    expect(branding.accentColor).toBe("#8b5cf6");
    expect(branding.contactEmail).toBe("contato@lumina.med.br");
    // Disclaimer/consentimento continuam o texto genérico compartilhado —
    // igual ao que a Lumina já mostrava antes (reusava BRANDING.disclaimer).
    expect(branding.disclaimer).toBe(BRANDING.disclaimer);
    expect(branding.consentCopy).toBe(BRANDING.consentCopy);
    expect(branding.doctorName).not.toBe(BRANDING.doctorName);
    expect(branding.primaryColor).not.toBe(BRANDING.primaryColor);
  });
});

describe("BRANDING (constante legada usada em telas sem contexto de clínica)", () => {
  it("mantém os dados reais da Saraiva", () => {
    expect(BRANDING.clinicSlug).toBe("saraiva");
    expect(BRANDING.clinicName).toBe("Saraiva Clínica de Psiquiatria");
    expect(BRANDING.emergency.cvvPhone).toBe("188");
    expect(BRANDING.emergency.samuPhone).toBe("192");
  });
});
