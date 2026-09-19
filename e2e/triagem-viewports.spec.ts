import { test, expect } from "@playwright/test";

/**
 * Matriz de Validação Multi-Viewport do TriagemPsi:
 * 1. Mobile Compacto (375x667: iPhone SE / Android Compacto)
 * 2. Mobile Padrão (412x915: Pixel 7 / iPhone 15 Pro)
 * 3. Tablet Portrait (768x1024: iPad Mini / iPad 10th gen)
 * 4. Tablet Landscape (1024x768: iPad Pro 11 / Galaxy Tab)
 * 5. Desktop (1280x900 a 1920x1080: Telas de Consultório e Monitores)
 */

test.describe("TriagemPsi — Matriz Completa de Viewports & Responsividade", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
  });

  test("deve garantir contenção de largura e ausência total de scroll horizontal (overflow-x: 0)", async ({ page }) => {
    await page.goto("/saraiva/triagem", { waitUntil: "networkidle" });

    // Avalia no DOM se o scrollWidth excede o innerWidth (qualquer estouro lateral)
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Header contido dentro da largura da viewport
    const header = page.locator("header");
    await expect(header).toBeVisible();
    const headerBox = await header.boundingBox();
    const viewport = page.viewportSize();
    if (headerBox && viewport) {
      expect(headerBox.width).toBeLessThanOrEqual(viewport.width);
    }
  });

  test("ergonomia de botões de ação e aviso ético em todos os dispositivos", async ({ page }) => {
    await page.goto("/saraiva/triagem", { waitUntil: "networkidle" });

    // Botão Começar deve ter área confortável de clique/toque (>= 40px no base, >= 44px com padding)
    const startButton = page.getByRole("button", { name: "Começar" });
    await expect(startButton).toBeVisible();
    const box = await startButton.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(40);
    }

    // Aviso ético e telefones de emergência obrigatórios visíveis
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText("192 (SAMU)");
    await expect(footer).toContainText("188 (CVV)");
  });

  test("formulário de identificação: prevenção de zoom no iOS (font-size >= 16px) e adaptação de layout", async ({ page }) => {
    await page.goto("/saraiva/triagem", { waitUntil: "networkidle" });

    // Aceita LGPD e clica Começar
    const consent = page.getByRole("checkbox");
    const consentLabel = page.locator("label").filter({ has: consent });
    await consentLabel.locator("span").last().click();
    await page.getByRole("button", { name: "Começar" }).click();

    const nameInput = page.getByLabel("Nome completo do paciente *");
    await expect(nameInput).toBeVisible();

    const fontSize = await nameInput.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).fontSize);
    });

    // 1. No mobile (< 768px), font-size deve ser >= 16px para evitar auto-zoom indesejado no iOS Safari
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      expect(fontSize).toBeGreaterThanOrEqual(16);
    } else {
      expect(fontSize).toBeGreaterThanOrEqual(14);
    }

    // 2. Altura ergonômica de input (h-12 = 48px)
    const inputBBox = await nameInput.boundingBox();
    expect(inputBBox).not.toBeNull();
    if (inputBBox) {
      expect(inputBBox.height).toBeGreaterThanOrEqual(40);
    }

    // 3. Comportamento do grid de botões conforme viewport
    const continueBtn = page.getByRole("button", { name: "Continuar" });
    const backBtn = page.getByRole("button", { name: "Voltar" });
    const continueBox = await continueBtn.boundingBox();
    const backBox = await backBtn.boundingBox();

    if (viewport && continueBox && backBox) {
      if (viewport.width >= 640) {
        // Tablet / Desktop: botões dispostos na mesma linha horizontal
        expect(Math.abs(continueBox.y - backBox.y)).toBeLessThanOrEqual(20);
      } else {
        // Mobile: botões empilhados verticalmente (flex-col-reverse)
        expect(Math.abs(continueBox.y - backBox.y)).toBeGreaterThan(30);
      }
    }
  });

  test("seleção de sintomas: touch targets amplos (>= 48px) e leitura limpa em cards", async ({ page }) => {
    await page.goto("/saraiva/triagem", { waitUntil: "networkidle" });

    // Consentimento
    const consent = page.getByRole("checkbox");
    const consentLabel = page.locator("label").filter({ has: consent });
    await consentLabel.locator("span").last().click();
    await page.getByRole("button", { name: "Começar" }).click();

    // Dados básicos
    await page.getByLabel("Nome completo do paciente *").fill("Paciente Multi-Viewport");
    await page.getByLabel("Data de nascimento *").fill("1992-04-10");
    await page.getByLabel("E-mail *").fill("viewport.teste@example.com");
    await page.getByRole("button", { name: "Continuar" }).click();

    // Tela de sintomas — opções com touch target amplo
    const symptomBtn = page.getByRole("button", { name: /Triste, desanimado/i });
    await expect(symptomBtn).toBeVisible();

    const box = await symptomBtn.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      // min-h-14 (56px) para garantir facilidade de toque no celular e no tablet
      expect(box.height).toBeGreaterThanOrEqual(48);
    }

    // Clica no sintoma e verifica estado selecionado
    await symptomBtn.click();
    await expect(symptomBtn).toHaveClass(/border-primary/);
  });
});
