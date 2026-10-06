import { describe, expect, it } from "vitest";
import {
  ALLOWED_VARIABLES,
  AUTH_EMAIL_KEYS,
  AUTH_EMAILS,
  NOTIFICATIONS_TO_ENABLE,
  SMTP_LIMITS,
  authConfigPayload,
  renderAuthEmail,
} from "@/lib/supabase-auth-emails";
import { BRAND, escapeHtml, renderEmail } from "@/lib/email-layout";

describe("modelo visual (renderEmail)", () => {
  const { html, text } = renderEmail({
    preheader: "Pré-visualização",
    title: "Olá <mundo> & cia",
    paragraphs: ["Texto com **negrito** e <b>tag</b>."],
    button: { label: "Abrir", href: "https://psiqway.com.br/x?a=1&b=2" },
    notes: ["Nota 1", "Nota **2**"],
    footnote: "Rodapé",
  });
  it("escapa HTML do conteúdo (sem injeção)", () => {
    expect(html).toContain("Olá &lt;mundo&gt; &amp; cia");
    expect(html).not.toContain("<b>tag</b>");
    expect(html).toContain("<strong>negrito</strong>");
  });
  it("tem pré-visualização oculta, idioma pt-BR, marca e rodapé de privacidade", () => {
    expect(html).toContain('lang="pt-BR"');
    expect(html).toContain("Pré-visualização");
    expect(html).toContain(BRAND.nome);
    expect(html).toMatch(/Nunca pedimos sua senha/);
  });
  it("botão traz o endereço escapado e um link de reserva em texto", () => {
    expect(html).toContain("https://psiqway.com.br/x?a=1&amp;b=2");
    expect(html).toContain("Se o botão não abrir");
  });
  it("versão em texto não carrega a marcação **", () => {
    expect(text).not.toContain("**");
    expect(text).toContain("Abrir: https://psiqway.com.br/x?a=1&b=2");
  });
  it("tom de risco usa o vermelho da marca", () => {
    const r = renderEmail({ preheader: "p", title: "t", paragraphs: ["x"], tone: "risk" });
    expect(r.html).toContain(BRAND.corRisco);
  });
  it("escapeHtml cobre aspas", () => {
    expect(escapeHtml('a"b')).toBe("a&quot;b");
  });
});

describe("os 13 e-mails do Supabase Auth", () => {
  it("existem todos os modelos esperados", () => {
    expect(AUTH_EMAIL_KEYS).toHaveLength(13);
    for (const k of AUTH_EMAIL_KEYS) expect(AUTH_EMAILS[k]).toBeDefined();
  });

  it("só usam variáveis que o Supabase documenta", () => {
    for (const k of AUTH_EMAIL_KEYS) {
      const { html } = renderAuthEmail(k);
      for (const m of html.matchAll(/\{\{\s*\.([A-Za-z]+)\s*\}\}/g)) {
        expect(ALLOWED_VARIABLES as readonly string[], `${k}: {{ .${m[1]} }}`).toContain(m[1]);
      }
    }
  });

  it("todos estão em português e levam a marca no assunto", () => {
    for (const k of AUTH_EMAIL_KEYS) {
      const { subject, html } = renderAuthEmail(k);
      expect(subject, k).toMatch(/— TriagemPsi$/);
      expect(html, k).toContain('lang="pt-BR"');
      expect(html, k).not.toMatch(/Confirm your|Reset your|Follow this link|Supabase/i);
    }
  });

  it("e-mails com ação usam o link do Supabase; avisos de segurança não têm botão", () => {
    for (const k of ["confirmation", "invite", "magic_link", "email_change", "recovery"] as const) {
      expect(renderAuthEmail(k).html, k).toContain("{{ .ConfirmationURL }}");
    }
    expect(renderAuthEmail("password_changed_notification").html).not.toContain("ConfirmationURL");
    expect(renderAuthEmail("reauthentication").html).toContain("{{ .Token }}");
  });

  it("avisos de segurança orientam o que fazer se não foi a pessoa", () => {
    for (const k of AUTH_EMAIL_KEYS.filter((x) => x.endsWith("_notification"))) {
      expect(renderAuthEmail(k).html, k).toContain("Não foi você?");
    }
  });

  it("o payload da API segue os nomes de campo da documentação", () => {
    const p = authConfigPayload();
    for (const k of AUTH_EMAIL_KEYS) {
      expect(typeof p[`mailer_subjects_${k}`]).toBe("string");
      expect(String(p[`mailer_templates_${k}_content`])).toContain("<!doctype html>");
    }
    for (const f of NOTIFICATIONS_TO_ENABLE) expect(p[f]).toBe(true);
    expect(Object.keys(p).filter((x) => x.startsWith("mailer_templates_"))).toHaveLength(13);
  });

  it("os limites de envio não ficam em 0 (sem intervalo = rajada de e-mails para a caixa de outra pessoa)", () => {
    expect(SMTP_LIMITS.smtp_max_frequency).toBeGreaterThanOrEqual(60);
    expect(SMTP_LIMITS.rate_limit_email_sent).toBeGreaterThan(0);
    expect(SMTP_LIMITS.rate_limit_email_sent).toBeLessThanOrEqual(200);
  });
});
