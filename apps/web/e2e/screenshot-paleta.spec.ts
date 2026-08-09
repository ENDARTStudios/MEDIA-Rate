import { test, expect } from "@playwright/test";

test("screenshot da paleta com 'acao' (evidência D-244)", async ({ page }) => {
  await page.goto("/");
  const botao = page.locator('button[aria-label*="buscar" i], button[aria-label*="search" i]').first();
  await botao.waitFor({ timeout: 10_000 });
  await botao.click();
  const input = page.locator('input[placeholder*="buscar" i], input[placeholder*="search" i]').first();
  await input.waitFor({ timeout: 5_000 });
  await input.pressSequentially("acao", { delay: 0 });
  await expect(page.getByText("Coringa", { exact: false }).first()).toBeVisible({ timeout: 8_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/paleta-acao.png", fullPage: false });
});
