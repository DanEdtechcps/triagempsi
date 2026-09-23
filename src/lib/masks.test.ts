import { describe, expect, it } from "vitest";
import { formatDateBR, isValidEmail, isValidPhoneBR, maskPhoneBR, onlyDigits } from "./masks";

describe("masks e validações", () => {
  it("onlyDigits remove caracteres especiais", () => {
    expect(onlyDigits("(11) 98765-4321")).toBe("11987654321");
    expect(onlyDigits(null)).toBe("");
    expect(onlyDigits("abc")).toBe("");
  });

  it("maskPhoneBR formata número fixo e celular dinamicamente", () => {
    expect(maskPhoneBR("11")).toBe("(11");
    expect(maskPhoneBR("119")).toBe("(11) 9");
    expect(maskPhoneBR("1133334444")).toBe("(11) 3333-4444");
    expect(maskPhoneBR("11987654321")).toBe("(11) 98765-4321");
    expect(maskPhoneBR("+5511987654321")).toBe("(11) 98765-4321");
    expect(maskPhoneBR("5511987654321")).toBe("(11) 98765-4321");
  });

  it("isValidPhoneBR valida telefones brasileiros reais", () => {
    expect(isValidPhoneBR("", false)).toBe(true);
    expect(isValidPhoneBR("", true)).toBe(false);
    expect(isValidPhoneBR("(11) 98765-4321")).toBe(true);
    expect(isValidPhoneBR("(21) 3333-4444")).toBe(true);
    expect(isValidPhoneBR("(00) 98765-4321")).toBe(false); // DDD inválido
    expect(isValidPhoneBR("(11) 88765-4321")).toBe(false); // Celular sem 9 inicial
    expect(isValidPhoneBR("123")).toBe(false);
  });

  it("isValidEmail valida formato de e-mail", () => {
    expect(isValidEmail("usuario@clinica.com")).toBe(true);
    expect(isValidEmail("dr.saraiva@medico.com.br")).toBe(true);
    expect(isValidEmail("usuario@")).toBe(false);
    expect(isValidEmail("usuario@clinica")).toBe(false);
    expect(isValidEmail("  ")).toBe(false);
  });

  it("formatDateBR formata AAAA-MM-DD sem alterar o dia por fuso horário", () => {
    expect(formatDateBR("1995-10-25")).toBe("25/10/1995");
    expect(formatDateBR("2000-01-01")).toBe("01/01/2000");
    expect(formatDateBR(null)).toBe("—");
  });
});
