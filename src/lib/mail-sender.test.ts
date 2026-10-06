import { describe, expect, it } from "vitest";
import { PLATFORM_NAME, buildFrom, parseSender, senderDomainOf } from "@/lib/mail-sender";

describe("parseSender", () => {
  it("lê 'Nome <a@dominio>'", () => {
    expect(parseSender("Psiqway <alertas@mail.psiqway.com.br>")).toEqual({
      name: "Psiqway",
      domain: "mail.psiqway.com.br",
    });
  });
  it("lê endereço puro e normaliza o domínio", () => {
    expect(parseSender("alertas@Mail.Psiqway.com.br")).toEqual({
      name: null,
      domain: "mail.psiqway.com.br",
    });
  });
  it("inválido ou vazio → null", () => {
    expect(parseSender("")).toBeNull();
    expect(parseSender(undefined)).toBeNull();
    expect(parseSender("sem-arroba")).toBeNull();
  });
});

describe("buildFrom", () => {
  const base = "Psiqway <alertas@mail.psiqway.com.br>";
  it("troca só a parte local mantendo o domínio verificado", () => {
    expect(buildFrom(base, "acesso")).toBe("Psiqway <acesso@mail.psiqway.com.br>");
  });
  it("usa o nome da clínica quando white-label", () => {
    expect(buildFrom(base, "resultados", "Saraiva Clínica de Psiquiatria")).toBe(
      "Saraiva Clínica de Psiquiatria <resultados@mail.psiqway.com.br>",
    );
  });
  it("nome padrão é a plataforma quando a base não tem nome", () => {
    expect(buildFrom("alertas@mail.psiqway.com.br", "acesso")).toBe(
      `${PLATFORM_NAME} <acesso@mail.psiqway.com.br>`,
    );
  });
  it("sanitiza o nome exibido (sem quebrar o cabeçalho)", () => {
    const f = buildFrom(base, "resultados", 'Clínica "X" <hack@evil.com>\n');
    expect(f).toBe("Clínica X hack@evil.com <resultados@mail.psiqway.com.br>");
    expect(f).not.toMatch(/[\n"]/);
  });
  it("sem base válida → null", () => {
    expect(buildFrom(undefined, "acesso")).toBeNull();
  });
  it("senderDomainOf devolve só o domínio", () => {
    expect(senderDomainOf(base)).toBe("mail.psiqway.com.br");
  });
});
