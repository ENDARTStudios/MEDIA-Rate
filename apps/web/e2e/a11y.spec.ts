import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * T461 (D-492): auditoria a11y exige a página REAL (dados da API, estados
 * reais). Sem API, o DOM auditado é o de estados vazios/erro — violações
 * falsas (comprovado localmente: contrast/select-name em estados que não
 * existem em produção). CI sobe apenas o web, então o gate inteiro roda
 * só com E2E_FULL=1 (ambiente full-stack; ver docs/E2E.md).
 *
 * Alvo: sempre local (`PLAYWRIGHT_BASE_URL`) — nunca produção (edge 429 a
 * datacenter; CI não pode depender de ambiente de usuários reais).
 */
const E2E_FULL = process.env.E2E_FULL === "1";

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

test.describe("a11y AA", () => {
  test.skip(!E2E_FULL, "T461: auditoria exige página real com API (E2E_FULL=1) — ver docs/E2E.md");

  for (const path of PAGES) {
    test(`a11y ${path} — 0 violações AA`, async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle", timeout: 20000 });
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
});
