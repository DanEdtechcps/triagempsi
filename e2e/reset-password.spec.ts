import { test, expect } from "@playwright/test";
import { mockAuthApi, signInAs, signOut } from "./helpers";

test.describe("Redefinição de senha por e-mail", () => {
  test("link expirado mostra mensagem específica e formulário de reenvio", async ({ page }) => {
    await mockAuthApi(page);
    await signOut(page);
    await page.goto(
      "/reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
    );

    await expect(page.getByText("Este link de redefinição expirou.")).toBeVisible();
    await expect(page.getByLabel("Seu e-mail")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Definir nova senha" })).toBeVisible();
    // Sem link válido, o formulário de nova senha não deve aparecer.
    await expect(page.getByLabel("Nova senha")).toHaveCount(0);
  });

  test("link inválido/já utilizado mostra aviso de uso único", async ({ page }) => {
    await mockAuthApi(page);
    await signOut(page);
    await page.goto("/reset-password#error=access_denied&error_code=bad_oauth_state");

    await expect(page.getByText("Link inválido ou já utilizado.")).toBeVisible();
    await expect(page.getByLabel("Nova senha")).toHaveCount(0);
  });

  test("sem sessão de recuperação o formulário fica bloqueado", async ({ page }) => {
    await mockAuthApi(page);
    await signOut(page);
    await page.goto("/reset-password");

    await expect(page.getByText(/Link inválido ou expirado/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar novo link" })).toBeVisible();
  });

  test("reenvio do link confirma envio sem revelar se o e-mail existe", async ({ page }) => {
    await mockAuthApi(page);
    await signOut(page);
    await page.goto("/reset-password#error_code=otp_expired");

    await page.getByLabel("Seu e-mail").fill("alguem@example.com");
    await page.getByRole("button", { name: "Enviar novo link" }).click();

    await expect(page.getByText(/Se este e-mail estiver cadastrado/i)).toBeVisible();
  });

  test("link de recuperação em qualquer rota redireciona para /reset-password", async ({
    page,
  }) => {
    await mockAuthApi(page);
    await signOut(page);
    await page.goto("/#access_token=abc&type=recovery");

    await page.waitForURL(/\/reset-password/);
    expect(page.url()).toContain("type=recovery");
  });

  test("com sessão válida, senha fraca é bloqueada e senha forte é salva", async ({ page }) => {
    await mockAuthApi(page);
    await signInAs(page);
    await page.goto("/reset-password");

    const nova = page.getByLabel("Nova senha", { exact: true });
    await expect(nova).toBeVisible();

    // Senha fraca: validação local impede o envio.
    await nova.fill("senha123");
    await page.getByLabel("Confirmar nova senha").fill("senha123");
    await page.getByRole("button", { name: "Salvar nova senha" }).click();
    await expect(page.getByText(/Inclua ao menos|Requisito pendente/i)).toBeVisible();

    // Senhas diferentes.
    await nova.fill("Cuidado2026!Forte");
    await page.getByLabel("Confirmar nova senha").fill("Cuidado2026!Outra");
    await expect(page.getByText("As senhas não coincidem.")).toBeVisible();

    // Senha válida.
    await page.getByLabel("Confirmar nova senha").fill("Cuidado2026!Forte");
    await page.getByRole("button", { name: "Salvar nova senha" }).click();
    await expect(page.getByText(/Senha alterada com sucesso/i)).toBeVisible();
  });

  test("token expirado no momento de salvar cai no fluxo de novo link", async ({ page }) => {
    await mockAuthApi(page, {
      updateUser: {
        status: 401,
        body: { code: 401, message: "Auth session missing or expired" },
      },
    });
    await signInAs(page);
    await page.goto("/reset-password");

    await page.getByLabel("Nova senha", { exact: true }).fill("Cuidado2026!Forte");
    await page.getByLabel("Confirmar nova senha").fill("Cuidado2026!Forte");
    await page.getByRole("button", { name: "Salvar nova senha" }).click();

    await expect(page.getByText(/expirou ou já foi usado/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar novo link" })).toBeVisible();
  });
});
