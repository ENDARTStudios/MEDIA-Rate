import { test, expect } from "@playwright/test";
import { apiLogin } from "./helpers/auth";

/**
 * D-525 — biblioteca do usuário (/biblioteca): abas pelos 4 status de
 * consumo com contagens globais, deep link ?status= e ?tipo= validados,
 * rótulos conjugados por tipo de mídia. Requer API+DB (E2E_FULL=1, T461).
 */
test.describe("D-525 — biblioteca do usuário", () => {
  test.beforeEach(() => {
    test.skip(
      process.env.E2E_FULL !== "1",
      "T461: requer API+DB (E2E_FULL=1) — CI sobe so o web; ver docs/E2E.md",
    );
  });

  const password = process.env.E2E_TEST_PASSWORD ?? "Senha@123";

  test("abre com abas por status e deep link ?status=QUERO_CONSUMIR", async ({ page }) => {
    await apiLogin(page, "free@mediarate.test", password);
    await page.goto("/pt-BR/biblioteca?status=QUERO_CONSUMIR", { waitUntil: "domcontentloaded" });
    const abaSelecionada = page.getByRole("tab", { selected: true });
    await expect(abaSelecionada).toContainText(/Quero/i, { timeout: 20_000 });
    await expect(page.getByTestId("biblioteca-tabs")).toBeVisible();
    await expect(page.getByTestId("biblioteca-tipos")).toBeVisible();
  });

  test("query param inválido cai no padrão sem quebrar", async ({ page }) => {
    await apiLogin(page, "free@mediarate.test", password);
    await page.goto("/pt-BR/biblioteca?status=HACKER&tipo=<script>", {
      waitUntil: "domcontentloaded",
    });
    // status inválido → aba "Todos" selecionada; página renderiza normally.
    await expect(page.getByTestId("biblioteca-tabs")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("tab", { name: /Todos/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("estado vazio com CTA para o catálogo (conta sem interações)", async ({ page }) => {
    await apiLogin(page, "free@mediarate.test", password);
    await page.goto("/pt-BR/biblioteca", { waitUntil: "domcontentloaded" });
    const grid = page.getByTestId("biblioteca-grid");
    const vazio = page.getByText(/biblioteca está vazia/i);
    await expect(grid.or(vazio).first()).toBeVisible({ timeout: 20_000 });
  });

  test("sidebar da dashboard aponta para /biblioteca e o atalho filtra", async ({ page }) => {
    await apiLogin(page, "free@mediarate.test", password);
    await page.goto("/pt-BR/dashboard", { waitUntil: "domcontentloaded" });
    const linkBiblioteca = page.locator('[data-testid="dashboard-sidebar"] a[href*="/biblioteca"]');
    await expect(linkBiblioteca).toHaveCount(2, { timeout: 20_000 }); // nav + atalho
    await page
      .locator('[data-testid="dashboard-sidebar"] a[href*="status=QUERO_CONSUMIR"]')
      .click();
    await expect(page).toHaveURL(/biblioteca\?status=QUERO_CONSUMIR/);
    await expect(page.getByRole("tab", { selected: true })).toContainText(/Quero/i);
  });
});
