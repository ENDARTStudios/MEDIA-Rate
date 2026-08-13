import { test, expect, type Page, type BrowserContext } from "@playwright/test";

/**
 * T305 — Spot-checks autenticados em produção (D-294/D-295/D-301).
 *
 * Fluxos (a-f):
 *   (a) Free   → /dashboard mostra prompt de upgrade, SEM radar
 *   (b) Plus   → /dashboard mostra radar SVG, SEM sparkline temporal
 *   (c) Premium→ /dashboard mostra radar SVG + sparkline temporal
 *   (d) Ctrl+K logado → "duna" → pelo menos 1 resultado
 *   (e) RLS A≠B → B tenta PATCH na watchlist de A → bloqueado (404/403/0 linhas)
 *   (f) Admin   → GET /api/v1/admin/stats → contagens agregadas não-zero
 *
 * Contas de plano (a/b/c/f) vêm de env (TEST_USER_{FREE,PLUS,PREMIUM,ADMIN}_{EMAIL,PASSWORD})
 * e os testes são SKIPed quando as credenciais não estão presentes — assim o spec
 * roda em CI/local sem contas provisionadas. Os fluxos (d)/(e) usam a criação de
 * usuário descartável via UI (padrão do repo) e nunca hardcode credenciais.
 */
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000/pt-BR";
const PWD = "TesteForte123!";

const SHOTS_DIR = "e2e/screenshots";
const REQUIRED = ["FREE", "PLUS", "PREMIUM", "ADMIN"] as const;

function creds(prefix: (typeof REQUIRED)[number]): { email: string; password: string } | null {
  const email = process.env[`TEST_USER_${prefix}_EMAIL`];
  const password = process.env[`TEST_USER_${prefix}_PASSWORD`];
  return email && password ? { email, password } : null;
}

async function uiLogin(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL("**/dashboard", { timeout: 20_000 });
}

async function registerFresh(page: Page, name: string, email: string): Promise<void> {
  await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await page.locator('input[name="name"], input[name="nome"]').first().fill(name);
  await page.locator('input[name="email"]').first().fill(email);
  const pwdInputs = page.locator('input[type="password"]');
  await pwdInputs.first().fill(PWD);
  if ((await pwdInputs.count()) > 1) await pwdInputs.nth(1).fill(PWD);
  const chk = page.locator('input[type="checkbox"]').first();
  if ((await chk.count()) > 0) await chk.check().catch(() => {});
  await page
    .locator('button:has-text("Cadastrar")')
    .first()
    .click()
    .catch(() => page.locator('button[type="submit"]').first().click());
  await page.waitForURL("**/dashboard", { timeout: 20_000 });
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${SHOTS_DIR}/${name}.png`, fullPage: false });
}

const freeCreds = creds("FREE");
const plusCreds = creds("PLUS");
const premiumCreds = creds("PREMIUM");
const adminCreds = creds("ADMIN");

test.describe("T305 spot-checks autenticados", () => {
  // (a) Free → prompt de upgrade, sem radar
  test("(a) Free dashboard: upgrade sem radar", async ({ page }) => {
    test.skip(!freeCreds, "TEST_USER_FREE_* ausente");
    await uiLogin(page, freeCreds!.email, freeCreds!.password);
    await page.waitForTimeout(2500);
    await expect(page.getByText("Dashboard é Plus/Premium")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('svg[aria-label="Radar"]')).toHaveCount(0);
    await shot(page, "t305-a-free-upgrade");
  });

  // (b) Plus → radar, sem sparkline temporal
  test("(b) Plus dashboard: radar sem evolucao", async ({ page }) => {
    test.skip(!plusCreds, "TEST_USER_PLUS_* ausente");
    await uiLogin(page, plusCreds!.email, plusCreds!.password);
    await page.waitForTimeout(2500);
    await expect(page.locator('svg[aria-label="Radar"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('svg[aria-label="Temporal"]')).toHaveCount(0);
    await shot(page, "t305-b-plus-radar");
  });

  // (c) Premium → radar + sparkline temporal
  test("(c) Premium dashboard: radar + evolucao", async ({ page }) => {
    test.skip(!premiumCreds, "TEST_USER_PREMIUM_* ausente");
    await uiLogin(page, premiumCreds!.email, premiumCreds!.password);
    await page.waitForTimeout(2500);
    await expect(page.locator('svg[aria-label="Radar"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('svg[aria-label="Temporal"]')).toBeVisible({ timeout: 15_000 });
    await shot(page, "t305-c-premium-radar-temporal");
  });

  // (d) Ctrl+K logado → busca "duna" → >=1 resultado
  test("(d) Ctrl+K logado retorna resultado para 'duna'", async ({ page }) => {
    const email = `t305-ctrlk-${Date.now()}@test.com`;
    await registerFresh(page, "T305 CtrlK", email);
    await page.keyboard.press("Control+KeyK");
    const input = page.locator('[role="dialog"] input').first();
    await input.waitFor({ timeout: 8_000 });
    await input.pressSequentially("duna", { delay: 50 });
    // resultados são <button> com título; espera >=1
    await page.locator('[role="dialog"] button').first().waitFor({ timeout: 12_000 });
    const count = await page.locator('[role="dialog"] button').count();
    expect(count).toBeGreaterThanOrEqual(1);
    await shot(page, "t305-d-ctrlk-duna");
  });

  // (e) RLS A≠B — B não consegue PATCH na watchlist de A
  test("(e) RLS: B nao altera watchlist de A", async ({ browser }) => {
    const ctxA: BrowserContext = await browser.newContext();
    const ctxB: BrowserContext = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();
    try {
      const emailA = `t305-rls-a-${Date.now()}@test.com`;
      await registerFresh(pageA, "RLS A", emailA);

      // Descobre uma midia do catalogo para anexar a watchlist de A.
      const cat = await pageA.request.get(`${BASE}/api/v1/midias`);
      const midiaId = await cat
        .json()
        .then((d) => d[0]?.id ?? d.items?.[0]?.id ?? d.data?.[0]?.id)
        .catch(() => undefined);
      test.skip(!midiaId, "sem midia no catalogo para anexar");
      expect(midiaId).toBeTruthy();

      const add = await pageA.request.post(`${BASE}/api/v1/watchlist`, {
        data: { midia_id: midiaId, coluna: "WANT" },
      });
      expect(add.ok()).toBeTruthy();
      const entryId = await add.json().then((d) => d.id ?? d.entry?.id);

      // Login de B (contexto isolado) e tenta alterar a entrada de A.
      const emailB = `t305-rls-b-${Date.now()}@test.com`;
      await registerFresh(pageB, "RLS B", emailB);
      const res = await pageB.request.patch(`${BASE}/api/v1/watchlist/${entryId}`, {
        data: { reacao: "GOSTEI" },
      });
      expect([404, 403, 401]).toContain(res.status());
      await shot(pageB, "t305-e-rls-ab");
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  // (f) Admin → /api/v1/admin/stats com contagens não-zero
  test("(f) Admin stats: contagens agregadas nao-zero", async ({ page }) => {
    test.skip(!adminCreds, "TEST_USER_ADMIN_* ausente");
    await uiLogin(page, adminCreds!.email, adminCreds!.password);
    await page.waitForTimeout(2000);
    const res = await page.request.get(`${BASE}/api/v1/admin/stats`);
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as Record<string, number>;
    const nonZero = Object.values(body).some((v) => typeof v === "number" && v > 0);
    expect(nonZero).toBeTruthy();
    await shot(page, "t305-f-admin-stats");
  });
});
