import { test, expect, type Page } from "@playwright/test";
import { apiLogin } from "./helpers/auth";

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
  // D-525/P1: autenticação via API (cookie jar compartilhado) — o login-UI é
  // fragil em contexto novo (consentimento/hidratação/lockout).
  await apiLogin(page, FREE_EMAIL!, FREE_PASSWORD!);
  // o api() in-page usa sessionStorage/CSRF — precisa estar numa página do app
  await page.goto(`${BASE}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1_000);
}

async function api<T = unknown>(
  page: Page,
  method: "GET" | "PUT",
  path: string,
  body?: unknown,
): Promise<{ status: number; body: T }> {
  // D-525/P1: csrf determinístico — lê do COOKIE (fallback do app); após
  // apiLogin o sessionStorage ainda não foi populado.
  const csrf = await page.evaluate(
    () =>
      document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)?.[1] ??
      sessionStorage.getItem("mediarate:csrf") ??
      "",
  );
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

  // D-527: CONCLUIDO → ABANDONADO é rejeitado pela máquina de estados.
  const put4 = await api(page, "PUT", `/api/v1/interacoes/${midiaId}`, {
    status: "ABANDONADO",
    motivoAbandono: "FALTA_TEMPO",
  });
  expect(put4.status).toBe(400);

  // GET /interacoes retorna envelope { items } (D-525) e o estado persiste.
  const list = await api<{ items?: { midia_id?: string; status?: string }[] }>(
    page,
    "GET",
    "/api/v1/interacoes",
  );
  expect(list.status).toBe(200);
  const entry = (list.body?.items ?? []).find((i) => i.midia_id === midiaId);
  expect(entry).toBeTruthy();
  expect(entry).toMatchObject({ status: "CONCLUIDO" });
});

test("T310: watchlist nunca expõe título cru (media sempre objeto com title ou dados_parciais)", async ({
  page,
}) => {
  test.skip(!FREE_EMAIL || !FREE_PASSWORD, "TEST_USER_FREE_* ausente");
  await login(page);

  const res = await api<{ media?: { title?: string | null; dados_parciais?: boolean } }[]>(
    page,
    "GET",
    "/api/v1/watchlist",
  );
  expect(res.status).toBe(200);
  const itens = res.body ?? [];
  for (const it of itens) {
    // T310: media nunca é null; se não há título, a flag dados_parciais permite
    // a UI aplicar a fallback chain (nunca o UUID cru como texto visível).
    expect(it.media).toBeTruthy();
    if (it.media && !it.media.title) {
      expect(it.media.dados_parciais).toBe(true);
    }
  }
});
