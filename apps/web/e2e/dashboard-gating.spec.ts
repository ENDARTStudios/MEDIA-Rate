import { test, expect } from "@playwright/test";
import { apiLogin } from "./helpers/auth";

/**
 * T402 (D-378): gating do dashboard por plano, consolidado na auditoria S1
 * (dashboard única = DashboardOverview): radar/taxonomia = Plus+;
 * evolução/pulso = Premium. Streak/histograma/feed = todos os planos.
 * Free → 4 previews (radar, evolução, taxonomia, pulso); Plus → 2; Premium → 0.
 */
test.describe("T402 — gating do dashboard por plano", () => {
  test.beforeEach(() => {
    test.skip(
      process.env.E2E_FULL !== "1",
      "T461: requer API+DB (E2E_FULL=1) — CI sobe so o web; ver docs/E2E.md",
    );
  });

  const password = process.env.E2E_TEST_PASSWORD ?? "Senha@123";

  test("Free → radar/evolução/taxonomia/pulso borrados com CTA (4 previews)", async ({ page }) => {
    await apiLogin(page, "free@mediarate.test", password);
    await page.goto("/pt-BR/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("gated-preview")).toHaveCount(4, { timeout: 20_000 });
    // streak/histograma continuam visíveis para o Free (T396: todos os planos).
    await expect(page.getByText(/Sequência de dias|dias consecutivos/i).first()).toBeVisible();
  });

  test("Plus → radar/taxonomia reais; evolução/pulso borrados (2 previews)", async ({ page }) => {
    await apiLogin(page, "plus@mediarate.test", password);
    await page.goto("/pt-BR/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("gated-preview")).toHaveCount(2, { timeout: 20_000 });
    await expect(page.getByTestId("overview-radar").getByRole("img")).toBeVisible();
    await expect(page.getByTestId("overview-taxonomy")).toBeVisible();
  });

  test("Premium → nenhum preview gated; evolução real", async ({ page }) => {
    await apiLogin(page, "premium@mediarate.test", password);
    await page.goto("/pt-BR/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("gated-preview")).toHaveCount(0, { timeout: 20_000 });
    await expect(
      page.getByTestId("overview-evolution").locator("svg.recharts-surface"),
    ).toBeVisible();
    await expect(page.getByTestId("overview-pulse").locator("svg.recharts-surface")).toBeVisible();
  });
});
