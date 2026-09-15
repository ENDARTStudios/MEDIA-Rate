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
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    colorScheme: "dark",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
  // T461 (D-492): E2E roda contra build de PRODUÇÃO (`next build && next
  // start`), não `next dev` — o modo dev tem compilação a frio por rota
  // (flakiness de timeout no CI) e DOM/CSS diferentes do produto real,
  // o que gera resultados de auditoria (a11y/contraste) não representativos.
  webServer: process.env.CI
    ? {
        command: "npx next build && npx next start -p 3000",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 600_000,
      }
    : undefined,
});
