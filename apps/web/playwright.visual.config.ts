import { defineConfig, devices } from "@playwright/test";

/**
 * T208/D-580 — regressão VISUAL (pixel) do hero, separada do e2e de CI.
 *
 * Por que um config próprio (e não `playwright.config.ts`):
 *  - baselines de imagem são sensíveis a SO/fonte — não podem virar gate de CI
 *    (o job de E2E do GitHub roda em Linux; baseline gerado no Windows diverge);
 *  - manter fora de `e2e/` garante que nenhum workflow existente passe a rodar
 *    snapshot sem baseline commitado (falha garantida).
 *
 * Uso (semeia/atualiza os baselines e compara):
 *   npm run test:visual --workspace apps/web                 # compara
 *   npm run test:visual:update --workspace apps/web          # (re)gera baselines
 *
 * Os PNGs ficam em `visual/**-snapshots/` e são git-ignored (por máquina).
 * Evidência multi-viewport mais ampla (overflow, axe, dobra): use
 * `npm run design:visual` (`.zcode/skills/visual-qa/`).
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./visual",
  timeout: 60_000,
  // Comparação de imagem é sensível a timing/CPU: sequencial é mais estável.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "visual/.artifacts",
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
    colorScheme: "dark",
    trace: "off",
    video: "off",
    screenshot: "off",
  },
  projects: [
    {
      name: "desktop-1440",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile-375",
      use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 }, isMobile: false },
    },
  ],
  // Reaproveita um dev server já no ar; sobe um se não houver.
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
