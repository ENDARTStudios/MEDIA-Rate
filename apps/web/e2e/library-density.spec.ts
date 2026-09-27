/**
 * BETA-GAP-14 (T117) - densidade dos cards de Minha Biblioteca.
 *
 * A Biblioteca le `getInteracoes` (watchlist), entao o spec SEMEIA interacoes
 * QUERO_CONSUMIR antes de medir (senao o grid nao renderiza - empty state).
 * Seed por API existente (PUT /api/v1/interacoes + cookie csrf_token), com
 * fallback: tenta `midiaId` e `midia_id` (contrato defensivo, sem inventar rota).
 * Medicao por CSS computado (gridTemplateColumns). Sem sleep/skip/fixme/expect.soft.
 */
import { test, expect, type Page } from "@playwright/test";

const E2E_FULL = process.env.E2E_FULL === "1";
const API = process.env.E2E_API_BASE ?? "http://localhost:4000";
const ROTA = "/pt-BR/biblioteca?status=QUERO_CONSUMIR";
const SEL_GRID = '[data-testid="biblioteca-grid"]';
const TOL = 1;

function extrairIds(json: unknown): string[] {
  const obj = json as Record<string, unknown> | null;
  const arr = (obj?.items ?? obj?.midias ?? obj?.data ?? obj) as unknown;
  if (!Array.isArray(arr)) return [];
  return arr
    .map((m) => {
      const o = m as Record<string, unknown>;
      return (o?.id ?? o?.midia_id ?? o?.midiaId) as string | undefined;
    })
    .filter((v): v is string => typeof v === "string" && v.length > 0);
}

async function semear(page: Page): Promise<number> {
  // Seed na ORIGEM DO APP (proxy same-origin): a sessao e o csrf_token vivem aqui.
  await page.goto("/pt-BR/catalog", { waitUntil: "domcontentloaded" });
  const appOrigin = new URL(page.url()).origin;
  const cookies = await page.context().cookies(appOrigin);
  const csrf = cookies.find((c) => c.name === "csrf_token")?.value;
  const midias = await page.request.get(`${appOrigin}/api/v1/midias?limit=10`, {
    headers: { Accept: "application/json" },
  });
  if (!midias.ok()) return 0;
  const ids = extrairIds(await midias.json()).slice(0, 10);
  let ok = 0;
  for (const id of ids) {
    for (const campo of ["midiaId", "midia_id"]) {
      const res = await page.request
        .put(`${appOrigin}/api/v1/interacoes`, {
          headers: {
            "Content-Type": "application/json",
            ...(csrf ? { "X-CSRF-Token": csrf } : {}),
          },
          data: { [campo]: id, status: "QUERO_CONSUMIR" },
        })
        .catch(() => null);
      const st = res?.status() ?? 0;
      if (st === 200 || st === 201 || st === 409) {
        ok += 1;
        break;
      }
    }
    if (ok >= 4) break;
  }
  return ok;
}

async function medir(page: Page) {
  const grid = page.locator(SEL_GRID);
  const m = await grid.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      display: cs.display,
      columns: cs.gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length,
      overflowX: el.scrollWidth > el.clientWidth + TOL,
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
  const seed = await semear(page);
  expect(seed, "interacoes semeadas (>=4)").toBeGreaterThanOrEqual(4);

  await page.goto(ROTA, { waitUntil: "domcontentloaded" });
  const grid = page.locator(SEL_GRID);
  await expect(grid).toBeVisible({ timeout: 20_000 });
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
