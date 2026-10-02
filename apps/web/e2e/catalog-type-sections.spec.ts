import { test, expect, type Page } from "@playwright/test";

/**
 * BETA-GAP-11 / T128 — seções por tipo no catálogo.
 *
 * Web-only + mock de contrato (`page.route`) do `/api/v1/midias` (shape real
 * descoberto em `lib/api.ts`): prova que o fixture aparece na UI, que "Ver
 * todos" navega para `?type=`, que as seções somem no modo filtrado, e sem
 * overflow horizontal. `sections_mode=contract_mock`.
 */

const RE_CHAVE_CRUA = /\b(?:catalog|catalogFilters|common)\.[a-z][A-Za-z0-9.]*/;
const DENSITY_MODE = "contract_mock";

const ITEM = {
  id: "fixture-m1",
  slug: "filme-fixture",
  titulo: "Filme Fixture",
  titulo_en: "Fixture Movie",
  titulo_es: "Película Fixture",
  tipo: "FILME",
  ano_lancamento: 2001,
  imagem_url: null,
  scores: [],
};

async function mockMidias(page: Page): Promise<void> {
  await page.route("**/api/v1/midias*", async (route) => {
    const url = route.request().url();
    if (url.includes("/midias/generos")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    const u = new URL(url);
    const tipo = u.searchParams.get("tipo");
    const isFilme = tipo === "FILME";
    const data = isFilme ? [ITEM] : [];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data, total: data.length, next_cursor: null, has_more: false }),
    });
  });
}

test.describe("BETA-GAP-11 — seções por tipo no catálogo", () => {
  test("desktop: seção real aparece, 'Ver todos' navega e some no modo filtrado", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mockMidias(page);
    await page.goto("/pt-BR/catalog", { waitUntil: "domcontentloaded" });

    const secao = page.getByTestId("catalog-type-section-movie");
    await expect(secao).toBeVisible({ timeout: 20_000 });
    // Prova de consumo do fixture.
    await expect(secao.getByText("Filme Fixture")).toBeVisible();

    const verTodos = page.getByTestId("catalog-type-see-all-movie");
    await expect(verTodos).toHaveAttribute("href", /\/catalog\?type=movie/);

    // Seção de tipo sem itens NÃO aparece.
    await expect(page.getByTestId("catalog-type-section-game")).toHaveCount(0);

    await verTodos.click();
    await expect(page).toHaveURL(/type=movie/);
    // Modo filtrado: as seções somem (não duplicam o grid).
    await expect(page.getByTestId("catalog-type-sections")).toHaveCount(0);

    test.info().annotations.push({
      type: "catalog-type-sections",
      description: JSON.stringify({ sections_mode: DENSITY_MODE, locale: "pt-BR" }),
    });
  });

  test("mobile 390x844: sem overflow horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockMidias(page);
    await page.goto("/pt-BR/catalog", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("catalog-type-section-movie")).toBeVisible({ timeout: 20_000 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow, "sem overflow horizontal em 390x844").toBe(false);
  });

  for (const locale of ["pt-BR", "en-US", "es-ES"] as const) {
    test(`${locale}: seção real + sem chave i18n crua`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await mockMidias(page);
      await page.goto(`/${locale}/catalog`, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("catalog-type-section-movie")).toBeVisible({ timeout: 20_000 });
      const body = await page.locator("body").innerText();
      expect(body).not.toMatch(RE_CHAVE_CRUA);
    });
  }
});
