import { describe, expect, it } from "vitest";
import { RESEND_COOLDOWN_SECONDS, maskEmail, resendLabel } from "@/lib/auth-ui";

describe("maskEmail", () => {
  it("mantém a 1ª letra e o domínio", () => {
    expect(maskEmail("coletivoaruatemvoz@gmail.com")).toBe("c***@gmail.com");
  });
  it("funciona com parte local curta", () => {
    expect(maskEmail("ab@x.com")).toBe("a***@x.com");
    expect(maskEmail("a@x.com")).toBe("a***@x.com");
  });
  it("ignora espaços nas pontas", () => {
    expect(maskEmail("  maria@clinica.med.br ")).toBe("m***@clinica.med.br");
  });
  it("não quebra com entrada inválida (devolve como veio)", () => {
    expect(maskEmail("sem-arroba")).toBe("sem-arroba");
    expect(maskEmail("@semlocal.com")).toBe("@semlocal.com");
    expect(maskEmail("semdominio@")).toBe("semdominio@");
    expect(maskEmail("")).toBe("");
  });
});

describe("resendLabel", () => {
  it("mostra a contagem enquanto espera e o rótulo normal ao liberar", () => {
    expect(resendLabel(42)).toBe("Reenviar em 42 s");
    expect(resendLabel(0)).toBe("Reenviar e-mail");
  });
  it("a espera é de 1 minuto", () => {
    expect(RESEND_COOLDOWN_SECONDS).toBe(60);
  });
});
