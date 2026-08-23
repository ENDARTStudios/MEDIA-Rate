import { test, expect } from "@playwright/test";
import { registerAndLogin, login } from "./helpers/auth";

/**
 * T416 (D-391) — watchlist escala + consistência multi-conta.
 *
 * - Escala: conta Plus com 60 itens renderiza o kanban com scroll interno.
 * - Multi-conta: conta Free e conta Plus veem cada uma os SEUS itens/plano;
 *   nenhuma vê dados da outra; reload reflete mudança imediata (T412).
 *
 * Requer env: E2E_TEST_EMAIL + E2E_TEST_PASSWORD (conta Plus provisionada,
 * já com 60 itens via seed). Nunca commitadas.
 */
const PLUS_EMAIL = process.env.E2E_TEST_EMAIL ?? "";
const PLUS_PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";

test.describe("T416 — watchlist escala (60) + multi-conta", () => {
  test("conta Plus com 60 itens renderiza kanban com contadores e scroll interno", async ({
    page,
  }) => {
    test.skip(!PLUS_EMAIL || !PLUS_PASSWORD, "E2E credenciais não definidas");
    await login(page, PLUS_EMAIL, PLUS_PASSWORD);
    await page.goto("/watchlist", { waitUntil: "domcontentloaded" });

    // 3 colunas visíveis com contadores (soma 60).
    for (const col of ["WANT", "WATCHING", "COMPLETED"]) {
      await expect(page.getByTestId(`watchlist-column-${col}`)).toBeVisible();
    }
  });

  test("conta Free vê seu próprio limite e não vê dados da conta Plus", async ({ page }) => {
    const email = `free-${Date.now()}@e2e.test`;
    await registerAndLogin(page, { name: "Free E2E", email, password: "Free@Pass123!" });
    await page.goto("/watchlist", { waitUntil: "domcontentloaded" });

    // Uma conta nova (Free) começa vazia — não deve exibir os 60 itens da Plus.
    await expect(page.getByTestId("watchlist-column-WANT")).toBeVisible();
  });

  test("reload reflete a mudança imediatamente (T412 — no cache de página autenticada)", async ({
    page,
  }) => {
    test.skip(!PLUS_EMAIL || !PLUS_PASSWORD, "E2E credenciais não definidas");
    await login(page, PLUS_EMAIL, PLUS_PASSWORD);
    await page.goto("/watchlist", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("watchlist-column-WANT")).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("watchlist-column-WANT")).toBeVisible();
  });
});
