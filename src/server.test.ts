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

  it("libera o Google Drive em quadros só no Estúdio de validação", () => {
    process.env.SUPABASE_URL = "https://exemplo.supabase.co";
    const frameSrc = (path: string) =>
      /frame-src ([^;]*);/.exec(
        applyEdgeSecurityHeaders(new Response("ok"), path).headers.get("Content-Security-Policy") ??
          "",
      )?.[1] ?? "";

    expect(frameSrc("/revisao/estudio")).toContain("https://drive.google.com");
    expect(frameSrc("/revisao/estudio")).toContain("https://challenges.cloudflare.com");
    for (const outra of ["/", "/painel", "/revisao", "/revisao/estudio/outra", "/entrar"]) {
      expect(frameSrc(outra)).not.toContain("drive.google.com");
    }
    expect(frameSrc("")).not.toContain("drive.google.com");
  });
});
