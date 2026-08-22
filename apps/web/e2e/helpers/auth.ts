import type { Page } from "@playwright/test";

/**
 * Helper de autenticacao E2E via UI.
 * O app MEDIA Rate usa Zustand + localStorage (sem backend real no modo mock).
 * Registra um usuario novo e faz login.
 */
export async function registerAndLogin(
  page: Page,
  options: {
    name?: string;
    email?: string;
    password?: string;
  } = {},
): Promise<void> {
  const name = options.name ?? "Test User";
  const email = options.email ?? `e2e-${Date.now()}@test.com`;
  const password = options.password ?? "Test@12345!";

  await page.goto("/register");
  await page.waitForSelector("form", { timeout: 10_000 });

  await page.locator('input[name="name"]').fill(name);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="confirmPassword"]').fill(password);
  await page.locator('input[name="acceptTerms"]').check();
  await page.locator('button[type="submit"]').click();

  // T364: primeiro contato (register) cai em /welcome; retorno cai em /dashboard.
  await page.waitForURL(/\/(welcome|dashboard)$/, { timeout: 10_000 });
}

/**
 * Login via UI com credenciais existentes (usuario ja registrado).
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.waitForSelector("form", { timeout: 10_000 });

  await page.locator('input[name="email"]').first().fill(email);
  await page.locator('input[name="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();

  // is_new_user ainda não acolhido → /welcome; caso contrário /dashboard.
  await page.waitForURL(/\/(welcome|dashboard)$/, { timeout: 10_000 });
}

/**
 * Logout via UI (clica no botao de usuario e depois em Sair).
 */
export async function logout(page: Page): Promise<void> {
  const userButton = page.locator("button", { hasText: /Test User|perfil|conta/i });
  if (await userButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await userButton.click();
    const logoutBtn = page.locator("button, a", { hasText: /sair|logout|exit/i });
    if (await logoutBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await logoutBtn.click();
    }
  }
}
