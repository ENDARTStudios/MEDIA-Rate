import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = [
  "/pt-BR",
  "/pt-BR/catalog",
  "/pt-BR/login",
  "/pt-BR/register",
  "/pt-BR/pricing",
  "/pt-BR/movie/a-odisseia",
  "/pt-BR/tv/frieren",
  "/pt-BR/game/elden-ring",
];

const PROD = "https://media-rate-web.vercel.app";

for (const path of PAGES) {
  test(`a11y ${path} — 0 violações AA`, async ({ page }) => {
    await page.goto(`${PROD}${path}`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(1500);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    if (results.violations.length > 0) {
      console.log(`\n=== ${path} VIOLATIONS ===`);
      results.violations.forEach((v) => {
        console.log(`  ${v.id}: ${v.help} (${v.nodes.length} nodes)`);
      });
    }
    expect(results.violations, `${path}: ${results.violations.length} violações AA`).toEqual([]);
  });
}
