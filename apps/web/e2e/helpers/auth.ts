import type { Page } from "@playwright/test";

/**
 * D-525 — autenticação via API para specs E2E_FULL: POST /auth/login no
 * context.request compartilha o cookie jar com a página (middleware enxerga
 * `sess`). Muito mais robusto que login-UI em dev (hidratação/consentimento).
 * Base da API: localhost:4000 (NEXT_PUBLIC_API_URL default do dev).
 */
const API_BASE = process.env.E2E_API_BASE ?? "http://localhost:4000";

export async function apiLogin(page: Page, email: string, password: string): Promise<void> {
  const res = await page.request.post(`${API_BASE}/api/v1/auth/login`, {
    data: { email, password },
  });
  if (res.status() !== 200) {
    throw new Error(`apiLogin falhou: ${res.status()}`);
  }
}

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
  await dismissConsentIfPresent(page);

  await page.locator('input[name="email"]').first().fill(email);
  await page.locator('input[name="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();

  // is_new_user ainda não acolhido → /welcome; caso contrário /dashboard.
  await page.waitForURL(/\/(welcome|dashboard)$/, { timeout: 20_000 });
}

/**
 * D-525: em contexto novo o diálogo de consentimento aparece sobreposto ao
 * form e pode interceptar o submit. Fecha-o antes de interagir (locale por
 * negociação — pt/en/es).
 */
export async function dismissConsentIfPresent(page: Page): Promise<void> {
  const btn = page
    .getByRole("button", { name: /aceitar todos|accept all|aceitar|accept|recusar|decline/i })
    .first();
  if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(400);
  }
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
