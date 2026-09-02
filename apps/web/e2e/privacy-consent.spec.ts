import { test, expect, type Page } from "@playwright/test";

/**
 * T432 (D-422) — Privacy Center: bloqueio REAL de scripts opcionais
 * (PostHog analytics, Sentry monitoring) por consentimento.
 *
 * Asserções de REDE (prova técnica, não texto):
 *  - Sem consentimento / recusar → ZERO requisições a PostHog/Sentry.
 *  - Aceitar analytics → requisição ao PostHog presente.
 *  - Escolha persiste após reload (cookie mr_consent).
 *
 * Requer o deploy com as envs de analytics/monitoramento ativas
 * (NEXT_PUBLIC_ANALYTICS_WRITE_KEY + SENTRY_DSN), senão os SDKs são no-op.
 */
const ANALYTICS_HOSTS = ["app.posthog.com", "posthog"];
const MONITOR_HOSTS = ["ingest.sentry.io", "sentry.io"];

interface Tracker {
  posthog: number;
  sentry: number;
}

async function trackRequests(page: Page): Promise<Tracker> {
  const t: Tracker = { posthog: 0, sentry: 0 };
  page.on("request", (req) => {
    const u = req.url();
    if (ANALYTICS_HOSTS.some((h) => u.includes(h))) t.posthog++;
    if (MONITOR_HOSTS.some((h) => u.includes(h))) t.sentry++;
  });
  return t;
}

test.beforeEach(async ({ context }) => {
  // garante estado limpo (sem consentimento -> privacy by default)
  await context.addCookies([
    {
      name: "mr_consent",
      value: encodeURIComponent(JSON.stringify({ analytics: false, monitoring: false, v: 1 })),
      domain: "mediarate.app",
      path: "/",
    },
  ]);
});

test("recusar: ZERO requisições a PostHog/Sentry", async ({ page }) => {
  const t = await trackRequests(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  expect(t.posthog + t.sentry, "optional scripts must not fire with no consent").toBe(0);
});

test("aceitar analytics: requisição ao PostHog presente", async ({ context, page }) => {
  await context.addCookies([
    {
      name: "mr_consent",
      value: encodeURIComponent(JSON.stringify({ analytics: true, monitoring: true, v: 1 })),
      domain: "mediarate.app",
      path: "/",
    },
  ]);
  const t = await trackRequests(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
  expect(t.posthog).toBeGreaterThan(0);
});

test("banner aparece sem consentimento; escolha persiste após reload", async ({
  context,
  page,
}) => {
  // sem cookie -> banner visível
  await context.clearCookies();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const banner = page.getByRole("dialog", { name: /privacy|privacidade/i });
  await expect(banner).toBeVisible();
  // aceitar todos
  await page.getByRole("button", { name: /aceitar todos|accept all|aceptar todos/i }).click();
  await expect(banner).toBeHidden();
  // persiste após reload
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("dialog", { name: /privacy|privacidade/i })).toBeHidden();
});
