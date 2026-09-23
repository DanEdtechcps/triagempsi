import { test, expect, type Page } from "@playwright/test";

/**
 * Achado #18 da auditoria: nenhum teste (unitário ou e2e) verificava que a
 * tela de crise (CVV 188 / SAMU 192) aparece quando o PHQ-9 item 9 dispara
 * pelo fluxo REAL do questionário — o único e2e existente
 * (triagem-mobile.spec.ts) chega na tela de crise por outro caminho
 * (sintoma "pensamentos de morte" pré-selecionado, não pelo PHQ-9).
 *
 * Este teste responde PHQ-2 alto o suficiente pra escalar pra PHQ-9, marca
 * "Nenhuma vez" em todos os itens do PHQ-9 exceto o item 9 (marcado como
 * positivo), e confirma que a tela de segurança aparece mesmo sem nenhum
 * sintoma de risco pré-selecionado.
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
            body: JSON.stringify({ result: { ok: true, assessment_id: "phq9-item9-test-id" } }),
          })
        : route.fallback(),
  );
}

const ITEM9_TEXT = "seria melhor estar morto";

test("PHQ-9 item 9 positivo mostra a tela de crise (CVV 188 / SAMU 192) mesmo sem sintoma de risco pré-selecionado", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await mockSubmit(page);
  await page.addInitScript(() => window.localStorage.clear());

  await page.goto("/saraiva/triagem", { waitUntil: "networkidle" });

  // Início
  const consent = page.getByRole("checkbox");
  const consentLabel = page.locator("label").filter({ has: consent });
  await consentLabel.locator("span").last().click();
  await page.getByRole("button", { name: "Começar" }).click();

  // Dados — adulto, sem nenhum sintoma de risco direto
  await page.getByLabel(/Nome completo/).fill("Paciente PHQ9 Item9");
  await page.getByLabel("Data de nascimento *").fill(birthDateForAge(30));
  await page.getByLabel("E-mail *").fill("phq9.item9@example.com");
  await page.getByLabel(/Telefone/).fill("(54) 99999-8888");
  await page.getByLabel(/Sexo biológico/).click();
  await page.getByRole("option", { name: "Prefiro não informar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  // Sintoma: tristeza (rota pro PHQ-2 → escala pro PHQ-9 se score ≥3),
  // deliberadamente NÃO seleciona "pensamentos de morte ou de me machucar".
  await page.getByRole("button", { name: /Triste, desanimado/i }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  // Responde cada pergunta: PHQ-2 sempre "Quase todos os dias" (garante
  // escalar pro PHQ-9); no PHQ-9, tudo "Nenhuma vez" exceto o item 9
  // ("...seria melhor estar morto"), marcado "Vários dias" (positivo).
  // O cabeçalho de cada tela (QuestionScreen.tsx) mostra "{scale.name} ·
  // pergunta X de Y" — usa o nome real da escala pra distinguir PHQ-2 de
  // PHQ-9 em vez de contar perguntas (o número de perguntas do PHQ-2 antes
  // da escalada não é uma constante estável do teste).
  const header = page.locator("text=/· pergunta \\d+ de \\d+/").first();
  await expect(header).toBeVisible({ timeout: 10_000 });

  // Guard alto o bastante pra cobrir todas as escalas do fluxo real (PHQ-2,
  // PHQ-9 completo, e a escala confirmatória ASQ que o motor insere depois
  // de um item de risco do PHQ-9 — visto num run real: "ASQ · pergunta 3 de
  // 4" ainda em andamento quando um guard de 30 esgotava antes do fim).
  let sawItem9 = false;
  for (let guard = 0; guard < 60; guard++) {
    const isHeaderVisible = await header.isVisible({ timeout: 1500 }).catch(() => false);
    if (!isHeaderVisible) break;

    const isItem9 = await page
      .getByText(ITEM9_TEXT, { exact: false })
      .isVisible()
      .catch(() => false);

    const optionButtons = page.locator("main button.min-h-14");
    const count = await optionButtons.count();
    if (count === 0) break;

    const prevText = await header.textContent();
    const isPhq2Question = (prevText ?? "").startsWith("PHQ-2");

    if (isItem9) {
      sawItem9 = true;
      // índice 1 = "Vários dias" (valor 1, positivo — não precisa do
      // extremo "Quase todos os dias" pra disparar, riskItems só olha >0).
      await optionButtons.nth(1).click();
    } else if (isPhq2Question) {
      await optionButtons.last().click(); // valor mais alto: garante escalar pro PHQ-9
    } else {
      await optionButtons.first().click(); // "Nenhuma vez": mantém o resto do PHQ-9 zerado
    }

    await expect(header)
      .not.toHaveText(prevText ?? "", { timeout: 4000 })
      .catch(() => {});
    await page.waitForTimeout(100);
  }

  expect(sawItem9, "o item 9 do PHQ-9 deveria ter aparecido no fluxo real").toBe(true);

  // A tela de crise deve aparecer — sem depender de nenhum sintoma de risco
  // pré-selecionado, só do item 9 do PHQ-9.
  await expect(
    page.getByRole("heading", {
      name: /(Você não precisa passar por isso sozinho|Você não está sozinho)/i,
    }),
  ).toBeVisible({ timeout: 15_000 });

  const cvvLink = page.locator('a[href="tel:188"]').first();
  await expect(cvvLink).toBeVisible();
  await expect(cvvLink).toContainText("188");

  const samuLink = page.locator('a[href="tel:192"]').first();
  await expect(samuLink).toBeVisible();
  await expect(samuLink).toContainText("192");
});
