import { test, expect } from "@playwright/test";

/**
 * T243 — verificação UI (D-230): menu de categorias da home traduzido nos
 * 3 locales. O HeroIconCluster renderiza labels via i18n (antes PT em EN/ES).
 */
const LOCALES: Record<string, string[]> = {
  "pt-BR": ["Filmes", "Séries", "Games", "Livros", "Quadrinhos"],
  "en-US": ["Movies", "Series", "Games", "Books", "Comics"],
  "es-ES": ["Películas", "Series", "Juegos", "Libros", "Cómics"],
};

test("T243: home mostra categorias no idioma correto", async ({ page }) => {
  for (const [locale, esperados] of Object.entries(LOCALES)) {
    await page.goto(`/${locale}`);
    await page.waitForTimeout(1200);
    const body = await page.locator("body").innerText();
    for (const label of esperados) {
      expect(body, `${locale} deveria conter '${label}'`).toContain(label);
    }
    console.log(`[${locale}] OK: ${esperados.join(", ")}`);
  }
});
