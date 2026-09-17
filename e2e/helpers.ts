import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

/** Lê VITE_SUPABASE_URL do .env para derivar a chave de sessão do navegador. */
function supabaseUrl(): string {
  try {
    const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
    const line = env.split("\n").find((l) => l.startsWith("VITE_SUPABASE_URL="));
    if (line) return line.split("=").slice(1).join("=").trim().replace(/^"|"$/g, "");
  } catch {
    /* ignora */
  }
  return process.env.VITE_SUPABASE_URL ?? "https://example.supabase.co";
}

export const SUPABASE_URL = supabaseUrl();
export const PROJECT_REF = new URL(SUPABASE_URL).hostname.split(".")[0];
export const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

export const TEST_EMAIL = "profissional.e2e@example.com";

function fakeJwt(expiresIn = 3600) {
  const payload = {
    sub: "00000000-0000-4000-8000-000000000001",
    email: TEST_EMAIL,
    role: "authenticated",
    aud: "authenticated",
    exp: Math.floor(Date.now() / 1000) + expiresIn,
  };
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.signature`;
}

export function fakeSession() {
  return {
    access_token: fakeJwt(),
    refresh_token: "fake-refresh-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: "00000000-0000-4000-8000-000000000001",
      aud: "authenticated",
      role: "authenticated",
      email: TEST_EMAIL,
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };
}

type AuthMockOptions = {
  /** Resposta do PUT /auth/v1/user (troca de senha). */
  updateUser?: { status: number; body: Record<string, unknown> };
  /** Resposta do POST /auth/v1/token (reautenticação com a senha atual). */
  signIn?: { status: number; body: Record<string, unknown> };
  /** Resposta do POST /auth/v1/recover (reenvio do link). */
  recover?: { status: number; body: Record<string, unknown> };
};

/**
 * Intercepta a API de autenticação para que os testes rodem de forma
 * determinística, sem depender de e-mails reais ou do backend.
 */
export async function mockAuthApi(page: Page, options: AuthMockOptions = {}) {
  const session = fakeSession();

  await page.route("**/auth/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const json = (status: number, body: unknown) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });

    if (url.pathname.endsWith("/user") && method === "PUT") {
      const r = options.updateUser ?? { status: 200, body: session.user };
      return json(r.status, r.body);
    }
    if (url.pathname.endsWith("/user") && method === "GET") {
      return json(200, session.user);
    }
    if (url.pathname.endsWith("/token")) {
      const r = options.signIn ?? { status: 200, body: session };
      return json(r.status, r.body);
    }
    if (url.pathname.endsWith("/recover")) {
      const r = options.recover ?? { status: 200, body: {} };
      return json(r.status, r.body);
    }
    return json(200, {});
  });

  return session;
}

/** Injeta uma sessão válida no navegador (equivalente a estar logado). */
export async function signInAs(page: Page, session = fakeSession()) {
  await page.goto("/");
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key!, value!),
    [STORAGE_KEY, JSON.stringify(session)],
  );
}

/** Garante que não há sessão no navegador. */
export async function signOut(page: Page) {
  await page.goto("/");
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
}
