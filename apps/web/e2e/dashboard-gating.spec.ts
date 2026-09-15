import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

/**
 * T402 (D-378): gating do dashboard por plano (default: radar=Plus, evolução=
 * Premium; timeline/histograma/streak = todos). Free vê preview borrado + CTA.
 */
test.describe("T402 — gating do dashboard por plano", () => {
  test.beforeEach(() => {
    test.skip(
      process.env.E2E_FULL !== "1",
      "T461: requer API+DB (E2E_FULL=1) — CI sobe so o web; ver docs/E2E.md",
    );
  });

  const password = process.env.E2E_TEST_PASSWORD ?? "Senha@123";

  test("Free → radar e evolução borrados com CTA (2 previews)", async ({ page }) => {
    await login(page, "free@mediarate.test", password);
    await page.goto("/pt-BR/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("gated-preview")).toHaveCount(2, { timeout: 20_000 });
    // timeline/histograma/streak continuam visíveis para o Free.
    await expect(page.getByText(/Sequência de dias|dias consecutivos/i).first()).toBeVisible();
  });

  test("Plus → radar real (1 preview restante = evolução)", async ({ page }) => {
    await login(page, "plus@mediarate.test", password);
    await page.goto("/pt-BR/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("gated-preview")).toHaveCount(1, { timeout: 20_000 });
  });

  test("Premium → nenhum preview gated", async ({ page }) => {
    await login(page, "premium@mediarate.test", password);
    await page.goto("/pt-BR/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("gated-preview")).toHaveCount(0, { timeout: 20_000 });
  });
});
