/**
 * [verify-prod] T462 (D-493) — verificação MANUAL contra deploy real.
 * NÃO roda no CI (fora do testDir da allowlist; nunca rodar contra o banco
 * de produção sem conta de teste). Uso:
 *   cd apps/web && E2E_BASE_URL=https://mediarate.app  *     npx playwright test -c scripts/verify-prod/playwright.verify.config.ts  *     scripts/verify-prod/teste-fechado.spec.ts
 * Pré-requisitos: env com credenciais de teste quando o spec autentica.
 */

// T079 — Varredura completa: 11 fluxos do teste fechado
// node --experimental-vm-modules node_modules/.bin/playwright test e2e/teste-fechado.spec.ts

import { test, expect } from "@playwright/test";
import fs from "fs";

const BASE = "https://media-rate-web.vercel.app";
const SCREEN_DIR = "apps/web/e2e/screenshots";
fs.mkdirSync(SCREEN_DIR, { recursive: true });

function ss(page, name) {
  const path = `${SCREEN_DIR}/${name}.png`;
  return page.screenshot({ path, fullPage: false });
}

test.describe("Teste Fechado — MEDIA Rate", () => {
  const bugs = [];
  const consoleErrors = [];
  const networkErrors = [];
  const pageErrors = [];

  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error")
        consoleErrors.push({ url: page.url(), text: msg.text().slice(0, 200) });
    });
    page.on("requestfailed", (req) => {
      networkErrors.push({
        url: page.url(),
        failed: req.url(),
        reason: req.failure()?.errorText || "unknown",
      });
    });
    page.on("pageerror", (err) => {
      pageErrors.push({ url: page.url(), message: err.message.slice(0, 200) });
    });
  });

  // Fluxo 1: Register
  test("01 — Register", async ({ page }) => {
    const email = `e2e-${Date.now()}@test.com`;
    await page.goto(`${BASE}/pt-BR/register`, { waitUntil: "networkidle", timeout: 15000 });
    await ss(page, "01a-register-form");

    const name = page.locator('input[name="name"]').first();
    const emailF = page.locator('input[type="email"]').first();
    const pwds = page.locator('input[type="password"]');
    const chk = page.locator('input[type="checkbox"]').first();
    const submit = page.locator('button[type="submit"]').first();

    if (await name.count()) await name.fill("E2E Tester");
    if (await emailF.count()) await emailF.fill(email);
    const pwdCount = await pwds.count();
    if (pwdCount >= 1) await pwds.nth(0).fill("TesteForte123!");
    if (pwdCount >= 2) await pwds.nth(1).fill("TesteForte123!");
    if (await chk.count()) await chk.check().catch(() => {});
    if (await submit.count()) await submit.click();

    await page.waitForTimeout(5000);
    const url = page.url();
    console.log("  Register result:", url);
    await ss(page, "01b-register-result");

    if (url.includes("/register")) {
      bugs.push({
        id: "BUG-001",
        fluxo: 1,
        severity: "Alto",
        desc: "Register — não redirecionou após submit",
        evidence: `Console: ${consoleErrors.length}, Network: ${networkErrors.length}, Page: ${pageErrors.length}, URL: ${url}`,
        cause: "Form não submeteu ou backend não respondeu",
      });
    }
  });

  // Fluxo 2: Login
  test("02 — Login", async ({ page }) => {
    await page.goto(`${BASE}/pt-BR/login`, { waitUntil: "networkidle", timeout: 15000 });
    await ss(page, "02a-login-form");

    const emailF = page.locator('input[type="email"]').first();
    const pwdF = page.locator('input[type="password"]').first();
    const submit = page.locator('button[type="submit"]').first();

    if (await emailF.count()) await emailF.fill("teste@exemplo.com");
    if (await pwdF.count()) await pwdF.fill("qualquercoisa");
    if (await submit.count()) await submit.click();

    await page.waitForTimeout(4000);
    await ss(page, "02b-login-result");
  });

  // Fluxo 3: Catálogo
  test("03 — Catálogo", async ({ page }) => {
    await page.goto(`${BASE}/pt-BR/catalog`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(2000);

    const cards = await page.locator('a[href*="/media/"]').count();
    const images = await page.locator("img").count();
    console.log(`  Catalog: cards=${cards} images=${images}`);
    await ss(page, "03-catalog");

    if (cards === 0) {
      bugs.push({
        id: "BUG-002",
        fluxo: 3,
        severity: "Crítico",
        desc: "Catálogo — 0 cards visíveis",
        evidence: `Cards: ${cards}, Console: ${consoleErrors.length}, Network: ${networkErrors.length}`,
      });
    }
    if (images === 0) {
      bugs.push({
        id: "BUG-003",
        fluxo: 3,
        severity: "Alto",
        desc: "Catálogo — 0 imagens carregadas",
        evidence: `Images: ${images}`,
      });
    }
  });

  // Fluxo 4: Card → Detalhe
  test("04 — Detalhe de mídia", async ({ page }) => {
    await page.goto(`${BASE}/pt-BR/catalog`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(1000);

    const firstCard = page.locator('a[href*="/media/"]').first();
    if (await firstCard.count()) {
      await firstCard.click();
      await page.waitForTimeout(3000);
      await ss(page, "04a-detail");

      const h1Count = await page.locator("h1").count();
      const scoreDial = await page.locator("svg circle").count();
      console.log(`  Detail: H1=${h1Count} ScoreDial=${scoreDial} URL=${page.url()}`);

      if (h1Count === 0) {
        bugs.push({
          id: "BUG-004",
          fluxo: 4,
          severity: "Alto",
          desc: "Detalhe — sem H1",
          evidence: `H1: ${h1Count}`,
        });
      }
      if (page.url().includes("404") || page.url().includes("not-found")) {
        bugs.push({
          id: "BUG-005",
          fluxo: 4,
          severity: "Crítico",
          desc: "Detalhe — 404 ao clicar card",
          evidence: `URL: ${page.url()}`,
        });
      }
    } else {
      bugs.push({
        id: "BUG-006",
        fluxo: 4,
        severity: "Crítico",
        desc: "Detalhe — 0 cards no catálogo para clicar",
        evidence: "No media card links found",
      });
    }
  });

  // Fluxo 5: Watchlist
  test("05 — Watchlist", async ({ page }) => {
    await page.goto(`${BASE}/pt-BR/catalog`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(1000);

    const wlBtn = page
      .locator(
        'button[aria-label*="watchlist"], button[aria-label*="Watchlist"], button:has-text("Adicionar")',
      )
      .first();
    if (await wlBtn.count()) {
      await wlBtn.click();
      await page.waitForTimeout(2000);
      await ss(page, "05a-watchlist-add");
    }

    await page.goto(`${BASE}/pt-BR/watchlist`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, "05b-watchlist-page");
    const wlCards = await page.locator('a[href*="/media/"]').count();
    console.log(`  Watchlist cards: ${wlCards}`);
  });

  // Fluxo 6: Home
  test("06 — Home", async ({ page }) => {
    await page.goto(`${BASE}`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(2000);

    const hero = await page.locator("#hero-title, h1").first().textContent();
    const rails = await page.locator("section").count();
    const cards = await page.locator('a[href*="/media/"]').count();
    console.log(`  Home: hero="${hero?.slice(0, 60)}" sections=${rails} cards=${cards}`);
    await ss(page, "06a-home-desktop");

    if (!hero) {
      bugs.push({
        id: "BUG-007",
        fluxo: 6,
        severity: "Alto",
        desc: "Home — hero section vazio",
        evidence: `Hero text: ${hero}`,
      });
    }
    if (cards === 0) {
      bugs.push({
        id: "BUG-008",
        fluxo: 6,
        severity: "Alto",
        desc: "Home — 0 cards nos rails",
        evidence: `Cards: ${cards}`,
      });
    }
  });

  // Fluxo 7: i18n
  test("07 — i18n (PT/EN/ES)", async ({ page }) => {
    const locales = ["/pt-BR", "/en-US", "/es-ES"];
    for (const loc of locales) {
      await page.goto(`${BASE}${loc}/catalog`, { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(1000);
      const h1 = await page.locator("h1").first().textContent();
      console.log(`  ${loc}: H1="${h1}"`);
      await ss(page, `07-${loc.replace("/", "")}`);
    }
  });

  // Fluxo 8: Logout
  test("08 — Logout + protected route", async ({ page }) => {
    // Protected route access (without login)
    await page.goto(`${BASE}/pt-BR/watchlist`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(2000);
    const protectedUrl = page.url();
    console.log("  Protected route:", protectedUrl);
    await ss(page, "08a-protected");
    if (!protectedUrl.includes("/login")) {
      bugs.push({
        id: "BUG-009",
        fluxo: 8,
        severity: "Alto",
        desc: "Watchlist — não redirecionou para login (usuário deslogado)",
        evidence: `URL: ${protectedUrl}`,
      });
    }
  });

  // Fluxo 9: Planos
  test("09 — Planos", async ({ page }) => {
    await page.goto(`${BASE}/pt-BR/pricing`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(1000);
    await ss(page, "09-pricing");
    const planCards = await page.locator("article, .bg-\\[\\#11111E\\]").count();
    console.log(`  Pricing: cards=${planCards}`);
    if (planCards < 2) {
      bugs.push({
        id: "BUG-010",
        fluxo: 9,
        severity: "Médio",
        desc: "Planos — menos de 2 planos visíveis",
        evidence: `Cards: ${planCards}`,
      });
    }
  });

  // Fluxo 10: SEO
  test("10 — SEO (View Source)", async ({ page }) => {
    await page.goto(`${BASE}/pt-BR/media/g1`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(1500);

    const source = await page.content();
    const hasCanonical = source.includes("canonical");
    const hasRobots = source.includes("robots");
    const hasH1 = /<h1[^>]*>/i.test(source);
    const hasTitle = /<title>/i.test(source);

    console.log(
      `  SEO: canonical=${hasCanonical} robots=${hasRobots} H1=${hasH1} title=${hasTitle}`,
    );
    await ss(page, "10-seo-meta");

    if (!hasCanonical)
      bugs.push({
        id: "BUG-011",
        fluxo: 10,
        severity: "Alto",
        desc: "SEO — canonical ausente na página de detalhe",
        evidence: "Canonical: false",
      });
    if (!hasRobots)
      bugs.push({
        id: "BUG-012",
        fluxo: 10,
        severity: "Alto",
        desc: "SEO — meta robots ausente",
        evidence: "Robots: false",
      });
    if (!hasH1)
      bugs.push({
        id: "BUG-013",
        fluxo: 10,
        severity: "Alto",
        desc: "SEO — H1 ausente",
        evidence: "H1: false",
      });
  });

  // Fluxo 11: Security headers
  test("11 — Security headers", async ({ page }) => {
    await page.goto(`${BASE}`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(1000);

    // Check via Performance API
    const headers = await page.evaluate(() => {
      const entry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      return { type: entry?.type || "navigate" };
    });
    console.log("  Security: navigation type =", headers.type);

    // We can't directly read response headers from Playwright without intercepting
    // Use page.route to capture
    let securityHeaders = {};
    await page.route(
      "**/pt-BR",
      (route) => {
        const resp = route.request().response();
        if (resp) {
          securityHeaders = {
            "x-frame-options": resp.headers()["x-frame-options"] || "MISSING",
            "x-content-type-options": resp.headers()["x-content-type-options"] || "MISSING",
            "referrer-policy": resp.headers()["referrer-policy"] || "MISSING",
            "csp": resp.headers()["content-security-policy"] ? "PRESENT" : "MISSING",
          };
        }
        route.continue();
      },
      { times: 1 },
    );

    await page.goto(`${BASE}`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(500);
    console.log("  Security headers:", JSON.stringify(securityHeaders));
  });

  // After all: report
  test.afterAll(() => {
    console.log("\n=== BUGS FOUND ===");
    bugs.forEach((b) => console.log(`  ${b.id}: [${b.severity}] ${b.desc}`));
    console.log(`  Console errors: ${consoleErrors.length}`);
    console.log(`  Network errors: ${networkErrors.length}`);
    console.log(`  Page errors: ${pageErrors.length}`);
    if (networkErrors.length > 0) {
      console.log("\n  Network error details:");
      networkErrors.slice(0, 5).forEach((e) => console.log(`    ${e.failed}: ${e.reason}`));
    }
  });
});
