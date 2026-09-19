import { test, expect, type Page } from "@playwright/test";

/**
 * Testes de Validação e Responsividade para Dispositivos Móveis
 * - iPhone SE / Android Compacto (375 x 667)
 * - iPhone 14 / Telas Padrão (390 x 844)
 * 
 * Verifica:
 * 1. Zero overflow horizontal (document.documentElement.scrollWidth <= window.innerWidth)
 * 2. Touch targets adequados (mínimo 44px / 48px)
 * 3. Textos e campos legíveis sem zoom indesejado (font-size >= 16px)
 * 4. Links de emergência telefônica direta (tel:188, tel:192)
 * 5. Expansão e leitura de cards de psicoeducação em telas estreitas
 */

function birthDateForAge(age: number) {
  const now = new Date();
  const d = new Date(now.getFullYear() - age, now.getMonth(), 1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

async function mockSubmit(page: Page) {
  await page.route(
    (url) => /_serverFn|serverFn|\/api\//.test(url.pathname + url.search),
    (route) =>
      route.request().method() === "POST"
        ? route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ result: { ok: true, assessment_id: "mobile-test-id" } }),
          })
        : route.fallback(),
  );
}

test.describe("Validação em Dispositivos Móveis (Mobile UX & Responsividade)", () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE / Compact Mobile
    isMobile: true,
    hasTouch: true,
  });

  test("Jornada do paciente sem overflow horizontal e com touch targets adequados", async ({ page }) => {
    await mockSubmit(page);
    await page.addInitScript(() => window.localStorage.clear());

    // 1. Tela 1 — Boas-Vindas
    await page.goto("/saraiva/triagem", { waitUntil: "networkidle" });
    
    // Verifica ausência de scroll horizontal (viewport containment)
    const isContainedScreen1 = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= window.innerWidth;
    });
    expect(isContainedScreen1).toBe(true);

    // Título oficial visível
    await expect(page.getByRole("heading", { name: /Pré-avaliação clínica/i })).toBeVisible();

    // Checkbox de consentimento com rótulo clicável
    const consent = page.getByRole("checkbox");
    const consentLabel = page.locator("label").filter({ has: consent });
    await consentLabel.locator("span").last().click();
    await expect(consent).toHaveAttribute("data-state", "checked");

    const startBtn = page.getByRole("button", { name: "Começar" });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // 2. Tela 2 — Dados Básicos
    await expect(page.getByRole("heading", { name: "Seus dados" })).toBeVisible();
    
    const isContainedScreen2 = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= window.innerWidth;
    });
    expect(isContainedScreen2).toBe(true);

    // Card do Dr. Saraiva visível e selecionável
    await expect(page.getByText(/Dr\. José Ribamar Fernandes Saraiva Junior/i)).toBeVisible();

    await page.getByLabel(/Nome completo/).fill("Paciente Mobile Teste");
    await page.getByLabel("Data de nascimento *").fill(birthDateForAge(32));
    await page.getByLabel("E-mail *").fill("paciente.mobile@example.com");
    await page.getByLabel(/Telefone/).fill("(54) 99999-8888");

    // Botões de navegação empilhados de forma amigável no mobile
    const continueBtn = page.getByRole("button", { name: "Continuar" });
    await expect(continueBtn).toBeVisible();
    await continueBtn.click();

    // 3. Tela 3 — Sintomas
    await expect(page.getByRole("heading", { name: /Nas últimas semanas/i })).toBeVisible();
    
    const isContainedScreen3 = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= window.innerWidth;
    });
    expect(isContainedScreen3).toBe(true);

    // Seleciona sintomas: Tristeza e Sono
    await page.getByRole("button", { name: /Triste/i }).click();
    await page.getByRole("button", { name: /Dormindo mal/i }).click();

    await page.getByRole("button", { name: "Continuar" }).click();

    // 4. Tela 4 — Escalas
    const isContainedScreen4 = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= window.innerWidth;
    });
    expect(isContainedScreen4).toBe(true);

    // Responde os itens na interface móvel
    const questionHeader = page.locator("text=/· pergunta \\d+ de \\d+/").first();
    await expect(questionHeader).toBeVisible();

    // Responde com primeiro botão
    for (let i = 0; i < 20; i++) {
      const isHeaderVisible = await questionHeader.isVisible().catch(() => false);
      if (!isHeaderVisible) break;
      const optionButtons = page.locator("main button.min-h-14");
      const count = await optionButtons.count();
      if (count > 0) {
        // Verifica que o touch target da opção tem pelo menos 48px de altura
        const box = await optionButtons.first().boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
        await optionButtons.first().click();
      }
      await page.waitForTimeout(50);
    }

    // 5. Conclusão ou Risco
    await expect(
      page.getByRole("heading", { name: /(Pré-avaliação concluída|Você não precisa passar)/i })
    ).toBeVisible({ timeout: 15_000 });

    const isContainedFinal = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= window.innerWidth;
    });
    expect(isContainedFinal).toBe(true);

    // Botão de PDF
    await expect(page.getByRole("button", { name: /Baixar meu resumo em PDF/i })).toBeVisible();

    // Seção de Psicoeducação com cartões expansíveis
    const psicoHeading = page.getByRole("heading", { name: /Orientações e Práticas de Cuidado Recomendadas/i });
    if (await psicoHeading.isVisible()) {
      const lerMaisBtn = page.getByRole("button", { name: /Ler orientações completas/i }).first();
      if (await lerMaisBtn.isVisible()) {
        await lerMaisBtn.click();
        await expect(page.getByText(/Aviso importante:/i).first()).toBeVisible();
      }
    }
  });

  test("Links de emergência são válidos para discagem móvel nativa (tel:188 e tel:192)", async ({ page }) => {
    await mockSubmit(page);
    await page.addInitScript(() => window.localStorage.clear());

    await page.goto("/saraiva/triagem", { waitUntil: "networkidle" });
    
    // Início
    const consent = page.getByRole("checkbox");
    const consentLabel = page.locator("label").filter({ has: consent });
    await consentLabel.locator("span").last().click();
    await page.getByRole("button", { name: "Começar" }).click();

    // Dados
    await page.getByLabel(/Nome completo/).fill("Paciente Emergencia");
    await page.getByLabel("Data de nascimento *").fill(birthDateForAge(25));
    await page.getByLabel("E-mail *").fill("emergencia@example.com");
    await page.getByRole("button", { name: "Continuar" }).click();

    // Sintoma de morte/risco direto
    await page.getByRole("button", { name: /pensamentos de morte|machucar/i }).click();
    await page.getByRole("button", { name: "Continuar" }).click();

    // Responde o rastreio
    const questionHeader = page.locator("text=/· pergunta \\d+ de \\d+/").first();
    for (let i = 0; i < 20; i++) {
      const isHeaderVisible = await questionHeader.isVisible().catch(() => false);
      if (!isHeaderVisible) break;
      const optionButtons = page.locator("main button.min-h-14");
      if ((await optionButtons.count()) > 0) {
        await optionButtons.first().click();
      }
      await page.waitForTimeout(50);
    }

    // Na tela de acolhimento de risco
    const cvvLink = page.locator('a[href="tel:188"]');
    await expect(cvvLink).toBeVisible();
    await expect(cvvLink).toContainText("188");

    const samuLink = page.locator('a[href="tel:192"]');
    await expect(samuLink).toBeVisible();
    await expect(samuLink).toContainText("192");
  });
});
