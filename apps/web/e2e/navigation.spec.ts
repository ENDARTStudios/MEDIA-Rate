import { test, expect } from "@playwright/test";

test.describe("Navegacao e i18n", () => {
  test("pagina inicial carrega com navbar", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("nav")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("text=MEDIA Rate")).toBeVisible();
  });

  test("navbar contem links de navegacao", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav");
    await expect(nav.locator("a[href*='catalog']")).toBeVisible();
    await expect(nav.locator("a[href*='pricing']")).toBeVisible();
  });

  test("troca idioma de pt-BR para en-US", async ({ page }) => {
    await page.goto("/");
    const localeSelect = page.locator(
      "select[aria-label*='idioma'], select[aria-label*='language']",
    );
    await localeSelect.waitFor({ timeout: 5_000 });

    await localeSelect.selectOption("en-US");
    await page.waitForURL("**/en-US/**", { timeout: 5_000 });
    await expect(page).toHaveURL(/en-US/);
  });

  test("troca idioma para es-ES", async ({ page }) => {
    await page.goto("/");
    const localeSelect = page.locator(
      "select[aria-label*='idioma'], select[aria-label*='language']",
    );
    await localeSelect.waitFor({ timeout: 5_000 });

    await localeSelect.selectOption("es-ES");
    await page.waitForURL("**/es-ES/**", { timeout: 5_000 });
    await expect(page).toHaveURL(/es-ES/);
  });

  test("pagina de precos exibe planos", async ({ page }) => {
    await page.goto("/pricing");

    // Verifica que pelo menos um nome de plano aparece
    const planNames = page.locator("text=Free, text=Plus, text=Premium");
    await expect(planNames.first())
      .toBeVisible({ timeout: 5_000 })
      .catch(async () => {
        // Fallback: procura por precos (R$)
        await expect(page.locator("text=R$").first()).toBeVisible({ timeout: 5_000 });
      });
  });

  test("links de rodape existem", async ({ page }) => {
    await page.goto("/");
    // Scroll para o footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const footerLinks = page.locator("footer a");
    const count = await footerLinks.count();
    // Deve haver pelo menos 1 link no footer
    expect(count).toBeGreaterThan(0);
  });
});
