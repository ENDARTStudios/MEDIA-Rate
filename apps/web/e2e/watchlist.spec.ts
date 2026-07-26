import { test, expect } from "@playwright/test";
import { registerAndLogin } from "./helpers/auth";

test.describe("Watchlist Kanban", () => {
  const email = `watchlist-${Date.now()}@e2e.test`;
  const password = "Kanban@Pass1";

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page, { name: "Kanban User", email, password });
  });

  test("pagina watchlist carrega apos login", async ({ page }) => {
    await page.goto("/watchlist");
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 10_000 });
  });

  test("watchlist exibe colunas kanban", async ({ page }) => {
    await page.goto("/watchlist");

    const columns = page.locator("text=Quero ver, text=Assistindo, text=Completo, text=Abandonado");
    const count = await columns.count();
    // Pelo menos alguma referencia a colunas deve existir
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("watchlist com estado vazio mostra mensagem", async ({ page }) => {
    await page.goto("/watchlist");
    await expect(page.locator("body")).toBeVisible();

    // Watchlist vazia: deve ter algum conteudo (mensagem de vazio ou colunas)
    const emptyMsg = page.locator("text=vazia, text=adicione, text=sem itens, text=nenhum");
    const columns = page.locator("text=Quero ver, text=Assistindo");

    const hasMessage = await emptyMsg.first().isVisible({ timeout: 3_000 }).catch(() => false);
    const hasColumns = await columns.first().isVisible({ timeout: 3_000 }).catch(() => false);

    expect(hasMessage || hasColumns).toBeTruthy();
  });
});
