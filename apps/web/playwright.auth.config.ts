import { defineConfig, devices } from "@playwright/test";
import { WEB_STORAGE_STATE } from "./e2e/web-login-setup";

/**
 * D-588 (T211) — harness AUTENTICADO local (admin + dashboard).
 *
 * Cobre o que nenhum gate alcançava: `/admin` (8 telas) e o `/dashboard` real.
 * O login é feito pela UI da própria aplicação (`e2e/web-login-setup.ts`), então
 * NÃO exige a API local no ar — só o web (`localhost:3000`), que faz proxy
 * same-origin para a API configurada.
 *
 * Requisitos: `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` no ambiente ou no `.env.local`
 * da raiz. Sem eles, o setup falha com mensagem explícita (sem imprimir valores).
 *
 * Fora do CI, como a regressão visual por pixel: depende de dev server + sessão
 * real, e baseline de imagem é sensível a SO/fonte.
 *
 * Uso:
 *   npm run test:auth --workspace apps/web            # axe em /admin + pixel do dashboard
 *   npm run test:auth:update --workspace apps/web     # (re)gera os baselines do dashboard
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./auth",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "auth/.artifacts",
  globalSetup: "./e2e/web-login-setup.ts",
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      scale: "css",
      maxDiffPixelRatio: 0.02,
    },
  },
  use: {
    baseURL: BASE_URL,
    storageState: WEB_STORAGE_STATE,
    // Alinhado ao resto do produto: dark-only por tokens, então o harness roda
    // com o SO em modo claro para pegar regressões de `dark:` (D-582.1).
    colorScheme: "light",
    trace: "off",
    video: "off",
    screenshot: "off",
  },
  projects: [
    {
      name: "desktop-1440",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
