import { test, expect, type Page } from "@playwright/test";
import { mockAuthApi, signOut } from "./helpers";

/**
 * Feedback de uso real (06/10): ao pedir "Esqueci minha senha" a tela continuava com
 * e-mail+senha e a confirmação aparecia e sumia numa linha de texto — a pessoa clicava
 * de novo e recebia e-mails duplicados. A recuperação agora é uma tela própria e a
 * confirmação FICA até a pessoa agir.
 */
async function mockReset(page: Page) {
  const state = { pedidos: 0 };
  await page.route(
    (url) => /_serverFn|serverFn/.test(url.pathname + url.search),
    (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      state.pedidos++;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ result: { ok: true } }),
      });
    },
  );
  return state;
}

for (const rota of ["/auth", "/entrar"]) {
  test.describe(`Recuperar senha em ${rota}`, () => {
    test("tela própria, sem campo de senha; confirmação permanece e trava o reenvio", async ({
      page,
    }) => {
      await mockAuthApi(page);
      const estado = await mockReset(page);
      await signOut(page);
      await page.goto(rota, { waitUntil: "networkidle" });

      await page.getByLabel("E-mail").fill("coletivoaruatemvoz@gmail.com");
      await page.getByRole("button", { name: /Esqueci minha senha/ }).click();

      // Tela de recuperação: só e-mail, nada de senha.
      await expect(page.getByRole("heading", { name: "Recuperar acesso" })).toBeVisible();
      await expect(page.getByLabel("Senha", { exact: true })).toHaveCount(0);

      await page.getByRole("button", { name: "Enviar link de acesso" }).click();

      // Confirmação persistente, com e-mail mascarado e orientações.
      const titulo = page.getByRole("heading", { name: "Verifique seu e-mail" });
      await expect(titulo).toBeVisible();
      await expect(page.getByText("c***@gmail.com")).toBeVisible();
      await expect(page.getByText(/spam/i)).toBeVisible();
      await expect(page.getByText(/60 minutos/)).toBeVisible();

      // Não some sozinha.
      await page.waitForTimeout(2500);
      await expect(titulo).toBeVisible();

      // Reenvio bloqueado durante a espera (evita e-mail duplicado).
      const reenviar = page.getByRole("button", { name: /Reenviar em \d+ s/ });
      await expect(reenviar).toBeDisabled();
      expect(estado.pedidos).toBe(1);
    });

    test("voltar ao login restaura o formulário", async ({ page }) => {
      await mockAuthApi(page);
      await mockReset(page);
      await signOut(page);
      await page.goto(rota, { waitUntil: "networkidle" });

      await page.getByRole("button", { name: /Esqueci minha senha/ }).click();
      await page.getByRole("button", { name: "Voltar ao login" }).click();

      await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Recuperar acesso" })).toHaveCount(0);
    });
  });
}
