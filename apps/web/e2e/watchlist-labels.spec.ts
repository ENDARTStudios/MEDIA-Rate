import { test, expect } from "@playwright/test";

/**
 * T239 — vocabulário por tipo no WatchlistButton da ficha (sem login):
 * o tooltip/aria-label usa colunaLabelKey(mediaType, status). Para mídia
 * JÁ na watchlist o rótulo é por tipo; para fora da lista é o genérico
 * "add". A verificação de UI do popover (logado) fica para o Operador;
 * a matriz tipo×coluna×locale está coberta por watchlist-labels.spec.
 */

test("T239: ficha de game carrega com botão de watchlist visível", async ({ page }) => {
  await page.goto("/media/terraria");
  const btn = page
    .locator('button[aria-label*="add" i], button[aria-label*="quero" i], button[aria-label*="want" i]')
    .filter({ visible: true })
    .first();
  await expect(btn).toBeVisible({ timeout: 10_000 });
});
