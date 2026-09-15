/**
 * [verify-prod] T462 (D-493) — verificação MANUAL contra deploy real.
 * NÃO roda no CI (fora do testDir da allowlist; nunca rodar contra o banco
 * de produção sem conta de teste). Uso:
 *   cd apps/web && E2E_BASE_URL=https://mediarate.app  *     npx playwright test -c scripts/verify-prod/playwright.verify.config.ts  *     scripts/verify-prod/search-topo.spec.ts
 * Pré-requisitos: env com credenciais de teste quando o spec autentica.
 */

import { test, expect, type Page } from "@playwright/test";

/**
 * T240 — buscador geral do topo (paleta ⌘K) deve retornar os resultados
 * reais do /discover com paridade de acentos: 'acao' ≡ 'ação' = 5 títulos.
 *
 * Uso: PLAYWRIGHT_BASE_URL=https://media-rate-web.vercel.app npx playwright
 * test e2e/search-topo.spec.ts
 */
const CINCO_TITULOS = [
  "Em Movimento",
  "Coringa",
  "Os SUPERtontos",
  "Taxi Driver: Motorista de Táxi",
  "Mortal Kombat Legends: A Vingança de Scorpion",
];

async function abrirPaletaETipar(page: Page, texto: string) {
  await page.goto("/");
  // Paleta ⌘K: botão com aria-label de busca no navbar.
  const botao = page
    .locator('button[aria-label*="buscar" i], button[aria-label*="search" i]')
    .first();
  await botao.waitFor({ timeout: 10_000 });
  await botao.click();
  const input = page
    .locator('input[placeholder*="buscar" i], input[placeholder*="search" i]')
    .first();
  await input.waitFor({ timeout: 5_000 });
  await input.pressSequentially(texto, { delay: 0 });
  return input;
}

test("paleta: 'acao' (sem acento) lista os 5 títulos do /discover", async ({ page }) => {
  await abrirPaletaETipar(page, "acao");
  for (const titulo of CINCO_TITULOS) {
    await expect(page.getByText(titulo, { exact: false }).first()).toBeVisible({ timeout: 8_000 });
  }
});

test("paleta: 'ação' (com acento) retorna o MESMO conjunto (paridade)", async ({ page }) => {
  await abrirPaletaETipar(page, "ação");
  for (const titulo of CINCO_TITULOS) {
    await expect(page.getByText(titulo, { exact: false }).first()).toBeVisible({ timeout: 8_000 });
  }
});

test("paleta: nunca mostra 'Nenhum resultado' para 'acao'", async ({ page }) => {
  await abrirPaletaETipar(page, "acao");
  await page.waitForTimeout(1_500);
  await expect(page.getByText(/nenhum resultado/i)).toHaveCount(0);
});
