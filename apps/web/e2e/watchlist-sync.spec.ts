import { test, expect, type Page } from "@playwright/test";

/**
 * T320/D-309 — fonte única de verdade: status dirige a coluna e a coluna
 * dirige o status (nunca divergem). Conta provisionada via env; contrato via
 * fetch in-page (cookies+CSRF). Skippado sem credenciais/backend.
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
  method: "GET" | "POST" | "PUT" | "PATCH",
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

test("T320: status dirige a coluna e a coluna dirige o status", async ({ page }) => {
  test.skip(!FREE_EMAIL || !FREE_PASSWORD, "TEST_USER_FREE_* ausente");
  await login(page);

  const cat = await api<{ data?: { id: string }[] }>(page, "GET", "/api/v1/midias");
  const midiaId = cat.body?.data?.[0]?.id;
  test.skip(!midiaId, "sem mídia no catálogo");

  // Limpa estado prévio (entrada/interação antigas podem existir).
  const wl = await api<{ id?: string; midia_id?: string; coluna?: string }[]>(
    page,
    "GET",
    "/api/v1/watchlist",
  );
  const existente = (wl.body ?? []).find((e) => e.midia_id === midiaId);
  if (existente?.id) {
    await api(page, "PATCH", `/api/v1/watchlist/${existente.id}/move`, { coluna: "WANT" });
  }

  // Status → coluna: CONSUMINDO deve refletir WATCHING no GET da watchlist.
  const put = await api(page, "PUT", `/api/v1/interacoes/${midiaId}`, { status: "CONSUMINDO" });
  expect(put.status).toBe(200);
  const wl2 = await api<{ id?: string; midia_id?: string; coluna?: string }[]>(
    page,
    "GET",
    "/api/v1/watchlist",
  );
  const entry2 = (wl2.body ?? []).find((e) => e.midia_id === midiaId);
  expect(entry2?.coluna).toBe("WATCHING");

  // Coluna → status: mover para WANT deve refletir QUERO_CONSUMIR na interação.
  const move = await api(page, "PATCH", `/api/v1/watchlist/${entry2!.id}/move`, { coluna: "WANT" });
  expect(move.status).toBe(200);
  const inter = await api<{ status?: string }[]>(page, "GET", "/api/v1/interacoes");
  const i = (inter.body ?? []).find((x) => x.midia_id === midiaId);
  expect(i?.status).toBe("QUERO_CONSUMIR");
});

test("T322: órfão não-UUID re-vincula para canônica (recovery owner-only)", async ({ page }) => {
  test.skip(!FREE_EMAIL || !FREE_PASSWORD, "TEST_USER_FREE_* ausente");
  await login(page);

  const cat = await api<{ data?: { id: string }[] }>(page, "GET", "/api/v1/midias");
  const midiaId = cat.body?.data?.[0]?.id;
  test.skip(!midiaId, "sem mídia no catálogo");

  // Órfão: midia_id não-UUID (id externo/aresta de grafo) — sem mídia resolvível.
  const add = await api<{ id?: string; midia_id?: string }>(page, "POST", "/api/v1/watchlist", {
    midia_id: "orphan-e2e-t322",
    coluna: "COMPLETED",
  });
  expect(add.status).toBe(201);
  const orphanId = add.body?.id;
  test.skip(!orphanId, "não criou entrada órfã");

  // Recovery: re-linka a entrada para a mídia canônica escolhida.
  const relink = await api(page, "PATCH", `/api/v1/watchlist/${orphanId}/relink`, {
    midia_id: midiaId,
  });
  expect(relink.status).toBe(200);

  const wl = await api<{ id?: string; midia_id?: string }[]>(page, "GET", "/api/v1/watchlist");
  const entry = (wl.body ?? []).find((e) => e.id === orphanId);
  expect(entry?.midia_id).toBe(midiaId);
});
