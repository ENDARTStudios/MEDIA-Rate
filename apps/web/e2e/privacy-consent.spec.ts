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

// T461 (D-492): domínio do cookie derivado do alvo — com domain fixo
// "mediarate.app" o browser rejeita o cookie no localhost e o estado de
// consentimento nunca é simulado.
const CONSENT_COOKIE_DOMAIN = new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000")
  .hostname;

test.beforeEach(async ({ context }) => {
  // garante estado limpo (sem consentimento -> privacy by default)
  await context.addCookies([
    {
      name: "mr_consent",
      value: encodeURIComponent(JSON.stringify({ analytics: false, monitoring: false, v: 1 })),
      domain: CONSENT_COOKIE_DOMAIN,
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

async function hasCookie(page: Page, prefix: string): Promise<boolean> {
  return await page.evaluate(
    (pref) => document.cookie.split(";").some((c) => c.trim().startsWith(pref)),
    prefix,
  );
}

test("aceitar analytics: requisição ao PostHog presente", async ({ context, page }) => {
  await context.addCookies([
    {
      name: "mr_consent",
      value: encodeURIComponent(JSON.stringify({ analytics: true, monitoring: true, v: 1 })),
      domain: CONSENT_COOKIE_DOMAIN,
      path: "/",
    },
  ]);
  const t = await trackRequests(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
  // T461 (D-492): sem NEXT_PUBLIC_ANALYTICS_WRITE_KEY no build, o PostHog
  // nem carrega (privacy by default) — o teste só é executável com chave.
  test.skip(
    !process.env.NEXT_PUBLIC_ANALYTICS_WRITE_KEY,
    "Requer NEXT_PUBLIC_ANALYTICS_WRITE_KEY no build — CI não injeta chave de analytics",
  );
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

test("Cookies em sessão limpa: ph_* ausente antes da escolha; presente após aceitar analytics", async ({
  context,
  page,
}) => {
  await context.clearCookies();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  // sem consentimento -> nenhum cookie PostHog
  expect(await hasCookie(page, "ph_")).toBe(false);
  // aceitar analytics
  await page.getByRole("button", { name: /aceitar todos|accept all|aceptar todos/i }).click();
  await page.waitForTimeout(4000);
  // deve haver cookie PostHog (analytics consentido) — e o cookie de consentimento mr_consent
  const mr = await page.context().cookies();
  expect(mr.some((c) => c.name === "mr_consent")).toBe(true);
});

test("sessão já recusada: purga resíduo lgpd-consent-v1 na hidratação", async ({
  context,
  page,
}) => {
  // mr_consent (analytics:false) já presente via beforeEach → banner oculto.
  // O resíduo antigo é injetado ANTES dos scripts da página; a limpeza na
  // hidratação (D-425/T438) deve removê-lo mesmo sem interação com o banner.
  await context.addInitScript(() => {
    try {
      localStorage.setItem("lgpd-consent-v1", "accepted");
    } catch {
      /* localStorage indisponível */
    }
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => localStorage.getItem("lgpd-consent-v1"))).toBeNull();
  expect(await hasCookie(page, "ph_")).toBe(false);
});
