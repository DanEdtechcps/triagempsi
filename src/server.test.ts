import { describe, expect, it, afterEach } from "vitest";
import { applyEdgeSecurityHeaders } from "./server";

// Achado #23 da auditoria: a CSP tinha o host do Supabase hardcoded (ficaria
// apontando pro projeto errado numa migração silenciosa) e 'unsafe-eval' em
// script-src sem necessidade real no build de produção.
describe("applyEdgeSecurityHeaders", () => {
  const originalUrl = process.env.SUPABASE_URL;
  const originalViteUrl = process.env.VITE_SUPABASE_URL;

  afterEach(() => {
    process.env.SUPABASE_URL = originalUrl;
    process.env.VITE_SUPABASE_URL = originalViteUrl;
  });

  it("usa o host do Supabase configurado via env, não um valor fixo no código", () => {
    process.env.SUPABASE_URL = "https://exemplo-diferente.supabase.co";
    delete process.env.VITE_SUPABASE_URL;

    const response = applyEdgeSecurityHeaders(new Response("ok"));
    const csp = response.headers.get("Content-Security-Policy") ?? "";

    expect(csp).toContain("https://exemplo-diferente.supabase.co");
    expect(csp).not.toContain("ffyjjkouscnabyxjxexu");
  });

  it("não inclui 'unsafe-eval' em script-src", () => {
    process.env.SUPABASE_URL = "https://exemplo.supabase.co";

    const response = applyEdgeSecurityHeaders(new Response("ok"));
    const csp = response.headers.get("Content-Security-Policy") ?? "";

    expect(csp).not.toContain("unsafe-eval");
  });
});
