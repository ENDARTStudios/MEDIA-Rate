import { test, expect } from "@playwright/test";

/**
 * T246 — Ctrl+K (Windows/Linux) e ⌘K (Mac) abrem a paleta e a busca
 * retorna os 5 títulos do /discover para 'acao'. Verificação UI real.
 */
const CINCO_TITULOS = [
  "Em Movimento",
  "Coringa",
  "Os SUPERtontos",
  "Taxi Driver: Motorista de Táxi",
  "Mortal Kombat Legends: A Vingança de Scorpion",
];

async function abrirComTecla(page: import("@playwright/test").Page, modifier: "Control" | "Meta") {
  await page.goto("/");
  await page.waitForTimeout(1000);
  await page.keyboard.press(`${modifier}+KeyK`);
  const input = page.locator('input[placeholder*="buscar" i], input[placeholder*="search" i]').first();
  await input.waitFor({ timeout: 8_000 });
  return input;
}

test("T246: Ctrl+K abre a paleta e busca 'acao' → 5 títulos", async ({ page }) => {
  const input = await abrirComTecla(page, "Control");
  await input.pressSequentially("acao", { delay: 0 });
  for (const titulo of CINCO_TITULOS) {
    await expect(page.getByText(titulo, { exact: false }).first()).toBeVisible({ timeout: 8_000 });
  }
});

test("T246: Meta+K (Mac) também abre e busca", async ({ page }) => {
  const input = await abrirComTecla(page, "Meta");
  await input.pressSequentially("acao", { delay: 0 });
  for (const titulo of CINCO_TITULOS) {
    await expect(page.getByText(titulo, { exact: false }).first()).toBeVisible({ timeout: 8_000 });
  }
});
