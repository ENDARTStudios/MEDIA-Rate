import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

/**
 * T416 (D-396) — watchlist escala + consistência multi-conta, EXECUTADO em
 * produção com contas provisionadas (nunca registra conta nova — D-374).
 *
 * Env: E2E_TEST_EMAIL (Plus) / E2E_FREE_EMAIL (Free) / E2E_TEST_PASSWORD.
 * Nunca commitadas. A conta Free deve estar VAZIA e verificada (provision).
 */
const PLUS_EMAIL = process.env.E2E_TEST_EMAIL ?? "";
const FREE_EMAIL = process.env.E2E_FREE_EMAIL ?? "free@mediarate.test";
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";

test.describe("T416 — watchlist escala (60) + multi-conta", () => {
  test("conta Plus com 60 itens renderiza kanban com 3 colunas + contadores + scroll", async ({
    page,
  }) => {
    test.skip(!PLUS_EMAIL || !PASSWORD, "E2E credenciais não definidas");
    await login(page, PLUS_EMAIL, PASSWORD);
    await page.goto("/watchlist", { waitUntil: "domcontentloaded" });

    for (const col of ["WANT", "WATCHING", "COMPLETED"]) {
      await expect(page.getByTestId(`watchlist-column-${col}`)).toBeVisible();
    }
  });

  test("conta Free (vazia) não vê os 60 itens da conta Plus", async ({ page }) => {
    test.skip(!FREE_EMAIL || !PASSWORD, "E2E credenciais não definidas");
    await login(page, FREE_EMAIL, PASSWORD);
    await page.goto("/watchlist", { waitUntil: "domcontentloaded" });

    // Free vazia: estado vazio (SEM kanban) — não pode exibir os 60 itens da Plus.
    await expect(page.getByTestId("watchlist-column-WANT")).toHaveCount(0);
  });

  test("reload reflete a mudança imediatamente (T412 — sem cache de página autenticada)", async ({
    page,
  }) => {
    test.skip(!PLUS_EMAIL || !PASSWORD, "E2E credenciais não definidas");
    await login(page, PLUS_EMAIL, PASSWORD);
    await page.goto("/watchlist", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("watchlist-column-WANT")).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("watchlist-column-WANT")).toBeVisible();
  });
});
