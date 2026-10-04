import { describe, expect, it, vi } from "vitest";
import {
  OUTBOX_TTL_MS,
  clearOutbox,
  deliverWithRetry,
  loadOutbox,
  outboxKey,
  saveOutbox,
} from "@/lib/submit-outbox";

function fakeStorage(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    _m: m,
  };
}

describe("outbox de triagem com risco", () => {
  it("guarda e recupera a entrada pendente", () => {
    const s = fakeStorage();
    saveOutbox(s, "saraiva", { submission_id: "a", payload: { x: 1 }, created_at: 1000 });
    expect(loadOutbox(s, "saraiva", 2000)).toEqual({
      submission_id: "a",
      payload: { x: 1 },
      created_at: 1000,
    });
  });

  it("isola por clínica (slug)", () => {
    const s = fakeStorage();
    saveOutbox(s, "saraiva", { submission_id: "a", payload: 1, created_at: 1 });
    expect(loadOutbox(s, "lumina", 2)).toBeNull();
  });

  it("descarta e apaga entrada vencida (PHI não fica para sempre)", () => {
    const s = fakeStorage();
    saveOutbox(s, "saraiva", { submission_id: "a", payload: 1, created_at: 0 });
    expect(loadOutbox(s, "saraiva", OUTBOX_TTL_MS + 1)).toBeNull();
    expect(s._m.has(outboxKey("saraiva"))).toBe(false);
  });

  it("descarta e apaga JSON corrompido", () => {
    const s = fakeStorage({ [outboxKey("saraiva")]: "{não é json" });
    expect(loadOutbox(s, "saraiva")).toBeNull();
    expect(s._m.has(outboxKey("saraiva"))).toBe(false);
  });

  it("descarta entrada sem campos obrigatórios", () => {
    const s = fakeStorage({ [outboxKey("saraiva")]: JSON.stringify({ payload: 1 }) });
    expect(loadOutbox(s, "saraiva")).toBeNull();
  });

  it("clearOutbox remove a entrada", () => {
    const s = fakeStorage();
    saveOutbox(s, "saraiva", { submission_id: "a", payload: 1, created_at: 1 });
    clearOutbox(s, "saraiva");
    expect(loadOutbox(s, "saraiva", 2)).toBeNull();
  });

  it("saveOutbox não lança quando o armazenamento recusa (cota/modo privado)", () => {
    const s = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceeded");
      },
      removeItem: () => {},
    };
    expect(saveOutbox(s, "saraiva", { submission_id: "a", payload: 1, created_at: 1 })).toBe(false);
  });
});

describe("deliverWithRetry", () => {
  const noSleep = (_ms: number) => Promise.resolve();

  it("sucesso na primeira tentativa não espera", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const sleep = vi.fn(noSleep);
    const r = await deliverWithRetry(send, { sleep });
    expect(r).toEqual({ ok: true, attempts: 1 });
    expect(sleep).not.toHaveBeenCalled();
  });

  it("recupera depois de falhas transitórias, respeitando o recuo", async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error("rede"))
      .mockRejectedValueOnce(new Error("rede"))
      .mockResolvedValueOnce(undefined);
    const sleep = vi.fn(noSleep);
    const r = await deliverWithRetry(send, { delays: [10, 20, 30], sleep });
    expect(r).toEqual({ ok: true, attempts: 3 });
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([10, 20]);
  });

  it("desiste depois de esgotar as tentativas e devolve o último erro", async () => {
    const send = vi.fn().mockRejectedValue(new Error("fora do ar"));
    const r = await deliverWithRetry(send, { delays: [1, 1], sleep: noSleep });
    expect(r.ok).toBe(false);
    expect(r.attempts).toBe(3);
    expect((r as { error: Error }).error.message).toBe("fora do ar");
  });

  it("avisa a cada falha (onFailure) para a UI reagir já na primeira", async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error("rede")).mockResolvedValueOnce(undefined);
    const onFailure = vi.fn();
    const r = await deliverWithRetry(send, { delays: [1], sleep: noSleep, onFailure });
    expect(r.ok).toBe(true);
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onFailure.mock.calls[0][0]).toBe(1);
  });

  it("para quando cancelado (tela desmontada)", async () => {
    let stop = false;
    const send = vi.fn().mockImplementation(async () => {
      stop = true;
      throw new Error("x");
    });
    const r = await deliverWithRetry(send, { delays: [1, 1, 1], sleep: noSleep, shouldStop: () => stop });
    expect(r.ok).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
