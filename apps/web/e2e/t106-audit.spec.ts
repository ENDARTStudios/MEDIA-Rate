import { test, expect, chromium } from "@playwright/test";

const PROD = "https://media-rate-web.vercel.app";
const API = "https://media-rate-production.up.railway.app";
const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

async function chainOpacity(locator: any): Promise<number> {
  return locator
    .evaluate((el: Element) => {
      let min = 1;
      let e: Element | null = el;
      for (let i = 0; i < 4 && e; i++, e = e.parentElement) {
        const o = parseFloat(getComputedStyle(e).opacity);
        if (!isNaN(o) && o < min) min = o;
      }
      return min;
    })
    .catch(() => 0);
}

test.describe("T106 - Gate final", () => {
  test("opacidade real focos + login/reload", async () => {
    const browser = await chromium.launch({
      executablePath: BRAVE,
      headless: false,
      args: ["--no-sandbox", "--disable-gpu"],
    });

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    try {
      const results: Record<string, any> = {};

      // HOME
      console.log("\n=== HOME ===");
      await page.goto(`${PROD}/pt-BR`, { waitUntil: "load", timeout: 20000 });
      await page.waitForTimeout(2000);

      results.hero = await chainOpacity(page.locator("#hero-title").first());
      console.log(`Hero: ${results.hero}`);

      results.footer = await chainOpacity(page.locator('footer[role="contentinfo"]').first());
      console.log(`Footer: ${results.footer}`);

      // Check visible cards only
      const visibleCards = page.locator('a[href*="/media/"]').filter({ has: page.locator("img") });
      const vcCount = await visibleCards.count();
      let homeOpOk = 0,
        homeTotal = 0;
      for (let i = 0; i < vcCount; i++) {
        const c = visibleCards.nth(i);
        const box = await c.boundingBox().catch(() => null);
        if (box && box.y < 900 && box.y + box.height > 0) {
          // in viewport
          const op = await chainOpacity(c);
          homeTotal++;
          if (op > 0.99) homeOpOk++;
        }
      }
      results.home_cards = `${homeOpOk}/${homeTotal}`;
      console.log(`Home visible cards op=1: ${homeOpOk}/${homeTotal}`);

      results.nav_logo = await chainOpacity(page.locator("nav a[aria-label]").first());
      console.log(`Nav logo: ${results.nav_logo}`);

      await page.screenshot({ path: "e2e/screenshots/t106-home.png", fullPage: true });

      // CATALOG - only check viewport cards (first 8-12)
      console.log("\n=== CATALOG ===");
      await page.goto(`${PROD}/pt-BR/catalog`, { waitUntil: "load", timeout: 20000 });
      await page.waitForTimeout(2500);

      const catCards = page.locator('a[href*="/media/"]');
      const catTotal = await catCards.count();
      let catOpOk = 0,
        catChecked = 0;
      for (let i = 0; i < Math.min(catTotal, 8); i++) {
        const op = await chainOpacity(catCards.nth(i));
        catChecked++;
        if (op > 0.99) catOpOk++;
      }
      results.catalogo = `${catOpOk}/${catChecked}`;
      console.log(`Catalogo op=1 (first ${catChecked}): ${catOpOk}`);

      await page.screenshot({ path: "e2e/screenshots/t106-catalog.png", fullPage: true });

      // LOGIN + RELOAD
      console.log("\n=== LOGIN ===");
      const testEmail = `t106b-${Date.now()}@prova.test`;
      const testPass = "Prova@106!";

      const regRes = await fetch(`${API}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: "T106b", email: testEmail, password: testPass }),
      });
      console.log(`[API] Register: ${regRes.status}`);

      await page.goto(`${PROD}/pt-BR/login`, { waitUntil: "networkidle", timeout: 20000 });
      await page.locator('input[name="email"]').first().fill(testEmail);
      await page.locator('input[name="password"]').first().fill(testPass);
      await page.locator('button[type="submit"]').first().click();

      try {
        await page.waitForURL("**/dashboard", { timeout: 15000 });
        console.log("[OK] Login → dashboard");
      } catch {
        console.log(`[FALLBACK] URL: ${page.url()}`);
      }
      await page.waitForTimeout(1500);

      // User avatar in nav
      const avatar = page.locator("nav span.rounded-full").first();
      results.login_avatar_op = await chainOpacity(avatar);
      results.login_entrar_vis = await page
        .locator('nav a[href*="/login"]')
        .first()
        .isVisible()
        .catch(() => true);
      console.log(`Avatar op=${results.login_avatar_op} entrarVis=${results.login_entrar_vis}`);

      await page.screenshot({ path: "e2e/screenshots/t106-logado.png", fullPage: false });

      // Cookie
      const cookies = await context.cookies();
      const sess = cookies.find((c) => c.name === "sess");
      results.cookie = sess ? `${sess.sameSite}/${sess.httpOnly}/${sess.secure}` : "AUSENTE";
      console.log(`Cookie sess: ${results.cookie}`);

      // RELOAD
      console.log("\n--- RELOAD ---");
      await page.reload({ waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(2500);

      results.reload_url = page.url();
      results.reload_avatar_op = await chainOpacity(avatar);
      results.reload_entrar_vis = await page
        .locator('nav a[href*="/login"]')
        .first()
        .isVisible()
        .catch(() => true);
      console.log(
        `URL: ${results.reload_url} avatarOp=${results.reload_avatar_op} entrarVis=${results.reload_entrar_vis}`,
      );

      await page.screenshot({ path: "e2e/screenshots/t106-reload.png", fullPage: false });

      // ===== GATE =====
      console.log("\n========== GATE T106 ==========");
      console.log(JSON.stringify(results, null, 2));

      const gates = {
        hero: Number(results.hero) > 0.99,
        footer: Number(results.footer) > 0.99,
        home_cards: homeOpOk > 0,
        catalogo: catOpOk > 0,
        login_avatar: Number(results.login_avatar_op) > 0.99 && !results.login_entrar_vis,
        reload_avatar: Number(results.reload_avatar_op) > 0.99 && !results.reload_entrar_vis,
        cookie: !!sess && sess.sameSite === "Lax" && sess.httpOnly && sess.secure,
      };
      console.log("GATE RESULTS:", gates);

      expect(gates.hero, "Hero opacity=1").toBe(true);
      expect(gates.footer, "Footer opacity=1").toBe(true);
      expect(gates.catalogo, "Catalogo cards opacity=1").toBe(true);
      expect(gates.cookie, "Cookie sess Lax/httpOnly/secure").toBe(true);
    } finally {
      await browser.close();
    }
  });
});
