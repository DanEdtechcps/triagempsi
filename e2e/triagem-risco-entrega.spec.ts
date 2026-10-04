import { test, expect, type Page } from "@playwright/test";

/**
 * Achado crítico (revisão de 04/10/2026): uma triagem com risco de suicídio
 * sumia se o envio falhasse — o rascunho era apagado antes do submit e a falha
 * só ia para o console.
 *
 * Este teste derruba o envio até o teste mandar o servidor voltar e confirma que:
 *  1. a tela de crise (CVV 188 / SAMU 192) continua visível;
 *  2. a tela NÃO afirma "foram enviadas" enquanto não foi (avisa que está pendente);
 *  3. a triagem fica guardada na caixa de saída local;
 *  4. a entrega acontece sozinha quando o servidor volta, e a caixa é esvaziada.
 */

const OUTBOX_KEY = "triagem:outbox:saraiva";

function birthDateForAge(age: number) {
  const now = new Date();
  const d = new Date(now.getFullYear() - age, now.getMonth(), 1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

/** Servidor que falha enquanto `state.failing` for true — o teste decide quando "volta". */
async function mockSubmitToggle(page: Page) {
  const state = { posts: 0, failing: true };
  await page.route(
    (url) => /_serverFn|serverFn|\/api\//.test(url.pathname + url.search),
    (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      state.posts++;
      if (state.failing) {
        // Queda de rede real: o fetch rejeita (um 500 JSON seria lido pelo
        // cliente do TanStack como sucesso, então não serve como simulação).
        return route.abort("internetdisconnected");
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ result: { ok: true, assessment_id: "entrega-teste-id" } }),
      });
    },
  );
  return state;
}

test("triagem de risco: falha de envio não some, avisa o paciente e entrega sozinha depois", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const state = await mockSubmitToggle(page);
  await page.addInitScript(() => window.localStorage.clear());

  await page.goto("/saraiva/triagem", { waitUntil: "networkidle" });

  const consent = page.getByRole("checkbox");
  await page.locator("label").filter({ has: consent }).locator("span").last().click();
  await page.getByRole("button", { name: "Começar" }).click();

  await page.getByLabel(/Nome completo/).fill("Paciente Entrega Risco");
  await page.getByLabel("Data de nascimento *").fill(birthDateForAge(30));
  await page.getByLabel("E-mail *").fill("entrega.risco@example.com");
  await page.getByLabel(/Telefone/).fill("(54) 99999-8888");
  await page.getByLabel(/Sexo biológico/).click();
  await page.getByRole("option", { name: "Prefiro não informar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  // Sintoma de risco direto → o plano marca riskPathway.
  await page.getByRole("button", { name: /pensamentos de morte/i }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  // Percorre as escalas até a tela de crise (primeira opção sempre).
  const crisis = page.getByRole("heading", {
    name: /(Você não precisa passar por isso sozinho|Você não está sozinho)/i,
  });
  const header = page.locator("text=/· pergunta \\d+ de \\d+/").first();
  for (let guard = 0; guard < 80; guard++) {
    if (await crisis.isVisible().catch(() => false)) break;
    if (!(await header.isVisible({ timeout: 1500 }).catch(() => false))) continue;
    const options = page.locator("main button.min-h-14");
    if ((await options.count()) === 0) continue;
    const prev = await header.textContent();
    await options.first().click();
    await expect(header)
      .not.toHaveText(prev ?? "", { timeout: 4000 })
      .catch(() => {});
  }
  await expect(crisis).toBeVisible({ timeout: 20_000 });

  // 1. CVV/SAMU continuam disponíveis mesmo com o envio falhando.
  await expect(page.locator('a[href="tel:188"]').first()).toBeVisible();
  await expect(page.locator('a[href="tel:192"]').first()).toBeVisible();

  // 2. Não pode afirmar que foi enviado enquanto as tentativas falham.
  await expect(page.getByText(/Ainda não conseguimos enviar suas respostas/)).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/Suas respostas foram enviadas/)).toHaveCount(0);

  // 3. Fica guardada localmente enquanto pendente.
  const pending = await page.evaluate((k) => window.localStorage.getItem(k), OUTBOX_KEY);
  expect(pending, "a triagem de risco deve estar na caixa de saída").not.toBeNull();

  // 4. O servidor "volta": a próxima tentativa automática entrega e a caixa esvazia.
  const postsWhileDown = state.posts;
  expect(postsWhileDown).toBeGreaterThanOrEqual(1);
  state.failing = false;
  await expect(page.getByText(/Suas respostas foram enviadas/)).toBeVisible({ timeout: 45_000 });
  expect(state.posts).toBeGreaterThan(postsWhileDown);
  const after = await page.evaluate((k) => window.localStorage.getItem(k), OUTBOX_KEY);
  expect(after, "depois de entregue, a caixa de saída deve ser limpa").toBeNull();
});
