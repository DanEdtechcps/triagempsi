import { describe, expect, it } from "vitest";
import {
  RESET_LINK_VALIDITY_MINUTES,
  buildPasswordResetEmail,
  buildResetLink,
  deriveAccessSender,
} from "@/lib/auth-email";

describe("buildResetLink", () => {
  it("aponta para o NOSSO site, sem barra duplicada, com o token codificado", () => {
    expect(buildResetLink("https://psiqway.com.br/", "abc/def+ghi")).toBe(
      "https://psiqway.com.br/reset-password?token_hash=abc%2Fdef%2Bghi&type=recovery",
    );
  });
  it("não contém o domínio do Supabase", () => {
    expect(buildResetLink("https://psiqway.com.br", "t")).not.toContain("supabase");
  });
});

describe("buildPasswordResetEmail", () => {
  const link = "https://psiqway.com.br/reset-password?token_hash=x&type=recovery";
  const mail = buildPasswordResetEmail({ link });

  it("está em português e fala a validade", () => {
    expect(mail.subject).toBe("Redefinir sua senha — Psiqway");
    expect(mail.text).toContain("Recebemos um pedido");
    expect(mail.text).toContain(`${RESET_LINK_VALIDITY_MINUTES} minutos`);
    expect(mail.html).toContain('lang="pt-BR"');
  });
  it("traz o link no texto e no HTML", () => {
    expect(mail.text).toContain(link);
    expect(mail.html).toContain("Criar nova senha");
  });
  it("não tem nada em inglês do modelo padrão do Supabase", () => {
    expect(`${mail.subject} ${mail.text} ${mail.html}`).not.toMatch(/reset your password|follow this link|supabase/i);
  });
  it("escapa HTML no link (sem injeção)", () => {
    const m = buildPasswordResetEmail({ link: 'https://x.com/"><script>alert(1)</script>' });
    expect(m.html).not.toContain("<script>");
  });
  it("avisa que pode ignorar se não pediu", () => {
    expect(mail.text).toMatch(/pode ignorar/);
  });
});

describe("deriveAccessSender", () => {
  it("troca só a parte local mantendo o domínio verificado", () => {
    expect(deriveAccessSender("Psiqway <alertas@mail.psiqway.com.br>")).toBe(
      "Psiqway <acesso@mail.psiqway.com.br>",
    );
  });
  it("aceita endereço puro", () => {
    expect(deriveAccessSender("alertas@mail.psiqway.com.br")).toBe(
      "Psiqway <acesso@mail.psiqway.com.br>",
    );
  });
  it("sem remetente configurado ou inválido → null", () => {
    expect(deriveAccessSender(undefined)).toBeNull();
    expect(deriveAccessSender("")).toBeNull();
    expect(deriveAccessSender("não é e-mail")).toBeNull();
  });
});
