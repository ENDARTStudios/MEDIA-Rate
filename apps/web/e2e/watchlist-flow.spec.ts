import { test, expect, type Page } from "@playwright/test";

/**
 * T308 — fluxo de status de consumo/watchlist (regressão do "expected object,
 * received string"). Conta provisionada via env (TEST_USER_FREE_*) e contrato
 * via fetch in-page (cookies+CSRF), como o app faz. Skippado sem credenciais
 * ou sem backend acessível (CI e2e sem API dedicada).
 */
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000/pt-BR";
const FREE_EMAIL = process.env.TEST_USER_FREE_EMAIL;
const FREE_PASSWORD = process.env.TEST_USER_FREE_PASSWORD;

async function login(page: Page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.locator('input[name="email"]').first().fill(FREE_EMAIL!);
  await page.locator('input[type="password"]').first().fill(FREE_PASSWORD!);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL("**/dashboard", { timeout: 20_000 });
}

async function api<T = unknown>(
  page: Page,
  method: "GET" | "PUT",
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
          "Accept": "application/json",
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

test("T308: fluxo de status de consumo persiste (4 status + reação)", async ({ page }) => {
  test.skip(!FREE_EMAIL || !FREE_PASSWORD, "TEST_USER_FREE_* ausente");
  await login(page);

  const cat = await api<{ data?: { id: string }[] }>(page, "GET", "/api/v1/midias");
  const midiaId = cat.body?.data?.[0]?.id;
  test.skip(!midiaId, "sem mídia no catálogo");

  const put1 = await api(page, "PUT", `/api/v1/interacoes/${midiaId}`, {
    status: "QUERO_CONSUMIR",
  });
  expect(put1.status).toBe(200);

  const put2 = await api(page, "PUT", `/api/v1/interacoes/${midiaId}`, { status: "CONSUMINDO" });
  expect(put2.status).toBe(200);

  const put3 = await api(page, "PUT", `/api/v1/interacoes/${midiaId}`, {
    status: "CONCLUIDO",
    reacao: "GOSTEI",
  });
  expect(put3.status).toBe(200);

  const put4 = await api(page, "PUT", `/api/v1/interacoes/${midiaId}`, {
    status: "ABANDONADO",
    motivoAbandono: "FALTA_TEMPO",
  });
  expect(put4.status).toBe(200);

  const list = await api<{ status?: string }[]>(page, "GET", "/api/v1/interacoes");
  expect(list.status).toBe(200);
  const entry = (list.body as { midia_id?: string }[]).find((i) => i.midia_id === midiaId);
  expect(entry).toBeTruthy();
  expect(entry).toMatchObject({ status: "ABANDONADO" });
});
