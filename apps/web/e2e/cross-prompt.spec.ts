import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers/auth";

/**
 * T405/D-400 — guarda do cross-prompt inline (T199 §3.3). Mídia determinística
 * com relação cross-mídia: "Duna: Parte Dois" (FILME → ADAPTACAO_DE → livro
 * "Duna"). Idempotente: remove a mídia da watchlist (se presente) antes de
 * clicar, para o coração SEMPRE adicionar (e não abrir o picker de coluna).
 */
const FREE_EMAIL = process.env.E2E_FREE_EMAIL ?? "free@mediarate.test";
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";

async function removeFromWatchlist(page: Page, slug: string): Promise<boolean> {
  const csrf = await page.evaluate(() => sessionStorage.getItem("mediarate:csrf") ?? "");
  return page.evaluate(
    async ({ slug, csrf }) => {
      const r = await fetch("/api/v1/watchlist", {
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      const data = (await r.json()) as
        | { items?: { id?: string; media?: { slug?: string; title?: string } | null }[] }
        | { id?: string; media?: { slug?: string; title?: string } | null }[];
      const items = Array.isArray(data) ? data : (data.items ?? []);
      const entry = items.find(
        (e) => e.media?.slug === slug || e.media?.title === "Duna: Parte Dois",
      );
      if (entry?.id) {
        await fetch("/api/v1/watchlist/" + entry.id, {
          method: "DELETE",
          headers: { "X-CSRF-Token": csrf ?? "" },
          credentials: "include",
        });
      }
      return !!entry?.id;
    },
    { slug, csrf },
  );
}

test("cross-prompt aparece ao adicionar mídia com relação cross-mídia (ficha)", async ({
  page,
}) => {
  test.skip(!PASSWORD, "E2E credenciais não definidas");
  await login(page, FREE_EMAIL, PASSWORD);
  await page.goto("/pt-BR/media/duna-parte-dois", { waitUntil: "domcontentloaded" });

  // Idempotência: garante que a mídia NÃO está na watchlist antes de adicionar.
  await removeFromWatchlist(page, "duna-parte-dois");
  await page.reload({ waitUntil: "domcontentloaded" });

  // Alvo preciso: o coração da watchlist (aria-label contém "watchlist"),
  // não o controle de status "Quero ver" (que também casa com "quero").
  const heart = page.locator('button[aria-label*="watchlist" i]').filter({ visible: true }).first();
  await heart.click({ timeout: 15_000 });

  await expect(page.getByTestId("watchlist-cross-prompt")).toBeVisible({ timeout: 10_000 });
});
