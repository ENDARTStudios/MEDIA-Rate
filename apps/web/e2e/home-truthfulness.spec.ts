import { test, expect } from "@playwright/test";

/**
 * BETA-GAP-05 / T121 — home truthfulness (links/keys/copy).
 *
 * Varre a home nos 3 locales e afirma:
 * - sem chave i18n crua e sem 5xx;
 * - links internos resolvem (< 400) — sem 404/500 nem loop de redirect;
 * - a alegação de escala do score não é falsa (`manga` fora do grupo 0–100).
 *
 * Só depende do web (home renderiza sem API); não usa credencial real.
 */

const LOCALES = ["pt-BR", "en-US", "es-ES"] as const;
const RE_CHAVE_CRUA =
  /\b(?:home|homeContent|landing|common|nav|footer|catalog|pricing)\.[a-z][A-Za-z0-9.]*/;
const CLAIM_ESCALA_ERRADA =
  /mang[aá]s?\s+(?:e\s+)?de\s+0\s+a\s+100|manga\s+(?:and\s+)?0-100|y\s+mangas\s+de\s+0\s+a\s+100/i;

test.describe("BETA-GAP-05 — home truthfulness", () => {
  for (const locale of LOCALES) {
    test(`${locale} — links internos resolvem e copy honesta`, async ({ page }) => {
      await page.goto(`/${locale}`, { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible({ timeout: 15_000 });

      const body = await page.locator("body").innerText();
      expect(body, "sem chave i18n crua").not.toMatch(RE_CHAVE_CRUA);
      expect(body, "sem erro 5xx").not.toMatch(
        /500|Internal Server Error|Application error|digest:/i,
      );
      expect(body, "sem alegação de escala errada (manga 0–100)").not.toMatch(CLAIM_ESCALA_ERRADA);

      // Links internos únicos por pathname (evita re-requisitar variantes de query).
      const hrefs = await page
        .locator('a[href^="/"]')
        .evaluateAll((els) =>
          Array.from(new Set(els.map((e) => (e as HTMLAnchorElement).getAttribute("href") ?? ""))),
        );
      const pathnames = Array.from(
        new Set(
          hrefs
            .filter((h) => h.startsWith("/") && !h.startsWith("//"))
            .map((h) => new URL(h, page.url()).pathname),
        ),
      );
      expect(pathnames.length, `${locale}: home deve ter links internos`).toBeGreaterThan(0);

      for (const pathname of pathnames) {
        const res = await page.request.get(new URL(pathname, page.url()).toString());
        expect(res.status(), `link interno ${pathname} (${locale})`).toBeLessThan(400);
      }
    });
  }
});
