/**
 * BETA-GAP-14 (T117/T125) — densidade dos cards de "Minha Biblioteca".
 *
 * Estratégia: **mock de contrato determinístico** (`page.route`) do endpoint
 * real consumido por `BibliotecaClient` → `getInteracoes`
 * (`GET /api/v1/interacoes?status=…&limit=50`, envelope
 * `{ items, total, porStatus, nextCursor }`). O mock é aceitável porque este
 * gap é de LAYOUT/DENSIDADE (não de persistência); o teste PROVA que o fixture
 * foi consumido (título visível na UI) e mede colunas por CSS computado.
 *
 * Sem sleep/skip/fixme/expect.soft; waits determinísticos.
 */
import { test, expect, type Page } from "@playwright/test";

const E2E_FULL = process.env.E2E_FULL === "1";
const ROTA = "/pt-BR/biblioteca?status=QUERO_CONSUMIR";
const SEL_GRID = '[data-testid="biblioteca-grid"]';
const TOL = 1;
const DENSITY_MODE = "contract_mock";

/** Tipos válidos do enum da API (não inventar valores). */
const TIPOS = ["FILME", "SERIE", "GAME", "LIVRO", "COMIC", "MANGA"] as const;

/** Fixture sanitizada: 8 interações QUERO_CONSUMIR (shape real do contrato). */
function fixtureBiblioteca() {
  const agora = new Date("2026-09-28T12:00:00.000Z").toISOString();
  const items = Array.from({ length: 8 }, (_, k) => {
    const n = String(k + 1).padStart(2, "0");
    const midiaId = `fixture-midia-${n}`;
    return {
      id: `fixture-interacao-${n}`,
      midia_id: midiaId,
      status: "QUERO_CONSUMIR" as const,
      atualizado_em: agora,
      midia: {
        id: midiaId,
        slug: `fixture-biblioteca-${n}`,
        titulo: `Fixture Biblioteca ${n}`,
        tipo: TIPOS[k % TIPOS.length],
        ano_lancamento: 2000 + k,
        imagem_url: null,
        score: 70 + k,
      },
    };
  });
  return {
    items,
    total: items.length,
    porStatus: { QUERO_CONSUMIR: items.length, CONSUMINDO: 0, CONCLUIDO: 0, ABANDONADO: 0 },
    nextCursor: null,
  };
}

/** Intercepta SOMENTE o GET de interações; qualquer outro request segue real. */
async function mockBiblioteca(page: Page): Promise<void> {
  const fixture = fixtureBiblioteca();
  await page.route("**/api/v1/interacoes*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fixture),
    });
  });
}

async function medir(page: Page) {
  const grid = page.locator(SEL_GRID);
  const m = await grid.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      display: cs.display,
      columns: cs.gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length,
      overflowX: el.scrollWidth > el.clientWidth + 1,
    };
  });
  const cards = grid.locator("> *");
  const n = await cards.count();
  const dims: { width: number; height: number }[] = [];
  for (let i = 0; i < Math.min(4, n); i += 1) {
    const b = await cards.nth(i).boundingBox();
    if (b) dims.push({ width: Math.round(b.width), height: Math.round(b.height) });
  }
  return { ...m, cards: n, dims };
}

async function abrirEmedir(page: Page, largura: number, altura: number, rotulo: string) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: largura, height: altura });
  await mockBiblioteca(page);

  await page.goto(ROTA, { waitUntil: "domcontentloaded" });
  const grid = page.locator(SEL_GRID);
  await expect(grid).toBeVisible({ timeout: 20_000 });
  // Prova de que o MOCK foi consumido (não basta o grid existir).
  await expect(grid.getByText("Fixture Biblioteca 01")).toBeVisible({ timeout: 10_000 });
  await grid.scrollIntoViewIfNeeded();
  await page.evaluate(async () => {
    await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  });

  const m = await medir(page);
  test.info().annotations.push({
    type: rotulo,
    description: JSON.stringify({
      viewport: `${largura}x${altura}`,
      locale: "pt-BR",
      route: ROTA,
      display: m.display,
      columns: m.columns,
      overflowX: m.overflowX,
      cardsMedidos: m.dims.length,
      cardMetrics: m.dims,
      density_mode: DENSITY_MODE,
      tolerance: "columns/n colunas; overflowX false; cards >= 4",
    }),
  });
  return m;
}

test.describe("BETA-GAP-14 - densidade da Biblioteca", () => {
  test.skip(!E2E_FULL, "requer E2E_FULL=1 (storageState autenticado)");

  test("desktop 1280x800 - >= 6 colunas e sem overflow", async ({ page }) => {
    const m = await abrirEmedir(page, 1280, 800, "densidade-biblioteca-desktop");
    expect(m.display).toBe("grid");
    expect(m.columns, "colunas efetivas em 1280px").toBeGreaterThanOrEqual(6);
    expect(m.overflowX, "sem overflow horizontal").toBe(false);
    expect(m.dims.length, "cards medidos").toBeGreaterThanOrEqual(4);
  });

  test("mobile 390x844 - >= 2 colunas e sem overflow", async ({ page }) => {
    const m = await abrirEmedir(page, 390, 844, "densidade-biblioteca-mobile");
    expect(m.display).toBe("grid");
    expect(m.columns, "colunas efetivas no mobile").toBeGreaterThanOrEqual(2);
    expect(m.overflowX, "sem overflow horizontal").toBe(false);
  });
});
