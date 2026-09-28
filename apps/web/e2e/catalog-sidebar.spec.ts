import { test, expect } from "@playwright/test";

/**
 * BETA-GAP-10 / T127 — sidebar de filtros do catálogo.
 *
 * Web-only (não depende da API): a sidebar renderiza mesmo com o grid vazio.
 * Cobre: filtro desabilitado honestamente durante busca, contador inclui
 * gênero, drawer mobile sem overflow horizontal, e ausência de chave i18n crua
 * nos 3 locales.
 */

const RE_CHAVE_CRUA = /\b(?:catalog|catalogFilters|common)\.[a-z][A-Za-z0-9.]*/;

test.describe("BETA-GAP-10 — sidebar de filtros do catálogo", () => {
  test("desktop: busca ativa desabilita gênero/nota/crítica + hint honesta", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/pt-BR/catalog?q=matrix", { waitUntil: "domcontentloaded" });
    await page.getByTestId("catalog-advanced-toggle").click({ timeout: 20_000 });
    await expect(page.getByTestId("catalog-advanced-search-hint")).toBeVisible();
    await expect(page.getByTestId("catalog-filter-genero")).toBeDisabled();
    await expect(page.getByTestId("catalog-filter-com-critica")).toBeDisabled();
  });

  test("desktop: gênero na URL mostra 'Limpar' (contador inclui gênero)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/pt-BR/catalog?genero=acao", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("catalog-clear-all")).toBeVisible({ timeout: 20_000 });
  });

  test("mobile: abre drawer de filtros sem overflow horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/pt-BR/catalog", { waitUntil: "domcontentloaded" });
    await page.getByTestId("catalog-filters-mobile-open").click({ timeout: 20_000 });
    await page.getByTestId("catalog-advanced-toggle").click();
    await expect(page.getByTestId("catalog-filter-genero")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow, "sem overflow horizontal em 390x844").toBe(false);
  });

  for (const locale of ["pt-BR", "en-US", "es-ES"] as const) {
    test(`${locale}: catálogo sem chave i18n crua`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`/${locale}/catalog`, { waitUntil: "domcontentloaded" });
      const body = await page.locator("body").innerText();
      expect(body).not.toMatch(RE_CHAVE_CRUA);
    });
  }
});
