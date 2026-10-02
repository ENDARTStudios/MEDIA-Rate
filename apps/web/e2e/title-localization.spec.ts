import { test, expect, type Page } from "@playwright/test";

/**
 * BETA-GAP-15 / T129 — localização de títulos no resultado de busca.
 *
 * Web-only + mock de contrato (`page.route`) do `/api/v1/search` (shape real:
 * `{ items: [{ id, titulo, titulo_original, titulo_en, titulo_es, tipo,
 * ano_lancamento, sinopse, imagem_url, slug }], total }`). Prova que o título
 * é exibido no locale ativo usando os campos PERSISTIDOS (D-369), com fallback
 * real — nunca PT fixo. `title_localization_mode=contract_mock`.
 */

const SEARCH_ITEM = {
  id: "fix-tl-1",
  titulo: "Matrix PT",
  titulo_original: "The Matrix",
  titulo_en: "Matrix EN",
  titulo_es: "Matrix ES",
  tipo: "FILME",
  ano_lancamento: 1999,
  sinopse: null,
  imagem_url: null,
  slug: "matrix-fixture",
};

const ESPERADO: Record<string, string> = {
  "pt-BR": "Matrix PT",
  "en-US": "Matrix EN",
  "es-ES": "Matrix ES",
};

async function mockApi(page: Page): Promise<void> {
  await page.route("**/api/v1/search*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [SEARCH_ITEM], total: 1, limit: 100, offset: 0 }),
    });
  });
  await page.route("**/api/v1/midias*", async (route) => {
    const url = route.request().url();
    if (url.includes("/midias/generos")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], total: 0, next_cursor: null, has_more: false }),
    });
  });
}

for (const locale of ["pt-BR", "en-US", "es-ES"] as const) {
  test(`${locale}: busca exibe o título no locale ativo (persistido)`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mockApi(page);
    await page.goto(`/${locale}/catalog`, { waitUntil: "domcontentloaded" });

    // Digita a busca (client-side) para exercitar o fetch do /search mockado.
    await page.getByRole("searchbox").fill("matrix");
    await expect(page.getByText(ESPERADO[locale], { exact: true })).toBeVisible({
      timeout: 20_000,
    });

    // Em en/es o título PT NÃO é exibido (prova de localização, não PT fixo).
    if (locale !== "pt-BR") {
      await expect(page.getByText("Matrix PT", { exact: true })).toHaveCount(0);
    }

    test.info().annotations.push({
      type: "title-localization",
      description: JSON.stringify({ title_localization_mode: "contract_mock", locale }),
    });
  });
}

test("mobile 390x844: busca localizada sem overflow horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page);
  await page.goto("/pt-BR/catalog", { waitUntil: "domcontentloaded" });
  await page.getByTestId("catalog-filters-mobile-open").click({ timeout: 20_000 });
  await page.getByRole("searchbox").fill("matrix");
  await page.getByTestId("catalog-filters-mobile-open").click(); // fecha o drawer
  await expect(page.getByText("Matrix PT", { exact: true })).toBeVisible({ timeout: 20_000 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow, "sem overflow horizontal em 390x844").toBe(false);
});
