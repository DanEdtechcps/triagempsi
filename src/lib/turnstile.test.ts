import { describe, expect, it, vi } from "vitest";
import { TURNSTILE_VERIFY_URL, verifyTurnstileToken } from "@/lib/turnstile";

const ok = (json: unknown, status = 200) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(json), { status }));

describe("verifyTurnstileToken", () => {
  it("sem segredo → nao_configurado (não chama a rede)", async () => {
    const f = ok({ success: true });
    expect(await verifyTurnstileToken({ token: "t", ip: null, secret: undefined, fetchImpl: f })).toBe(
      "nao_configurado",
    );
    expect(f).not.toHaveBeenCalled();
  });

  it("com segredo e sem token → ausente (não chama a rede)", async () => {
    const f = ok({ success: true });
    expect(await verifyTurnstileToken({ token: "  ", ip: null, secret: "s", fetchImpl: f })).toBe(
      "ausente",
    );
    expect(f).not.toHaveBeenCalled();
  });

  it("success=true → ok, enviando segredo, token e IP", async () => {
    const f = ok({ success: true });
    expect(
      await verifyTurnstileToken({ token: "tok", ip: "203.0.113.9", secret: "sec", fetchImpl: f }),
    ).toBe("ok");
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(TURNSTILE_VERIFY_URL);
    const body = init.body as URLSearchParams;
    expect(body.get("secret")).toBe("sec");
    expect(body.get("response")).toBe("tok");
    expect(body.get("remoteip")).toBe("203.0.113.9");
  });

  it("success=false → invalida", async () => {
    expect(
      await verifyTurnstileToken({
        token: "x",
        ip: null,
        secret: "s",
        fetchImpl: ok({ success: false, "error-codes": ["invalid-input-response"] }),
      }),
    ).toBe("invalida");
  });

  it("serviço do Cloudflare com erro HTTP → não pune o paciente (nao_configurado)", async () => {
    expect(
      await verifyTurnstileToken({ token: "x", ip: null, secret: "s", fetchImpl: ok({}, 500) }),
    ).toBe("nao_configurado");
  });

  it("falha de rede ao verificar → não pune o paciente (nao_configurado)", async () => {
    const f = vi.fn().mockRejectedValue(new Error("rede"));
    expect(await verifyTurnstileToken({ token: "x", ip: null, secret: "s", fetchImpl: f })).toBe(
      "nao_configurado",
    );
  });
});
