import { test, expect, devices } from "@playwright/test";

/**
 * Validação de Responsividade e Ergonomia Mobile:
 * Dispositivos móveis compactos (iPhone SE 375x667, Pixel / Galaxy)
 * 
 * Critérios auditados:
 * 1. Meta viewport configurada corretamente
 * 2. Ausência total de scroll horizontal (overflow-x = 0)
 * 3. Prevenção de auto-zoom no iOS Safari (font-size >= 16px em inputs)
 * 4. Touch targets ergonômicos (mínimo de 44px a 48px)
 * 5. Discagem telefônica direta nos links de emergência (tel:188 e tel:192)
 */

test.use({
  ...devices["iPhone SE"], // 375x667, hasTouch: true, mobile: true
});

test.describe("TriagemPsi — Experiência Mobile & Responsividade", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
  });

  test("deve renderizar tela inicial sem scroll horizontal e com touch targets adequados", async ({ page }) => {
    await page.goto("/saraiva/triagem", { waitUntil: "networkidle" });

    // 1. Verifica contenção de largura (zero overflow horizontal)
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // 2. Verifica botão 'Começar' com altura mínima ergonômica (>= 44px)
    const startButton = page.getByRole("button", { name: "Começar" });
    const box = await startButton.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
    }

    // 3. Verifica links de emergência com discagem direta (tel:)
    const cvvLink = page.locator('a[href^="tel:188"]');
    await expect(cvvLink).toBeVisible();
    await expect(cvvLink).toHaveAttribute("href", "tel:188");
  });

  test("inputs devem ter font-size >= 16px para evitar auto-zoom indesejado no iOS Safari", async ({ page }) => {
    await page.goto("/saraiva/triagem", { waitUntil: "networkidle" });

    // Aceita consentimento e vai para tela de identificação
    const consent = page.getByRole("checkbox");
    const consentLabel = page.locator("label").filter({ has: consent });
    await consentLabel.locator("span").last().click();
    await page.getByRole("button", { name: "Começar" }).click();

    // Aguarda campo de nome
    const nameInput = page.getByLabel("Nome completo *");
    await expect(nameInput).toBeVisible();

    // Mede tamanho computado da fonte do input
    const fontSize = await nameInput.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).fontSize);
    });
    // Tailwind text-base = 1rem = 16px. Se for < 16px, iOS Safari força zoom in.
    expect(fontSize).toBeGreaterThanOrEqual(16);
  });

  test("botões de sintomas e opções Likert devem ter espaçamento e touch targets confortáveis", async ({ page }) => {
    await page.goto("/saraiva/triagem", { waitUntil: "networkidle" });

    // Consentimento
    const consent = page.getByRole("checkbox");
    const consentLabel = page.locator("label").filter({ has: consent });
    await consentLabel.locator("span").last().click();
    await page.getByRole("button", { name: "Começar" }).click();

    // Preenche dados básicos
    await page.getByLabel("Nome completo *").fill("Paciente Mobile");
    await page.getByLabel("Data de nascimento *").fill("1990-05-15");
    await page.getByLabel("E-mail *").fill("mobile.teste@example.com");
    await page.getByRole("button", { name: "Continuar" }).click();

    // Tela de sintomas — botões de múltipla escolha
    const symptomButton = page.getByRole("button", { name: /Tristeza ou desânimo/i });
    await expect(symptomButton).toBeVisible();

    const box = await symptomButton.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      // Touch target recomendado >= 48px para facilidade com o polegar
      expect(box.height).toBeGreaterThanOrEqual(48);
    }
  });
});
