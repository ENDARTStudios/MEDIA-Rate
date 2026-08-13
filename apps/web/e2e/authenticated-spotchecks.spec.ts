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
 * Contas vêm de env (TEST_USER_{FREE,PLUS,PREMIUM,ADMIN}_{EMAIL,PASSWORD}) e os
 * testes são SKIPed quando as credenciais não estão presentes — assim o spec
 * roda em CI/local sem contas provisionadas. Os fluxos (d)/(e) reusam as contas
 * provisionadas (free/plus) — o registro via UI cai em loop em produção (T303).
 */
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000/pt-BR";

const SHOTS_DIR = "e2e/screenshots";
const REQUIRED = ["FREE", "PLUS", "PREMIUM", "ADMIN"] as const;

function creds(prefix: (typeof REQUIRED)[number]): { email: string; password: string } | null {
  const email = process.env[`TEST_USER_${prefix}_EMAIL`];
  const password = process.env[`TEST_USER_${prefix}_PASSWORD`];
  return email && password ? { email, password } : null;
}

async function uiLogin(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  // Aguarda hidratacao do form (evita submit nativo GET que quebra o login).
  await page.waitForTimeout(1500);
  await page.locator('input[name="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL("**/dashboard", { timeout: 20_000 });
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${SHOTS_DIR}/${name}.png`, fullPage: false });
}

/** Fetch same-origin na pagina (carrega cookies de sessao + CSRF), como o app faz. */
async function apiJson<T = unknown>(
  page: Page,
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: unknown,
): Promise<{ status: number; body: T }> {
  const csrf = await page.evaluate(() => sessionStorage.getItem("mediarate:csrf") ?? "");
  return page.evaluate(
    async ({ method, path, body, csrf }) => {
      const r = await fetch(path, {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(method !== "GET" && csrf ? { "X-CSRF-Token": csrf } : {}),
        },
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await r.text();
      return { status: r.status, body: text ? (JSON.parse(text) as unknown) : null };
    },
    { method, path, body, csrf },
  ) as Promise<{ status: number; body: T }>;
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

  // (d) Ctrl+K logado → busca "duna" → >=1 resultado.
  // Usa conta provisionada (register via UI cai em loop em produção, T303).
  test("(d) Ctrl+K logado retorna resultado para 'duna'", async ({ page }) => {
    test.skip(!freeCreds, "TEST_USER_FREE_* ausente");
    await uiLogin(page, freeCreds!.email, freeCreds!.password);
    await page.keyboard.press("Control+KeyK");
    const input = page.locator('[role="dialog"] input').first();
    await input.waitFor({ timeout: 8_000 });
    await input.pressSequentially("duna", { delay: 50 });
    await page.locator('[role="dialog"] button').first().waitFor({ timeout: 12_000 });
    const count = await page.locator('[role="dialog"] button').count();
    expect(count).toBeGreaterThanOrEqual(1);
    await shot(page, "t305-d-ctrlk-duna");
  });

  // (e) RLS A≠B — B não consegue PATCH na watchlist de A.
  // A=free, B=plus (contas provisionadas). Registro via UI loopa em produção.
  test("(e) RLS: B nao altera watchlist de A", async ({ browser }) => {
    test.skip(!freeCreds || !plusCreds, "TEST_USER_FREE_*/PLUS_* ausente");
    const ctxA: BrowserContext = await browser.newContext();
    const ctxB: BrowserContext = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();
    try {
      await uiLogin(pageA, freeCreds!.email, freeCreds!.password);

      // Idempotente: reusa entrada existente de A; cria apenas na 1a execucao.
      let entryId: string | undefined;
      const lista = await apiJson<unknown>(pageA, "GET", "/api/v1/watchlist");
      const listaArr = Array.isArray(lista.body)
        ? (lista.body as { id?: string }[])
        : (lista.body as { data?: { id?: string }[] })?.data ?? [];
      const existente = listaArr[0]?.id;
      if (existente) {
        entryId = existente;
      } else {
        const cat = await apiJson<{ data?: { id: string }[] }>(pageA, "GET", "/api/v1/midias");
        const midiaId = cat.body?.data?.[0]?.id;
        test.skip(!midiaId, "sem midia no catalogo para anexar");
        expect(midiaId).toBeTruthy();
        const add = await apiJson<{ id?: string }>(pageA, "POST", "/api/v1/watchlist", {
          midia_id: midiaId,
          coluna: "WANT",
        });
        expect([200, 201]).toContain(add.status);
        entryId = add.body?.id;
      }
      expect(entryId).toBeTruthy();

      await uiLogin(pageB, plusCreds!.email, plusCreds!.password);
      const res = await apiJson(pageB, "PATCH", `/api/v1/watchlist/${entryId}`, {
        reacao: "GOSTEI",
      });
      expect([404, 403, 401]).toContain(res.status);
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
    const res = await apiJson<{
      usuarios?: { total?: number };
      midias?: { total?: number };
    }>(page, "GET", "/api/v1/admin/stats");
    expect(res.status).toBe(200);
    expect(res.body?.usuarios?.total ?? 0).toBeGreaterThan(0);
    expect(res.body?.midias?.total ?? 0).toBeGreaterThan(0);
    await shot(page, "t305-f-admin-stats");
  });
});
