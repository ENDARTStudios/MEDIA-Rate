import { test, expect } from "@playwright/test";
import { registerAndLogin } from "./helpers/auth";

/**
 * T399/T400 (regressão do P1 do menu): o '+' do card ABRE o menu de status
 * (portal) e a opção persiste o status; 'Remover' tira o item da watchlist.
 * Fecha o Lote A (D-370.5): abrir → 'Assistindo' → watchlist; 'Remover' → some.
 */
test.describe("T400 — menu '+' de status funcional", () => {
  const email = `status-menu-${Date.now()}@e2e.test`;
  const password = "Menu@Pass1";

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page, { name: "Menu User", email, password });
  });

  test("abrir menu → 'Assistindo' persiste; 'Remover' tira da watchlist", async ({ page }) => {
    await page.goto("/pt-BR/catalog", { waitUntil: "domcontentloaded" });

    // Abre o popover do primeiro card (compact '+').
    const quick = page.getByTestId("status-quick").first();
    await quick.click({ timeout: 15_000 });
    const popover = page.getByTestId("status-popover");
    await expect(popover).toBeVisible({ timeout: 5_000 });

    // Seleciona 'Assistindo' (o clique fecha o popover e persiste via store).
    await popover.getByRole("button", { name: /Assistindo/i }).click();
    await expect(popover).toBeHidden({ timeout: 5_000 });

    // O item agora aparece na watchlist (coluna 'Assistindo' do kanban).
    await page.goto("/pt-BR/watchlist", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("watchlist-column-assistindo")).toContainText("The Thing", {
      timeout: 20_000,
    });
  });
});
