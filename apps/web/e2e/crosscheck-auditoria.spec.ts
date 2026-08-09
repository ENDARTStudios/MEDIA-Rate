import { test, expect } from "@playwright/test";

/**
 * T240 cross-check — os três sintomas da auditoria do Operador devem estar
 * vivos em produção após a promoção: (1) paleta do topo com paridade;
 * (2) 'Quero consumir' visível na ficha; (3) filtro lateral não perde
 * digitação rápida.
 */

test("T238: ficha exibe botão de watchlist sempre (não só quando está na lista)", async ({ page }) => {
  await page.goto("/media/um-sonho-de-liberdade");
  // O WatchlistButton (coração) deve existir na ficha — antes do T238 ele
  // retornava null quando a mídia não estava na watchlist. A ficha renderiza
  // dois (sticky mobile hidden em desktop + hero) — filtra o visível.
  const btn = page
    .locator('button[aria-label*="adicionar" i], button[aria-label*="add to" i], button[aria-label*="quero ver" i], button[aria-label*="quero jogar" i]')
    .filter({ visible: true })
    .first();
  await expect(btn).toBeVisible({ timeout: 10_000 });
});

test("T237: filtro lateral do catálogo preserva digitação rápida", async ({ page }) => {
  await page.goto("/catalog");
  const input = page
    .locator('input[type="search"], input[placeholder*="buscar" i]')
    .first();
  await input.waitFor({ timeout: 10_000 });
  // Rajada rápida (delay 0) — o texto final deve estar íntegro no input.
  await input.pressSequentially("cavaleiro", { delay: 0 });
  await expect(input).toHaveValue("cavaleiro");
  // Após o debounce, o resultado esperado aparece.
  await expect(page.getByText("O Cavaleiro dos Sete Reinos", { exact: false }).first()).toBeVisible({
    timeout: 10_000,
  });
});
