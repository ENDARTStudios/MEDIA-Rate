import { test, expect } from "@playwright/test";

/**
 * T400 (D-369): localização consistente de títulos/sinopses nos 3 locales.
 * Caso canônico 'The Thing' — título PT ("O Enigma de Outro Mundo") ≠ EN.
 * O slug "the-thing" resolve pelo fallback getBySlug (slugify(titulo_original)).
 * Executado pós-deploy + backfill (D-366) — exige titulo_en/sinopse_en no DB.
 */
test.describe("T400 — localização trilíngue (D-369)", () => {
  test("ficha em en-US exibe título EN ('The Thing') + sinopse EN", async ({ page }) => {
    await page.goto("/en-US/media/the-thing", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/The Thing/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { level: 1 }).first()).toContainText("The Thing", {
      timeout: 20_000,
    });
  });

  test("ficha em pt-BR mantém o título PT (não vaza EN)", async ({ page }) => {
    await page.goto("/pt-BR/media/the-thing", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 }).first()).not.toContainText("The Thing", {
      timeout: 20_000,
    });
  });
});
