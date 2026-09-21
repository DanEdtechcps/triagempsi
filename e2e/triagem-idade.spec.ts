import { test, expect, type Page } from "@playwright/test";

/**
 * Encaminhamento por faixa etária: criança (<12), adolescente (12–17),
 * adulto (18–59) e pessoa idosa (60+). Cada teste percorre o fluxo real
 * do paciente e confere qual escala é aplicada em cada etapa.
 */

/** Data de nascimento (ISO) para uma idade-alvo, com folga de meses. */
function birthDateForAge(age: number) {
  const now = new Date();
  const d = new Date(now.getFullYear() - age, now.getMonth(), 1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

/** Intercepta o envio da triagem para não gravar nada no banco. */
async function mockSubmit(page: Page) {
  await page.route(
    (url) => /_serverFn|serverFn|\/api\//.test(url.pathname + url.search),
    (route) =>
      route.request().method() === "POST"
        ? route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ result: { ok: true, assessment_id: "e2e" } }),
          })
        : route.fallback(),
  );
}

async function startTriagem(
  page: Page,
  opts: { age: number; symptoms: string[] },
) {
  await mockSubmit(page);
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/saraiva/triagem", { waitUntil: "networkidle" });

  // Consentimento + início
  // O checkbox fica dentro de um <label>, então clicamos no texto do rótulo.
  const consent = page.getByRole("checkbox");
  const consentLabel = page.locator("label").filter({ has: consent });
  for (let i = 0; i < 3; i++) {
    if ((await consent.getAttribute("data-state")) === "checked") break;
    await consentLabel.locator("span").last().click();
  }
  await expect(consent).toHaveAttribute("data-state", "checked");
  await page.getByRole("button", { name: "Começar" }).click();

  // Dados básicos
  await page.getByLabel(/Nome completo/).fill("Paciente E2E");
  await page.getByLabel("Data de nascimento *").fill(birthDateForAge(opts.age));
  await page.getByLabel("E-mail *").fill("paciente.e2e@example.com");
  await page.getByRole("button", { name: "Continuar" }).click();

  // Sintomas
  for (const label of opts.symptoms) {
    await page.getByRole("button", { name: new RegExp(label, "i") }).click();
  }
  await page.getByRole("button", { name: "Continuar" }).click();
}

/** Confere a escala mostrada na tela de perguntas. */
async function expectScale(page: Page, code: string) {
  await expect(
    page.getByText(new RegExp(`${code} · pergunta 1 de`, "i")),
  ).toBeVisible();
}

/** Responde toda a escala atual com a primeira opção (menor pontuação). */
async function answerCurrentScale(page: Page) {
  const initialHeader = await page.locator("text=/· pergunta \\d+ de \\d+/").first().textContent();
  const scaleCode = initialHeader?.split("·")[0]?.trim();
  if (!scaleCode) return;

  for (let guard = 0; guard < 60; guard++) {
    const header = page.locator(`text=/${scaleCode} · pergunta (\\d+) de (\\d+)/`).first();
    const isVisible = await header.isVisible({ timeout: 1500 }).catch(() => false);
    if (!isVisible) break;

    const text = (await header.textContent()) ?? "";
    const m = text.match(/pergunta (\d+) de (\d+)/);
    if (!m) break;
    const currentQ = Number(m[1]);
    const totalQ = Number(m[2]);

    const optionBtn = page.locator("main button.min-h-14").first();
    await optionBtn.click();

    if (currentQ === totalQ) {
      await expect(header).not.toBeVisible({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(300);
      break;
    }

    const nextQHeader = page.locator(`text=/${scaleCode} · pergunta ${currentQ + 1} de/`);
    await nextQHeader.waitFor({ state: "visible", timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(50);
  }
}

const SINTOMA = {
  tristeza: "Triste, desanimado",
  ansiedade: "Ansioso\\(a\\), preocupado",
  atencao: "dificuldade de atenção",
  substancias: "álcool ou outras substâncias",
  trauma: "muito assustador",
  morte: "pensamentos de morte",
};

test.describe("Encaminhamento por faixa etária", () => {
  test("criança com tristeza não recebe escala e é encaminhada à consulta", async ({
    page,
  }) => {
    await startTriagem(page, { age: 8, symptoms: [SINTOMA.tristeza] });
    await expect(page.getByText(/pergunta 1 de/i)).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: /Pré-avaliação concluída/i }),
    ).toBeVisible();
  });

  test("criança com sintomas de atenção não responde SNAP-IV online", async ({
    page,
  }) => {
    await startTriagem(page, { age: 8, symptoms: [SINTOMA.atencao] });
    await expect(page.getByText(/SNAP-IV · pergunta/i)).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: /Pré-avaliação concluída/i }),
    ).toBeVisible();
  });

  test("criança com ideias de morte cai direto na via de risco", async ({
    page,
  }) => {
    await startTriagem(page, { age: 8, symptoms: [SINTOMA.morte] });
    await expect(
      page.getByRole("heading", { name: /(Você não precisa passar por isso sozinho|Você não está sozinho)/i }),
    ).toBeVisible();
  });

  test("adolescente com tristeza começa pelo PHQ-2, sem SRQ-20 de base", async ({
    page,
  }) => {
    await startTriagem(page, { age: 15, symptoms: [SINTOMA.tristeza] });
    await expectScale(page, "PHQ-2");
  });

  test("adolescente com uso de álcool responde AUDIT-C (sem CAGE de entrada)", async ({
    page,
  }) => {
    await startTriagem(page, { age: 16, symptoms: [SINTOMA.substancias] });
    await expectScale(page, "AUDIT-C");
    await answerCurrentScale(page);
    await expect(page.getByText(/CAGE · pergunta/i)).toHaveCount(0);
  });

  test("adulto com tristeza faz SRQ-20 de base e depois PHQ-2", async ({
    page,
  }) => {
    await startTriagem(page, { age: 30, symptoms: [SINTOMA.tristeza] });
    await expectScale(page, "SRQ-20");
    await answerCurrentScale(page);
    await expectScale(page, "PHQ-2");
  });

  test("adulto com sintomas de atenção não responde ASRS-18 online", async ({
    page,
  }) => {
    await startTriagem(page, { age: 30, symptoms: [SINTOMA.atencao] });
    await expectScale(page, "SRQ-20");
    await expect(page.getByText(/ASRS-18 · pergunta/i)).toHaveCount(0);
  });

  test("adulto com trauma é encaminhado ao PC-PTSD-5", async ({ page }) => {
    await startTriagem(page, { age: 30, symptoms: [SINTOMA.trauma] });
    await expectScale(page, "SRQ-20");
    await answerCurrentScale(page);
    await expectScale(page, "PC-PTSD-5");
  });

  test("adulto com ideias de morte responde o ASQ primeiro", async ({ page }) => {
    await startTriagem(page, { age: 30, symptoms: [SINTOMA.morte] });
    await expectScale(page, "ASQ");
  });

  test("pessoa idosa com tristeza recebe GDS-15 no lugar do PHQ-2", async ({
    page,
  }) => {
    await startTriagem(page, { age: 70, symptoms: [SINTOMA.tristeza] });
    await expectScale(page, "SRQ-20");
    await answerCurrentScale(page);
    await expectScale(page, "GDS-15");
    await expect(page.getByText(/PHQ-2 · pergunta/i)).toHaveCount(0);
  });

  test("pessoa idosa com ansiedade mantém o GAD-2", async ({ page }) => {
    await startTriagem(page, { age: 70, symptoms: [SINTOMA.ansiedade] });
    await expectScale(page, "SRQ-20");
    await answerCurrentScale(page);
    await expectScale(page, "GAD-2");
  });
});
