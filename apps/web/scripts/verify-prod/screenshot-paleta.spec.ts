/**
 * [verify-prod] T462 (D-493) — verificação MANUAL contra deploy real.
 * NÃO roda no CI (fora do testDir da allowlist; nunca rodar contra o banco
 * de produção sem conta de teste). Uso:
 *   cd apps/web && E2E_BASE_URL=https://mediarate.app  *     npx playwright test -c scripts/verify-prod/playwright.verify.config.ts  *     scripts/verify-prod/screenshot-paleta.spec.ts
 * Pré-requisitos: env com credenciais de teste quando o spec autentica.
 */

import { test, expect } from "@playwright/test";

test("screenshot da paleta com 'acao' (evidência D-244)", async ({ page }) => {
  await page.goto("/");
  const botao = page
    .locator('button[aria-label*="buscar" i], button[aria-label*="search" i]')
    .first();
  await botao.waitFor({ timeout: 10_000 });
  await botao.click();
  const input = page
    .locator('input[placeholder*="buscar" i], input[placeholder*="search" i]')
    .first();
  await input.waitFor({ timeout: 5_000 });
  await input.pressSequentially("acao", { delay: 0 });
  await expect(page.getByText("Coringa", { exact: false }).first()).toBeVisible({ timeout: 8_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/paleta-acao.png", fullPage: false });
});
