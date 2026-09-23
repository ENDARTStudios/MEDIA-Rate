import type { BrowserContext, Page } from "@playwright/test";

/**
 * T060 — isolamento de estado entre specs E2E da jornada crítica.
 *
 * Limpa cookies (inclui `sess`/`csrf_token`/`NEXT_LOCALE`) e o `localStorage`
 * do host atual, evitando acoplamento entre cenários (watchlist local,
 * consentimento, aba de biblioteca). Determinístico e sem tocar produto.
 */
export async function resetClientState(page: Page, context: BrowserContext): Promise<void> {
  await context.clearCookies();
  // `localStorage` só existe após um documento carregado no host.
  if (page.url() !== "about:blank") {
    await page
      .evaluate(() => {
        try {
          window.localStorage.clear();
          window.sessionStorage.clear();
        } catch {
          /* storage indisponível — ignora */
        }
      })
      .catch(() => {});
  }
}

/** Um e-mail de fixture fictício (RFC 2606: domínio `.invalid`). */
export function emailFixture(prefixo: string): string {
  return `${prefixo}-${Date.now()}@example.invalid`;
}
