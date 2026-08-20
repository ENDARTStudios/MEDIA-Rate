import { test, expect } from "@playwright/test";

/**
 * T243/T358 — verificação UI da home nos 3 locales.
 * T358: o HeroIconCluster (ícones circulares) foi removido — a verificação
 * agora cobre o H1 novo da Hero (antes verificava as labels das categorias).
 */
const H1_FRAGMENT: Record<string, string> = {
  "pt-BR": "O fim do",
  "en-US": "The end of",
  "es-ES": "Se acabó el",
};

test("T243: home mostra o H1 novo no idioma correto", async ({ page }) => {
  for (const [locale, fragment] of Object.entries(H1_FRAGMENT)) {
    await page.goto(`/${locale}`);
    await page.waitForTimeout(1200);
    await expect(page.locator("h1")).toContainText(fragment);
  }
});
