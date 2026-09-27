/**
 * BETA-GAP-14 (T117) - densidade dos cards de Minha Biblioteca.
 * Autentica via storageState do globalSetup (E2E_FULL=1) e mede o grid real
 * ([data-testid="biblioteca-grid"]). Espera deterministica: URL, hidratacao,
 * document.fonts.ready, rAF duplo. Sem sleep arbitrario, skip, fixme ou expect.soft.
 * Metas: desktop 1280x800 -> colunas efetivas >= 6; mobile 390x844 -> >= 2 e sem overflow.
 */
import { test, expect, type Page } from "@playwright/test";

const E2E_FULL = process.env.E2E_FULL === "1";
const SEL_GRID = '[data-testid="biblioteca-grid"]';
const SEL_CARDS = '[data-testid="biblioteca-grid"] > *';
const TOL = 1;

async function estabilizar(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  });
}

async function medir(page: Page) {
  const itens = page.locator(SEL_CARDS);
  const n = await itens.count();
  const xs: number[] = [];
  let largura = 0;
  let altura = 0;
  for (let i = 0; i < n; i += 1) {
    const b = await itens.nth(i).boundingBox();
    if (!b) continue;
    if (!xs.some((x) => Math.abs(x - b.x) <= TOL)) xs.push(b.x);
    if (i === 0) {
      largura = Math.round(b.width);
      altura = Math.round(b.height);
    }
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  return { n, colunas: xs.length, largura, altura, overflow };
}

test.describe("BETA-GAP-14 - densidade da Biblioteca", () => {
  test.skip(!E2E_FULL, "requer E2E_FULL=1 (storageState autenticado)");

  test("desktop 1280x800 - >= 6 colunas e sem overflow", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/pt-BR/biblioteca", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(SEL_GRID, { state: "visible", timeout: 20_000 });
    await page.locator(SEL_GRID).first().scrollIntoViewIfNeeded();
    await estabilizar(page);

    const m = await medir(page);
    test.info().annotations.push({
      type: "densidade-biblioteca-desktop",
      description: JSON.stringify({ viewport: "1280x800", ...m }),
    });
    expect(m.n, "cards na biblioteca").toBeGreaterThanOrEqual(4);
    expect(m.colunas, "colunas efetivas em 1280px").toBeGreaterThanOrEqual(6);
    expect(m.overflow, "sem overflow horizontal").toBeLessThanOrEqual(TOL);
  });

  test("mobile 390x844 - >= 2 colunas e sem overflow", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/pt-BR/biblioteca", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(SEL_GRID, { state: "visible", timeout: 20_000 });
    await estabilizar(page);

    const m = await medir(page);
    test.info().annotations.push({
      type: "densidade-biblioteca-mobile",
      description: JSON.stringify({ viewport: "390x844", ...m }),
    });
    expect(m.colunas, "colunas efetivas no mobile").toBeGreaterThanOrEqual(2);
    expect(m.overflow, "sem overflow horizontal").toBeLessThanOrEqual(TOL);
  });
});
