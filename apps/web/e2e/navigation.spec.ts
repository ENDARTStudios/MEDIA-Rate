import { test, expect } from "@playwright/test";

// Isolamento: testes anteriores trocam o locale via cookie (NEXT_LOCALE) —
// limpa por teste para o redirect de locale ser previsível.
test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

test.describe("Navegacao e i18n", () => {
  test("pagina inicial carrega com navbar", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav").first();
    await expect(nav).toBeVisible({ timeout: 10_000 });
    await expect(nav.getByText("MEDIA Rate").first()).toBeVisible();
  });

  test("navbar contem links de navegacao", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav").first();
    // No mobile os links ficam no menu hambúrguer — abre antes de verificar.
    const hamburger = page.locator("button[aria-controls='mobile-menu']");
    if (await hamburger.isVisible().catch(() => false)) {
      await hamburger.click();
    }
    // Desktop e mobile renderizam links duplicados (um oculto) — usa o visível.
    await expect(nav.locator("a[href*='catalog']").filter({ visible: true }).first()).toBeVisible();
    await expect(nav.locator("a[href*='pricing']").filter({ visible: true }).first()).toBeVisible();
  });

  test("troca idioma de pt-BR para en-US", async ({ page }) => {
    await page.goto("/");
    // Mobile: o switcher fica dentro do menu hambúrguer — abre primeiro.
    const hamburger = page.locator("button[aria-controls='mobile-menu']");
    if (await hamburger.isVisible().catch(() => false)) {
      await hamburger.click();
    }
    const switcher = page
      .locator("button[aria-label*='idioma'], button[aria-label*='language']")
      .filter({ visible: true })
      .first();
    await switcher.waitFor({ timeout: 5_000 });
    await switcher.click();
    await page.getByRole("button", { name: /^EN$/ }).click();
    await page.waitForURL("**/en-US", { timeout: 5_000 });
    await expect(page).toHaveURL(/en-US/);
  });

  test("troca idioma para es-ES", async ({ page }) => {
    await page.goto("/");
    const hamburger = page.locator("button[aria-controls='mobile-menu']");
    if (await hamburger.isVisible().catch(() => false)) {
      await hamburger.click();
    }
    const switcher = page
      .locator("button[aria-label*='idioma'], button[aria-label*='language']")
      .filter({ visible: true })
      .first();
    await switcher.waitFor({ timeout: 5_000 });
    await switcher.click();
    await page.getByRole("button", { name: /^ES$/ }).click();
    await page.waitForURL("**/es-ES", { timeout: 5_000 });
    await expect(page).toHaveURL(/es-ES/);
  });

  test("pagina de precos exibe planos", async ({ page }) => {
    // T461 (D-492): planos vêm da API/billing — CI sobe só o web.
    test.skip(
      process.env.E2E_FULL !== "1",
      "T461: requer API+DB (E2E_FULL=1) — CI sobe só o web; ver docs/E2E.md",
    );
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
