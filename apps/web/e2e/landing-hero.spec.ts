import { test, expect } from "@playwright/test";

/**
 * T358 (D-333) — Hero reformulada.
 * - Ícones circulares (HeroIconCluster) removidos.
 * - Nomes flutuantes (HomeVerticalMarquee) removidos.
 * - Showcase vivo do MEDIA Score presente (deck de 3 mídias reais).
 * - H1 novo nos 3 locales.
 */
const H1_FRAGMENT: Record<string, string> = {
  "pt-BR": "O fim do",
  "en-US": "The end of",
  "es-ES": "Se acabó el",
};

test("T358: hero sem ícones circulares nem nomes flutuantes", async ({ page }) => {
  await page.goto("/pt-BR");
  await page.waitForTimeout(1200);

  // (a) ícones circulares removidos
  await expect(page.getByTestId("hero-icon-cluster")).toHaveCount(0);

  // (b) showcase vivo presente
  await expect(page.getByTestId("score-showcase")).toHaveCount(1);

  // (c) nomes flutuantes (aside vertical) removidos
  await expect(page.locator("aside")).toHaveCount(0);
});

test("T358: H1 novo nos 3 locales", async ({ page }) => {
  for (const [locale, fragment] of Object.entries(H1_FRAGMENT)) {
    await page.goto(`/${locale}`);
    await page.waitForTimeout(1200);
    await expect(page.locator("h1")).toContainText(fragment);
  }
});
