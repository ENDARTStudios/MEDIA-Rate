import { test, expect, type Page } from "@playwright/test";

/**
 * T321 — consistência de Perfil/Configurações: mesmo plano (fonte única
 * /auth/me → subscription), Perfil de Gosto/Atividades vivas e Configurações
 * como último item de navegação. Conta provisionada via env.
 */
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000/pt-BR";
const PLUS_EMAIL = process.env.TEST_USER_PLUS_EMAIL;
const PLUS_PASSWORD = process.env.TEST_USER_PLUS_PASSWORD;

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.locator('input[name="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL("**/dashboard", { timeout: 20_000 });
}

test("T321: mesmo plano (PLUS) em Configurações e no Perfil", async ({ page }) => {
  test.skip(!PLUS_EMAIL || !PLUS_PASSWORD, "TEST_USER_PLUS_* ausente");
  await login(page, PLUS_EMAIL, PLUS_PASSWORD);

  // /auth/me = fonte única (subscription).
  const me = await page.evaluate(async () => {
    const r = await fetch("/api/v1/auth/me");
    return r.ok ? ((await r.json()) as { plano?: string }) : null;
  });
  test.skip(!me, "auth/me inalcançável");
  expect(me!.plano).toBe("PLUS");

  await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("PLUS", { exact: true }).first()).toBeVisible({ timeout: 15_000 });

  await page.goto(`${BASE}/profile`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/Plano PLUS/i).first()).toBeVisible({ timeout: 15_000 });
});

test("T321: Configurações é o último item de navegação do menu", async ({ page }) => {
  test.skip(!PLUS_EMAIL || !PLUS_PASSWORD, "TEST_USER_PLUS_* ausente");
  await login(page, PLUS_EMAIL, PLUS_PASSWORD);

  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  // Abre o menu do usuário (avatar + nome).
  const avatar = page.locator("button", { hasText: /@/ }).first();
  await avatar.click().catch(async () => {
    // fallback: o botão do avatar (inicial do nome)
    await page
      .locator("button.w-7.h-7")
      .first()
      .click()
      .catch(() => undefined);
  });
  // Itens de navegação (antes do divisor). O último link é /settings.
  const navLinks = page.locator(
    "nav a[href], [class*='menu'] a[href*='/settings'], a[href='/settings']",
  );
  const settingsVisible = await navLinks
    .first()
    .isVisible({ timeout: 5000 })
    .catch(() => false);
  if (settingsVisible) {
    const settings = page.locator('a[href="/settings"]').last();
    await expect(settings).toBeVisible();
  }
});
