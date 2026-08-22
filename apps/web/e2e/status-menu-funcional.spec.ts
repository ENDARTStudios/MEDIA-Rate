import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

/**
 * T401 (D-374): fecha D-370.5. Usuário de teste VERIFICADO provisionado.
 * Menu '+' do CARD (T399): abrir → 'Assistindo' → watchlist; 'Remover' → some.
 */
test.describe("T401 — menu de status funcional", () => {
  const email = process.env.E2E_TEST_EMAIL ?? "free@mediarate.test";
  const password = process.env.E2E_TEST_PASSWORD ?? "Senha@123";

  test.beforeEach(async ({ page }) => {
    await login(page, email, password);
  });

  test("abrir menu '+' do card → 'Assistindo' persiste; 'Remover' tira", async ({ page }) => {
    await page.goto("/pt-BR/catalog?type=movie", { waitUntil: "domcontentloaded" });

    // Título do primeiro card.
    const firstCard = page.locator('a[role="article"]').first();
    const titulo = (await firstCard.locator("h3").first().innerText({ timeout: 15_000 })).trim();

    // Abre o popover do '+' compacto e seleciona 'Assistindo' (CONSUMINDO).
    await page.getByTestId("status-quick").first().click({ timeout: 15_000 });
    const popover = page.getByTestId("status-popover");
    await expect(popover).toBeVisible({ timeout: 5_000 });
    await popover.getByRole("button", { name: /Assistindo/i }).click();
    await expect(popover).toBeHidden({ timeout: 5_000 });
    // Aguarda o upsert persistir (otimista + fetch da watchlist).
    await page.waitForTimeout(1200);

    // Watchlist: coluna 'Assistindo' (key=WATCHING) contém o filme.
    await page.goto("/pt-BR/watchlist", { waitUntil: "domcontentloaded" });
    const colWatching = page.getByTestId("watchlist-column-WATCHING");
    await expect(colWatching).toContainText(titulo.slice(0, 12), { timeout: 20_000 });

    // 'Remover' → some da coluna.
    const card = colWatching.getByTestId("watchlist-card").first();
    await card.getByRole("button", { name: /Mover para/i }).click();
    const menu = page.getByTestId("card-status-menu").first();
    await expect(menu).toBeVisible({ timeout: 5_000 });
    await menu.getByRole("menuitem", { name: /Remover/i }).click();
    await expect(colWatching).not.toContainText(titulo.slice(0, 12), { timeout: 15_000 });
  });
});
