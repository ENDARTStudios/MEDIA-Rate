import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000/pt-BR",
    // T066/D-550: sem trace/vídeo em CI (podem conter cookies/tokens em artifacts).
    trace: "off",
    screenshot: "only-on-failure",
    video: "off",
    colorScheme: "dark",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      // T069: `isMobile:true` (mobile emulation) impedia o `page.request` de
      // enviar corretamente o cookie de sessão estabelecido via `apiLogin`
      // (falha exclusiva do projeto mobile). Mantemos viewport/UA/touch Pixel-like
      // SEM mobile emulation. Limitação: sem emulação de touch nativa do Chromium.
      use: { ...devices["Pixel 5"], isMobile: false },
    },
  ],
  // T461 (D-492): `next dev` é o modo honesto para o job web-only. Um
  // `next build && next start` SEM API assa os estados vazios das páginas
  // ISR no build (133 testes quebrados vs 17) — auditando o produto errado.
  // E2E completo (com API+DB) permanece atrás de E2E_FULL; ver docs/E2E.md.
  webServer: process.env.CI
    ? {
        command: "npx next dev -p 3000",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 60_000,
      }
    : undefined,
});
