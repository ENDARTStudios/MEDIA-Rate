import type { BrowserContext, Page } from "@playwright/test";

/**
 * T060/T074 — isolamento de estado entre specs E2E da jornada crítica.
 *
 * T074/D-553: **preserva** os cookies de autenticação (`sess`, `csrf_token`)
 * injetados pelo `storageState` (globalSetup); limpa apenas o restante (locale,
 * consentimento, etc.) e o `localStorage`/`sessionStorage`. Nunca imprime valores.
 */
const COOKIES_AUTH = new Set(["sess", "csrf_token"]);

export async function resetClientState(page: Page, context: BrowserContext): Promise<void> {
  const atuais = await context.cookies();
  await context.clearCookies();
  const auth = atuais.filter((c) => COOKIES_AUTH.has(c.name));
  if (auth.length > 0) {
    await context.addCookies(auth); // restaura a sessão (sem logar valores)
  }
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
