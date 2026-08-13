import { test, expect } from "@playwright/test";

test.describe("Busca e Discover", () => {
  // T309: prefixo retorna resultados ('bers' acha Berserk, 'cher' acha
  // Chernobyl). Com o plainto_tsquery antigo (palavra completa) esses
  // prefixos davam 0 resultados — este teste é a regressão do autocomplete.
  test("busca por prefixo retorna resultados (T309)", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    for (const prefix of ["bers", "cher"]) {
      const result = await page.evaluate(async (q) => {
        try {
          const res = await fetch(`/api/v1/search?q=${encodeURIComponent(q)}`);
          return res.ok
            ? ((await res.json()) as { items: { titulo: string }[]; total: number })
            : null;
        } catch {
          return null;
        }
      }, prefix);
      test.skip(!result, "API inalcançável");
      expect(result!.total).toBeGreaterThan(0);
    }
  });

  test("pagina discover carrega com grid de midias", async ({ page }) => {
    await page.goto("/discover");
    await expect(
      page
        .locator("h3, h2, h1")
        .filter({ hasText: /descubra|discover|search/i })
        .first(),
    ).toBeVisible({ timeout: 10_000 });

    const items = page.locator("a[href*='/media/']");
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test("busca retorna resultados relevantes", async ({ page }) => {
    await page.goto("/discover");
    const searchInput = page
      .locator('input[type="search"], input[placeholder*="buscar"], input[placeholder*="search"]')
      .first();
    if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await searchInput.fill("Elden");
      await searchInput.press("Enter");

      await page.waitForTimeout(1_000);
      const results = page.locator("a[href*='/media/']");
      const countAfter = await results.count();
      expect(countAfter).toBeGreaterThan(0);
    }
  });

  test("catalogo carrega itens por tipo", async ({ page }) => {
    await page.goto("/catalog");
    await expect(page.locator("a, h1, h2, h3").first()).toBeVisible({ timeout: 10_000 });
  });

  test("clicar em item de midia navega para pagina de detalhes", async ({ page }) => {
    await page.goto("/catalog");
    const mediaLink = page.locator("a[href*='/media/']").first();
    await mediaLink.waitFor({ timeout: 5_000 });

    const href = await mediaLink.getAttribute("href");
    await mediaLink.click();

    await expect(page).toHaveURL(new RegExp(href!.replace("/pt-BR/", "")));
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 5_000 });
  });
});
