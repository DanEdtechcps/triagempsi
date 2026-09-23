import { describe, it, expect } from "vitest";
import { applyEdgeSecurityHeaders } from "../server";
import { sanitizeLogOutput, describeError } from "./error-capture";

describe("Segurança de Borda — Cloudflare Edge Headers & PII Scrubbing", () => {
  it("injetar todos os cabeçalhos essenciais de segurança na borda (CSP, HSTS, XFO, nosniff)", () => {
    const rawResponse = new Response("<h1>Teste</h1>", {
      status: 200,
      headers: { "content-type": "text/html" },
    });

    const securedResponse = applyEdgeSecurityHeaders(rawResponse);

    expect(securedResponse.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(securedResponse.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(securedResponse.headers.get("Strict-Transport-Security")).toContain("max-age=31536000");
    expect(securedResponse.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(securedResponse.headers.get("Permissions-Policy")).toContain("camera=()");
    expect(securedResponse.headers.get("Content-Security-Policy")).toContain(
      "frame-ancestors 'self'",
    );
    expect(securedResponse.headers.get("Content-Security-Policy")).toContain(
      "https://ffyjjkouscnabyxjxexu.supabase.co",
    );
  });

  it("mascarar e-mails, telefones e CPFs com sanitizeLogOutput", () => {
    const rawLog =
      "Paciente joao.silva@exemplo.com.br com fone 5554999887766 e CPF 123.456.789-00 relatou crise";
    const cleaned = sanitizeLogOutput(rawLog);

    expect(cleaned).not.toContain("joao.silva@exemplo.com.br");
    expect(cleaned).toContain("[EMAIL_REDACTED]");
    expect(cleaned).not.toContain("5554999887766");
    expect(cleaned).toContain("[PHONE_REDACTED]");
    expect(cleaned).not.toContain("123.456.789-00");
    expect(cleaned).toContain("[CPF_REDACTED]");
  });

  it("mascarar tokens JWT Bearer e chaves secretas do Supabase", () => {
    const rawLog =
      "Falha de autenticação com Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgN e sb_secret_xyz123456789";
    const cleaned = sanitizeLogOutput(rawLog);

    expect(cleaned).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    expect(cleaned).toContain("Bearer [JWT_REDACTED]");
    expect(cleaned).not.toContain("sb_secret_xyz123456789");
    expect(cleaned).toContain("[SUPABASE_SECRET_REDACTED]");
  });

  it("describeError deve expurgar PII contido em mensagens de erro ou stacks", () => {
    const err = new Error(
      "Validação falhou para maria.oliveira@clinica.com com telefone (54) 98877-6655",
    );
    const serialized = describeError(err);

    expect(serialized).not.toContain("maria.oliveira@clinica.com");
    expect(serialized).toContain("[EMAIL_REDACTED]");
    expect(serialized).not.toContain("98877-6655");
    expect(serialized).toContain("[PHONE_REDACTED]");
  });
});
