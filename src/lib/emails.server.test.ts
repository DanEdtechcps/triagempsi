import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendRenderedEmail, senderDomain } from "@/lib/emails.server";

const BASE = { subject: "Assunto", html: "<p>oi</p>", text: "oi" };
const ENV_KEYS = ["RESEND_API_KEY", "RISK_ALERT_FROM"] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  process.env["RESEND_API_KEY"] = "re_teste";
  process.env["RISK_ALERT_FROM"] = "Psiqway <alertas@mail.psiqway.com.br>";
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.unstubAllGlobals();
});

function stubFetch(res: Response) {
  const f = vi.fn().mockResolvedValue(res);
  vi.stubGlobal("fetch", f);
  return f;
}
const lastCall = (f: ReturnType<typeof vi.fn>) => {
  const [url, init] = f.mock.calls[0] as [string, RequestInit];
  return {
    url,
    init,
    body: JSON.parse(init.body as string),
    headers: init.headers as Record<string, string>,
  };
};

describe("senderDomain", () => {
  it("só existe quando há chave E remetente", () => {
    expect(senderDomain()).toBe("mail.psiqway.com.br");
    delete process.env["RESEND_API_KEY"];
    expect(senderDomain()).toBeNull();
  });
});

describe("sendRenderedEmail (Resend)", () => {
  it("sem chave ou remetente → falha clara, sem tocar na rede", async () => {
    delete process.env["RESEND_API_KEY"];
    const f = stubFetch(new Response("{}"));
    const r = await sendRenderedEmail({ to: "a@x.com", ...BASE });
    expect(r).toMatchObject({ ok: false, code: "no_email_provider" });
    expect(f).not.toHaveBeenCalled();
  });

  it("envia com remetente da clínica, reply-to e idempotência", async () => {
    const f = stubFetch(new Response(JSON.stringify({ id: "msg_1" }), { status: 200 }));
    const r = await sendRenderedEmail({
      to: "paciente@x.com",
      ...BASE,
      fromName: "Saraiva Clínica de Psiquiatria",
      replyTo: "contato@clinica.med.br",
      idempotencyKey: "k-1",
      label: "resultados-paciente",
    });
    expect(r).toMatchObject({ ok: true, message_id: "msg_1" });
    const { url, body, headers } = lastCall(f);
    expect(url).toBe("https://api.resend.com/emails");
    expect(body.from).toBe("Saraiva Clínica de Psiquiatria <resultados@mail.psiqway.com.br>");
    expect(body.to).toEqual(["paciente@x.com"]);
    expect(body.reply_to).toBe("contato@clinica.med.br");
    expect(headers["Idempotency-Key"]).toBe("k-1");
    expect(headers["Authorization"]).toBe("Bearer re_teste");
  });

  it("sem nome de clínica, usa a marca da plataforma", async () => {
    const f = stubFetch(new Response(JSON.stringify({ id: "m" }), { status: 200 }));
    await sendRenderedEmail({ to: "a@x.com", ...BASE });
    expect(lastCall(f).body.from).toBe("Psiqway <resultados@mail.psiqway.com.br>");
  });

  it("recusa do provedor vira falha com código e motivo, sem expor a chave", async () => {
    stubFetch(
      new Response(
        JSON.stringify({ name: "validation_error", message: "domínio não verificado" }),
        {
          status: 403,
        },
      ),
    );
    const r = await sendRenderedEmail({ to: "a@x.com", ...BASE });
    expect(r).toMatchObject({
      ok: false,
      code: "validation_error",
      reason: "domínio não verificado",
    });
    expect(JSON.stringify(r)).not.toContain("re_teste");
  });

  it("falha de rede → falha 'network', nunca lança", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("rede")));
    expect(await sendRenderedEmail({ to: "a@x.com", ...BASE })).toMatchObject({
      ok: false,
      code: "network",
    });
  });
});
