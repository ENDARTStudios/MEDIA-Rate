import { test, expect } from "@playwright/test";
import { registerAndLogin } from "./helpers/auth";

/**
 * T399/T400 (regressão do P1 do menu): o '+' ABRE o menu de status e a opção
 * persiste na watchlist; 'Remover' tira o item. Fecha D-370.5:
 * abrir → 'Assistindo' → watchlist; 'Remover' → some.
 */
test.describe("T400 — menu de status funcional", () => {
  const email = `status-menu-${Date.now()}@e2e.test`;
  const password = "Menu@Pass1";

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page, { name: "Menu User", email, password });
  });

  test("abrir menu → 'Assistindo' persiste; 'Remover' tira da watchlist", async ({ page }) => {
    // Ficha do filme (título PT 'O Enigma de Outro Mundo') — controle completo.
    await page.goto("/pt-BR/media/o-enigma-de-outro-mundo", { waitUntil: "domcontentloaded" });

    const control = page.getByTestId("status-control-full").first();
    await control.click({ timeout: 15_000 });
    const popover = page.getByTestId("status-popover");
    await expect(popover).toBeVisible({ timeout: 5_000 });

    // Seleciona 'Assistindo' (CONSUMINDO) — persiste e fecha o popover.
    await popover.getByRole("button", { name: /Assistindo/i }).click();

    // Watchlist: coluna 'Assistindo' (key=watching) contém o filme.
    await page.goto("/pt-BR/watchlist", { waitUntil: "domcontentloaded" });
    const colWatching = page.getByTestId("watchlist-column-watching");
    await expect(colWatching).toContainText("Enigma", { timeout: 20_000 });

    // 'Remover' → some da coluna.
    await colWatching.locator("button").first().click();
    const menu = page.getByTestId("card-status-menu").first();
    await expect(menu).toBeVisible({ timeout: 5_000 });
    await menu.getByRole("menuitem", { name: /Remover/i }).click();
    await expect(colWatching).not.toContainText("Enigma", { timeout: 15_000 });
  });
});
