import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

/**
 * T405/D-400 — guarda do cross-prompt inline (T199 §3.3). Mídia determinística
 * com relação cross-mídia: "Duna: Parte Dois" (FILME → ADAPTACAO_DE → livro
 * "Duna"). Conta Free (watchlist vazia) garante que o clique no coração ADICIONA
 * (e não abre o picker de coluna) → cross-prompt aparece.
 */
const FREE_EMAIL = process.env.E2E_FREE_EMAIL ?? "free@mediarate.test";
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";

test("cross-prompt aparece ao adicionar mídia com relação cross-mídia (ficha)", async ({
  page,
}) => {
  test.skip(!PASSWORD, "E2E credenciais não definidas");
  await login(page, FREE_EMAIL, PASSWORD);
  await page.goto("/pt-BR/media/duna-parte-dois", { waitUntil: "domcontentloaded" });

  const heart = page
    .locator(
      'button[aria-label*="adicionar" i], button[aria-label*="add to" i], button[aria-label*="quero" i]',
    )
    .filter({ visible: true })
    .first();
  await heart.click({ timeout: 15_000 });

  await expect(page.getByTestId("watchlist-cross-prompt")).toBeVisible({ timeout: 10_000 });
});
