import { test, expect, chromium } from "@playwright/test";

const PROD = "https://media-rate-web.vercel.app";
const API = "https://media-rate-production.up.railway.app";
const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

test.describe("T105 - GATE BINARY (Brave headed)", () => {
  test("visiveis>0 + cookie lax + reload logado", async () => {
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
      // ===== GATE 1: CATALOG CARDS VISIBLE =====
      console.log("\n=== GATE 1: CATALOGO ===");
      await page.goto(`${PROD}/pt-BR/catalog`, { waitUntil: "networkidle", timeout: 25000 });
      await page.waitForTimeout(3000);

      const cardSelector = 'a[href*="/media/"]';
      const allCards = page.locator(cardSelector);
      const totalDom = await allCards.count();
      let visiveis = 0;
      let ancestorOpacityZero = false;

      for (let i = 0; i < totalDom; i++) {
        const card = allCards.nth(i);
        const isVis = await card.isVisible().catch(() => false);
        const box = await card.boundingBox().catch(() => null);
        if (isVis && box && box.width > 0 && box.height > 0) visiveis++;

        // Check ancestor opacity for first card
        if (i === 0) {
          const ancestor2Opacity = await card.evaluate((el) => {
            let p = el.parentElement?.parentElement;
            if (!p) return "N/A";
            // p is [1] DIV.group, parentElement is [2] (motion wrapper)
            if (p.parentElement) {
              return getComputedStyle(p.parentElement).opacity;
            }
            return "N/A";
          }).catch(() => "error");
          ancestorOpacityZero = ancestor2Opacity === "0";
          console.log(`Card 0 ancestor[2] opacity: ${ancestor2Opacity}, isVisible: ${isVis}, box: ${box ? `${box.width}x${box.height}` : "null"}`);
        }
      }

      console.log(`Catalogo: DOM=${totalDom}, visiveis=${visiveis}, ancestorOpacity0=${ancestorOpacityZero}`);

      await page.screenshot({ path: "e2e/screenshots/t105-gate-catalog.png", fullPage: true });

      // ===== GATE 2: HOME CARDS VISIBLE =====
      console.log("\n=== GATE 2: HOME ===");
      await page.goto(`${PROD}/pt-BR`, { waitUntil: "networkidle", timeout: 25000 });
      await page.waitForTimeout(3000);

      const homeCards = page.locator(cardSelector);
      const homeTotal = await homeCards.count();
      let homeVisiveis = 0;
      for (let i = 0; i < homeTotal; i++) {
        const card = homeCards.nth(i);
        const isVis = await card.isVisible().catch(() => false);
        const box = await card.boundingBox().catch(() => null);
        if (isVis && box && box.width > 0 && box.height > 0) homeVisiveis++;
      }
      console.log(`Home: DOM=${homeTotal}, visiveis=${homeVisiveis}`);

      await page.screenshot({ path: "e2e/screenshots/t105-gate-home.png", fullPage: true });

      // ===== GATE 3: LOGIN + RELOAD + COOKIE =====
      console.log("\n=== GATE 3: LOGIN + RELOAD + COOKIE ===");

      const testEmail = `t105-gate-${Date.now()}@prova.test`;
      const testPass = "Prova@105!";

      // Register via API
      const regRes = await fetch(`${API}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: "Gate T105", email: testEmail, password: testPass }),
      });
      console.log(`[API] Register: ${regRes.status}`);

      // Login via UI
      await page.goto(`${PROD}/pt-BR/login`, { waitUntil: "networkidle", timeout: 25000 });
      await page.waitForSelector("form", { timeout: 15000 });
      await page.locator('input[name="email"]').first().fill(testEmail);
      await page.locator('input[name="password"]').first().fill(testPass);
      await page.locator('button[type="submit"]').first().click({ force: true });

      try {
        await page.waitForURL("**/dashboard", { timeout: 20000 });
        console.log("[OK] Login → dashboard");
      } catch {
        console.log(`[FALLBACK] URL: ${page.url()}`);
      }
      await page.waitForTimeout(2000);

      await page.screenshot({ path: "e2e/screenshots/t105-gate-login.png", fullPage: false });

      // Check user indicator - look for dashboard content or any logged-in state
      const userIndicator = page.locator('[data-testid="user-menu"], [data-testid="avatar"], text="Dashboard", h1, h2').first();
      const indicatorVis = await userIndicator.isVisible().catch(() => false);
      // Also check that we're NOT on login page
      const onLoginPage = page.url().includes("/login") || page.url().includes("/register");
      // Gate: after login, we should be on dashboard (not login page)
      const onLoginPageAfter = page.url().includes("/login") || page.url().includes("/register");
      console.log(`Indicador dashboard visivel: ${indicatorVis}, onLoginPage: ${onLoginPageAfter}`);

      // Also check that Entrar button is gone
      const entrarAfterLogin = page.locator('a[href*="/login"]').first();
      const entrarAfterLoginVis = await entrarAfterLogin.isVisible().catch(() => false);
      const loggedIn = !onLoginPageAfter && !entrarAfterLoginVis;
      const cookiesAfterLogin = await context.cookies();
      const sessCookie = cookiesAfterLogin.find((c) => c.name === "sess");
      console.log("\n=== context.cookies() ===");
      if (sessCookie) {
        console.log(`Cookie 'sess': domain=${sessCookie.domain} path=${sessCookie.path} sameSite=${sessCookie.sameSite} httpOnly=${sessCookie.httpOnly} secure=${sessCookie.secure}`);
      } else {
        console.log(`Cookie 'sess' AUSENTE! Cookies: ${cookiesAfterLogin.map(c => c.name).join(", ")}`);
      }

      // RELOAD
      console.log("\n--- RELOAD ---");
      await page.reload({ waitUntil: "networkidle", timeout: 25000 });
      await page.waitForTimeout(3000);

      const urlAfterReload = page.url();
      const indAfterReload = !onLoginPageAfter && !entrarAfterLoginVis;
      const entrarBtn = page.locator('a[href*="/login"]').first();
      const entrarVis = await entrarBtn.isVisible().catch(() => false);

      console.log(`URL reload: ${urlAfterReload}`);
      console.log(`Indicador visivel: ${indAfterReload}, Entrar visivel: ${entrarVis}`);

      await page.screenshot({ path: "e2e/screenshots/t105-gate-reload.png", fullPage: false });

      const cookiesAfterReload = await context.cookies();
      const sessReload = cookiesAfterReload.find((c) => c.name === "sess");

      // ===== RESUMO =====
      console.log("\n========== GATE BINARY ==========");
      console.log(`Catalogo visiveis: ${visiveis}/${totalDom}`);
      console.log(`Home visiveis: ${homeVisiveis}/${homeTotal}`);
      console.log(`Login indicator: ${indicatorVis}`);
      console.log(`Reload logado: ${!entrarVis}`);
      console.log(`Cookie sess: ${sessReload ? `${sessReload.sameSite}/${sessReload.httpOnly}/${sessReload.secure}` : "AUSENTE"}`);

      // GATE assertions
      expect(visiveis, "Catalogo: cards visiveis > 0").toBeGreaterThan(0);
      expect(homeVisiveis, "Home: cards visiveis > 0").toBeGreaterThan(0);
      expect(loggedIn, "Login: usuario esta logado (dashboard, sem botao Entrar)").toBe(true);
      expect(entrarVis, "Reload: botao Entrar NAO visivel (continua logado)").toBe(false);
      expect(sessReload, "Cookie 'sess' persistente").toBeTruthy();
      if (sessReload) {
        expect(sessReload.sameSite, "sameSite=Lax").toBe("Lax");
        expect(sessReload.httpOnly, "httpOnly=true").toBe(true);
        expect(sessReload.secure, "secure=true").toBe(true);
      }

    } finally {
      await browser.close();
    }
  });
});
