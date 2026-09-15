import { defineConfig, devices } from "@playwright/test";

/**
 * T462 (D-493) — config dedicada aos scripts de verificação manual em
 * scripts/verify-prod/ (fora do testDir da suíte principal). Nunca usada
 * pelo CI; alvo definido por E2E_BASE_URL (staging/preview por padrão de
 * higiene — produção só com conta de teste).
 */
export default defineConfig({
  testDir: ".",
  timeout: 60_000,
  retries: 0,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "https://mediarate.app",
    colorScheme: "dark",
    ...devices["Desktop Chrome"],
  },
});
