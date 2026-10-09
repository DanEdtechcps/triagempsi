import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { hashReviewToken } from "../src/lib/review-token";

/**
 * Estúdio de validação, ponta a ponta, contra um ambiente REAL (por padrão o de E2E_BASE_URL).
 *
 * Usa um link pessoal de DECISOR de verdade e confere o que foi gravado no banco. Por isso só roda
 * quando recebe as credenciais por ambiente (nunca versionadas) e nunca toca em dado que já exista:
 * escolhe um item em que o avaliador ainda não respondeu, grava, confere e apaga SÓ o que criou.
 *
 *   E2E_BASE_URL=https://psiqway.com.br \
 *   E2E_ESTUDIO_LINK_FILE=/caminho/do/arquivo-com-o-link \
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   bun x playwright test e2e/estudio-validacao.spec.ts --project="Desktop (1280x900)"
 */
const linkFile = process.env.E2E_ESTUDIO_LINK_FILE;
const token = linkFile
  ? /#t=([A-Za-z0-9_-]{43})/.exec(readFileSync(linkFile, "utf8"))?.[1]
  : process.env.E2E_ESTUDIO_TOKEN;
const dbUrl = process.env.SUPABASE_URL;
const dbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function rest<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${dbUrl}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: dbKey ?? "", "content-type": "application/json", ...init?.headers },
  });
  if (!r.ok) throw new Error(`REST ${init?.method ?? "GET"} ${path.split("?")[0]} -> ${r.status}`);
  const texto = await r.text();
  return (texto ? JSON.parse(texto) : []) as T;
}

type Resposta = { decision: string; choice: string | null; comment: string | null };
type Decisao = { decision: string; rationale: string; superseded_at: string | null };

test.describe("Estúdio de validação (e2e com banco)", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(
    !token || !dbUrl || !dbKey,
    "Defina E2E_ESTUDIO_LINK_FILE, SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
  );

  let reviewerId = "";
  let itemId = "";
  let itemTitulo = "";

  async function entrar(page: Page) {
    await page.addInitScript((t) => {
      window.localStorage.setItem("psiqway-review-token", t);
    }, token ?? "");
    await page.goto("/revisao/estudio");
    await expect(page.getByText("decide a versão final")).toBeVisible();
  }

  async function abrirAba(page: Page, nome: string) {
    await page.getByRole("tab", { name: nome, exact: true }).click();
  }

  async function respostaNoBanco(): Promise<Resposta | undefined> {
    const linhas = await rest<Resposta[]>(
      `review_responses?select=decision,choice,comment&item_id=eq.${itemId}&reviewer_id=eq.${reviewerId}`,
    );
    return linhas[0];
  }

  test.beforeAll(async () => {
    const hash = await hashReviewToken(token ?? "");
    const rev = await rest<{ id: string; role: string }[]>(
      `review_reviewers?select=id,role&token_hash=eq.${hash}&is_active=eq.true`,
    );
    expect(rev, "o link precisa ser de um avaliador ativo").toHaveLength(1);
    expect(rev[0].role, "o teste precisa de um link de decisor").toBe("decisor");
    reviewerId = rev[0].id;

    const itens = await rest<{ id: string; title: string }[]>(
      "review_items?select=id,title&kind=eq.infografico&is_active=eq.true&order=sort_order",
    );
    expect(itens.length, "o catálogo precisa ter um infográfico").toBeGreaterThan(0);
    const [{ id, title }] = itens;
    const jaTem = await rest<unknown[]>(
      `review_responses?select=item_id&item_id=eq.${id}&reviewer_id=eq.${reviewerId}`,
    );
    const jaDecidido = await rest<unknown[]>(`review_decisions?select=item_id&item_id=eq.${id}`);
    test.skip(
      jaTem.length > 0 || jaDecidido.length > 0,
      "o item de teste já tem resposta ou decisão real: não vou sobrescrever",
    );
    itemId = id;
    itemTitulo = title;
  });

  test.afterAll(async () => {
    if (!itemId || !reviewerId) return;
    // Apaga só o que este teste criou (nesta ordem: decisões, eventos, respostas).
    await rest(`review_decisions?item_id=eq.${itemId}&decided_by=eq.${reviewerId}`, {
      method: "DELETE",
    });
    await rest(`review_response_events?item_id=eq.${itemId}&reviewer_id=eq.${reviewerId}`, {
      method: "DELETE",
    });
    await rest(`review_responses?item_id=eq.${itemId}&reviewer_id=eq.${reviewerId}`, {
      method: "DELETE",
    });
  });

  test("colar o link completo numa aba que já estava no Estúdio entra normalmente", async ({
    page,
  }) => {
    await page.goto("/revisao/estudio");
    await expect(page.getByText("Abra o link pessoal que o senhor recebeu")).toBeVisible();
    // Só o fragmento muda: é o caso que antes deixava o aviso na tela.
    await page.goto(`/revisao/estudio#t=${token}`);
    await expect(page.getByText("decide a versão final")).toBeVisible();
    await expect(page).not.toHaveURL(/#t=/);
    await page.reload();
    await expect(page.getByText("decide a versão final")).toBeVisible();
  });

  test("mostra as abas de todos os tipos e o resumo", async ({ page }) => {
    await entrar(page);
    for (const aba of [
      "Resumo",
      "Vídeos",
      "Frases",
      "Escalas",
      "Marca",
      "Pendências",
      "Estilo de vídeo",
      "Infográficos",
      "Quiz",
      "Flashcards",
      "Slides",
      "Mapas mentais",
      "Áudios",
      "Decidir",
    ]) {
      await expect(page.getByRole("tab", { name: aba, exact: true })).toBeVisible();
    }
    await expect(page.getByText(/O senhor respondeu \d+ de \d+ itens/)).toBeVisible();
  });

  test("o infográfico traz uma opção por projeto, cada uma com a sua imagem", async ({ page }) => {
    const bloqueios: string[] = [];
    page.on("console", (m) => {
      if (/Content Security Policy|Refused to frame/i.test(m.text())) bloqueios.push(m.text());
    });
    await entrar(page);
    await abrirAba(page, "Infográficos");
    for (const nome of ["Psiqway", "Caminhos", "Corte 800", "Médico de Família"]) {
      await expect(page.getByText(nome, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Prefiro esta" })).toHaveCount(4);
    const molduras = page.locator("iframe[title^='Material: Infográfico']");
    await expect(molduras).toHaveCount(4);
    // Os quadros são preguiçosos: rolar até cada um e conferir que o Drive de fato carregou nele.
    for (let i = 0; i < 4; i++) await molduras.nth(i).scrollIntoViewIfNeeded();
    await expect
      .poll(
        () => page.frames().filter((f) => f.url().startsWith("https://drive.google.com/")).length,
        {
          message: "os 4 quadros do Drive precisam carregar (a CSP não pode bloqueá-los)",
          timeout: 30_000,
        },
      )
      .toBe(4);
    expect(bloqueios, "a política de segurança bloqueou algum quadro").toEqual([]);
    await page.screenshot({ path: "test-results/estudio-infograficos.png", fullPage: true });
  });

  test("o quiz responde e corrige na tela", async ({ page }) => {
    await entrar(page);
    await abrirAba(page, "Quiz");
    await page
      .getByText(/^Quiz: \d+ perguntas$/)
      .first()
      .click();
    const primeira = page.locator("fieldset").first();
    await primeira.locator("input").first().check();
    await primeira.getByRole("button", { name: "Conferir" }).click();
    await expect(primeira.getByRole("status")).toHaveText(/Certo|Parcial|Errado/);
  });

  test("salvar uma preferência grava no banco", async ({ page }) => {
    await entrar(page);
    await abrirAba(page, "Infográficos");
    await page.getByRole("button", { name: "Prefiro esta" }).first().click();
    await expect(page.getByRole("status").filter({ hasText: "Salvo." })).toBeVisible();
    await expect.poll(respostaNoBanco).toMatchObject({ decision: "prefiro", choice: "psiqway" });
  });

  test("pedir ajuste sem comentário é recusado e com comentário grava", async ({ page }) => {
    await entrar(page);
    await abrirAba(page, "Infográficos");
    await page.getByRole("button", { name: "Ajusto", exact: true }).click();
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByText("Para pedir ajuste, escreva o que mudar")).toBeVisible();
    expect(await respostaNoBanco()).toMatchObject({ decision: "prefiro" }); // nada mudou

    await page
      .getByLabel(`Comentário sobre ${itemTitulo}`)
      .fill("E2E: teste automático, pode ignorar.");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Salvo." })).toBeVisible();
    await expect
      .poll(respostaNoBanco)
      .toMatchObject({ decision: "ajusto", comment: "E2E: teste automático, pode ignorar." });
  });

  test("o decisor registra a decisão final, que fica no banco", async ({ page }) => {
    await entrar(page);
    await abrirAba(page, "Decidir");
    const cartao = page
      .locator("h3", { hasText: itemTitulo })
      .locator("xpath=ancestor::div[contains(@class,'space-y-3')][1]");
    await expect(cartao).toBeVisible();
    await cartao.getByRole("button", { name: "Gravar decisão" }).click();
    await expect(page.getByText(/justificativa da decisão/i).first()).toBeVisible(); // recusa sem justificativa
    await cartao.getByRole("button", { name: "Aprovado", exact: true }).click();
    await cartao
      .getByPlaceholder("Justificativa da decisão (obrigatória)")
      .fill("E2E: decisão de teste.");
    await cartao.getByRole("button", { name: "Gravar decisão" }).click();
    await expect
      .poll(async () => {
        const d = await rest<Decisao[]>(
          `review_decisions?select=decision,rationale,superseded_at&item_id=eq.${itemId}&superseded_at=is.null`,
        );
        return d[0];
      })
      .toMatchObject({ decision: "aprovado", rationale: "E2E: decisão de teste." });
  });

  test("a exportação gera ata, planilha e cópia com a decisão", async ({ page }) => {
    await entrar(page);
    await abrirAba(page, "Decidir");
    const baixados: { nome: string; texto: string }[] = [];
    page.on("download", async (d) => {
      const caminho = await d.path();
      baixados.push({ nome: d.suggestedFilename(), texto: readFileSync(caminho, "utf8") });
    });
    await page.getByRole("button", { name: /Baixar ata, planilha e cópia/ }).click();
    await expect.poll(() => baixados.length).toBe(3);
    const ata = baixados.find((b) => b.nome.startsWith("Ata_de_decisoes"));
    expect(ata?.texto).toContain("Ata de decisões do Estúdio de validação");
    expect(ata?.texto).toContain("E2E: decisão de teste.");
    expect(baixados.some((b) => b.nome.endsWith(".csv"))).toBe(true);
    expect(baixados.some((b) => b.nome.endsWith(".json"))).toBe(true);
  });

  test("depois de recarregar, a decisão final continua aparecendo", async ({ page }) => {
    await entrar(page);
    await abrirAba(page, "Infográficos");
    await expect(page.getByText("Decisão final: Aprovado")).toBeVisible();
  });
});
