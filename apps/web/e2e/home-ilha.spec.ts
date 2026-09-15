import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

/**
 * T405/D-400 — guarda da ilha delegada do carrossel da HOME (U2/U3).
 * Cobre a interação NOVA (event delegation, botões estáticos data-*):
 *   (1) '+' do carrossel → popover → 'Assistindo' → item na watchlist;
 *   (2) coração adiciona/preenche e persiste via cookie após reload;
 *   (3) anônimo clica coração → 401 → redirect para /login (cross-prompt
 *       anônimo = prompt de login, nunca falha silenciosa — D-399 globals).
 */
const PLUS_EMAIL = process.env.E2E_TEST_EMAIL ?? "plus@mediarate.test";
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";

test.describe("T405 home-ilha — carrossel com event delegation", () => {
  test.beforeEach(() => {
    test.skip(
      process.env.E2E_FULL !== "1",
      "T461: requer API+DB (E2E_FULL=1) — CI sobe so o web; ver docs/E2E.md",
    );
  });

  test("'+' do carrossel abre popover, seta 'Assistindo' e cai na watchlist", async ({ page }) => {
    test.skip(!PASSWORD, "E2E credenciais não definidas");
    await login(page, PLUS_EMAIL, PASSWORD);
    await page.goto("/pt-BR", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000); // hidratação da ilha (listener delegado)

    const movie = page.locator('[data-testid="carousel-movie"]');
    const card = movie.locator("a[role=article]").first();
    const titulo = (await card.locator("h3").first().innerText({ timeout: 15_000 })).trim();

    await movie.locator('[data-card-action="status"]').first().click({ timeout: 15_000 });
    const popover = page.getByTestId("status-popover");
    await expect(popover).toBeVisible({ timeout: 5_000 });
    await popover.getByRole("button", { name: /Assistindo/i }).click();
    await expect(popover).toBeHidden({ timeout: 5_000 });
    await page.waitForTimeout(1200);

    await page.goto("/pt-BR/watchlist", { waitUntil: "domcontentloaded" });
    const colWatching = page.getByTestId("watchlist-column-WATCHING");
    await expect(colWatching).toContainText(titulo.slice(0, 12), { timeout: 20_000 });
  });

  test("coração do carrossel preenche e persiste (cookie) após reload", async ({ page }) => {
    test.skip(!PASSWORD, "E2E credenciais não definidas");
    await login(page, PLUS_EMAIL, PASSWORD);
    await page.goto("/pt-BR", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const heart = page
      .locator('[data-testid="carousel-movie"] [data-card-action="watchlist"]')
      .first();
    await heart.click({ timeout: 15_000 });
    await expect(heart).toHaveAttribute("data-in-watchlist", "true", { timeout: 8_000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    const heartAfter = page
      .locator('[data-testid="carousel-movie"] [data-card-action="watchlist"]')
      .first();
    await expect(heartAfter).toHaveAttribute("data-in-watchlist", "true", { timeout: 10_000 });
  });

  test("anônimo clica coração → redirect para /login (401, sem falha silenciosa)", async ({
    page,
  }) => {
    await page.goto("/pt-BR", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    await page
      .locator('[data-testid="carousel-movie"] [data-card-action="watchlist"]')
      .first()
      .click({ timeout: 15_000 });
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  });
});
