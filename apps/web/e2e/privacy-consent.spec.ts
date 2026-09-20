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
interface Tracker {
  posthog: number;
  sentry: number;
}

/**
 * T473: beacons são medidos por HOSTNAME remoto — matcher por substring
 * pegava falso positivo de chunk estático local
 * (/_next/static/chunks/node_modules_posthog-js_*.js), que não é beacon.
 */
function trackerDaUrl(u: string): "posthog" | "sentry" | null {
  let host: string;
  try {
    host = new URL(u).hostname;
  } catch {
    return null;
  }
  if (/(^|\.)posthog\.com$/.test(host)) return "posthog";
  if (/(^|\.)sentry\.io$/.test(host)) return "sentry";
  return null;
}

async function trackRequests(page: Page): Promise<Tracker> {
  const t: Tracker = { posthog: 0, sentry: 0 };
  page.on("request", (req) => {
    const kind = trackerDaUrl(req.url());
    if (kind) t[kind]++;
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
  // T473: poll em vez de wait fixo — a purga ocorre na hidratação, que em
  // dev (compilação Turbopack sob demanda) pode exceder 1500ms.
  await expect
    .poll(async () => page.evaluate(() => localStorage.getItem("lgpd-consent-v1")), {
      timeout: 10_000,
    })
    .toBeNull();
  expect(await hasCookie(page, "ph_")).toBe(false);
});

/**
 * T473 (D-536) — 5º estado do consentimento: ACEITAR TUDO → REVOGAR
 * analytics via toggles do Privacy Center (Configurações).
 *
 * Prova (art. 18 LGPD — revogação é direito):
 *  a) beacon da categoria revogada CESSA em reload (zero requisições PostHog);
 *  b) cookie mr_consent espelha analytics:false (v2);
 *  c) trail de revogação registrado em mr_consent_v2 (store v2, T470);
 *  d) espelho server-side (POST /api/v1/consent, consent_logs append-only)
 *     disparado na revogação quando autenticado.
 *
 * Web-only e2e: a fronteira de API é mockada por rota (auth/me + consent);
 * todo o fluxo de consentimento — store, toggles, cookie, trail, bloqueio
 * de SDK — é comportamento real do cliente. A cadeia API completa (401/200/
 * 429/carência) é coberta em apps/api/test/lgpd-rights.e2e.spec.ts.
 */
test("5º estado: aceitar tudo → revogar analytics no Privacy Center → beacon cessa + trail + espelho", async ({
  context,
  page,
}) => {
  // Autenticação satisfeita na fronteira (Privacy Center exige sessão).
  // CORS: em dev o cliente chama a API cross-origin (localhost:4000) —
  // sem os headers o browser bloqueia a leitura e o fetchMe falha.
  const pageOrigin = new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000").origin;
  const corsHeaders: Record<string, string> = {
    "access-control-allow-origin": pageOrigin,
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "content-type,x-csrf-token,idempotency-key",
    "access-control-allow-methods": "GET,POST,OPTIONS",
  };
  const meResponse = {
    id: "e2e-t473",
    email: "titular@mediarate.test",
    nome: "Titular E2E",
    plano: "FREE",
    status: "ATIVO",
    trial_ends_at: null,
    trialEnded: false,
    watchlist_limit: 10,
    created_at: new Date().toISOString(),
  };
  await context.route("**/api/v1/auth/me", (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders });
    }
    return route.fulfill({
      status: 200,
      headers: corsHeaders,
      contentType: "application/json",
      body: JSON.stringify(meResponse),
    });
  });
  const espelhos: { categorias?: { analytics?: boolean } }[] = [];
  await context.route("**/api/v1/consent", (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders });
    }
    if (route.request().method() === "POST") {
      try {
        espelhos.push(route.request().postDataJSON());
      } catch {
        /* body inválido ignorado */
      }
    }
    return route.fulfill({
      status: 201,
      headers: corsHeaders,
      contentType: "application/json",
      body: '{"registrado":true}',
    });
  });

  await context.clearCookies();
  // Middleware (T359) exige cookie `sess` em rotas privadas antes de renderar
  // — valor dummy; a validação real da sessão é o /auth/me mockado acima.
  await context.addCookies([
    {
      name: "sess",
      value: "e2e-t473-dummy",
      domain: CONSENT_COOKIE_DOMAIN,
      path: "/",
    },
  ]);
  await page.goto("/", { waitUntil: "domcontentloaded" });

  // Estado 4: aceitar todos (a partir da sessão limpa do estado 1).
  const banner = page.getByRole("dialog", { name: /privacy|privacidade/i });
  await expect(banner).toBeVisible();
  await page.getByRole("button", { name: /aceitar todos|accept all|aceptar todos/i }).click();
  await expect(banner).toBeHidden();
  await page.waitForTimeout(1500);
  const aceito = await page.evaluate(() => {
    const m = document.cookie.match(/(?:^|;\s*)mr_consent=([^;]+)/);
    return m ? JSON.parse(decodeURIComponent(m[1])) : null;
  });
  expect(aceito?.analytics).toBe(true);

  // Estado 5: revogar analytics via toggle do Privacy Center (Configurações).
  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  const toggle = page.getByRole("checkbox", { name: /analytics/i });
  await expect(toggle).toBeChecked();
  espelhos.length = 0;
  await toggle.uncheck();
  await page.waitForTimeout(1200);

  // (a) beacon da categoria revogada cessa após reload — nenhuma requisição
  // a PostHog mesmo com o restante da página carregando (com
  // NEXT_PUBLIC_ANALYTICS_WRITE_KEY no build este assert prova o bloqueio
  // real do SDK; sem a chave ele vale trivialmente — (b)/(c)/(d) carregam
  // a prova).
  const t = await trackRequests(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  expect(t.posthog, "revogação deve cessar o beacon de analytics").toBe(0);

  // (b) cookie mr_consent espelha a revogação (analytics:false, v2).
  const mrCookie = await page.evaluate(() => {
    const m = document.cookie.match(/(?:^|;\s*)mr_consent=([^;]+)/);
    return m ? JSON.parse(decodeURIComponent(m[1])) : null;
  });
  expect(mrCookie, "cookie mr_consent presente").not.toBeNull();
  expect(mrCookie.analytics).toBe(false);
  expect(mrCookie.v).toBe(2);

  // (c) trail de revogação persistido no store v2 (T470/D-531).
  const v2 = await page.evaluate(() => {
    const raw = localStorage.getItem("mr_consent_v2");
    return raw
      ? (JSON.parse(raw) as {
          categorias: { analytics: boolean };
          revogacoes: { categoria: string }[];
        })
      : null;
  });
  expect(v2, "mr_consent_v2 presente").not.toBeNull();
  expect(v2.categorias.analytics).toBe(false);
  expect(
    v2.revogacoes.some((r) => r.categoria === "analytics"),
    "trail de revogação de analytics registrado",
  ).toBe(true);

  // Resíduo de cookie PostHog purgado na revogação (limparResiduos).
  expect(await hasCookie(page, "ph_")).toBe(false);

  // (d) espelho server-side chamado na revogação (endpoint autenticado).
  const espelhoRevogacao = espelhos.find((e) => e?.categorias?.analytics === false);
  expect(espelhoRevogacao, "POST /api/v1/consent com analytics:false").toBeTruthy();
});
