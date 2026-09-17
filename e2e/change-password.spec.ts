import { test, expect } from "@playwright/test";
import { mockAuthApi, signInAs } from "./helpers";

test.describe("Troca de senha com o usuário logado", () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page);
  });

  test("senha nova fraca é bloqueada antes de chamar o servidor", async ({ page }) => {
    await mockAuthApi(page);
    await page.goto("/senha");

    await page.getByLabel("Senha atual").fill("Cuidado2026!Atual");
    await page.getByLabel("Nova senha", { exact: true }).fill("abcdefgh");
    await page.getByLabel("Confirmar nova senha").fill("abcdefgh");
    await page.getByRole("button", { name: "Salvar nova senha" }).click();

    await expect(page.getByText(/Inclua ao menos|Requisito pendente/i)).toBeVisible();
  });

  test("confirmação divergente mostra erro imediato", async ({ page }) => {
    await mockAuthApi(page);
    await page.goto("/senha");

    await page.getByLabel("Nova senha", { exact: true }).fill("Cuidado2026!Forte");
    await page.getByLabel("Confirmar nova senha").fill("Cuidado2026!Diferente");

    await expect(page.getByText("As senhas não coincidem.")).toBeVisible();
  });

  test("senha atual incorreta impede a troca", async ({ page }) => {
    await mockAuthApi(page, {
      signIn: {
        status: 400,
        body: { error: "invalid_grant", error_description: "Invalid login credentials" },
      },
    });
    await page.goto("/senha");

    await page.getByLabel("Senha atual").fill("SenhaErrada!1");
    await page.getByLabel("Nova senha", { exact: true }).fill("Cuidado2026!Forte");
    await page.getByLabel("Confirmar nova senha").fill("Cuidado2026!Forte");
    await page.getByRole("button", { name: "Salvar nova senha" }).click();

    await expect(page.getByText("Senha atual incorreta.")).toBeVisible();
  });

  test("nova senha igual à atual é recusada", async ({ page }) => {
    await mockAuthApi(page);
    await page.goto("/senha");

    const igual = "Cuidado2026!Forte";
    await page.getByLabel("Senha atual").fill(igual);
    await page.getByLabel("Nova senha", { exact: true }).fill(igual);
    await page.getByLabel("Confirmar nova senha").fill(igual);
    await page.getByRole("button", { name: "Salvar nova senha" }).click();

    await expect(
      page.getByText("A nova senha precisa ser diferente da atual."),
    ).toBeVisible();
  });

  test("troca válida confirma sucesso e limpa o formulário", async ({ page }) => {
    await mockAuthApi(page);
    await page.goto("/senha");

    await page.getByLabel("Senha atual").fill("Cuidado2026!Atual");
    await page.getByLabel("Nova senha", { exact: true }).fill("Cuidado2026!Nova");
    await page.getByLabel("Confirmar nova senha").fill("Cuidado2026!Nova");
    await page.getByRole("button", { name: "Salvar nova senha" }).click();

    await expect(page.getByText("Senha alterada com sucesso.")).toBeVisible();
    await expect(page.getByLabel("Senha atual")).toHaveValue("");
  });
});
