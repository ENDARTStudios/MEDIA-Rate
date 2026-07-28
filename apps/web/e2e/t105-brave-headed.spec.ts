import { test, expect, chromium } from "@playwright/test";

const PROD = "https://media-rate-web.vercel.app";
const API = "https://media-rate-production.up.railway.app";
const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

test.describe("T105 - Brave HEADED visibility + cookies", () => {
  test("catalog visibility + login persistence + context.cookies", async () => {
    const browser = await chromium.launch({
      executablePath: BRAVE,
      headless: false,
      args: ["--no-sandbox", "--disable-gpu"],
    });

    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();

    try {
      // ============ PASSO 1: CATALOG VISIBILITY ============
      console.log("\n=== PASSO 1: CATALOGO NO BRAVE HEADED ===");
      await page.goto(`${PROD}/pt-BR/catalog`, { waitUntil: "networkidle", timeout: 25000 });
      await page.waitForTimeout(2500);

      const cardSelector = 'a[href*="/media/"]';
      const allCards = page.locator(cardSelector);
      const totalNoDom = await allCards.count();
      console.log(`Total cards no DOM: ${totalNoDom}`);

      // Measure visibility
      let visiveis = 0;
      let invisibleCardStyles: any = null;
      for (let i = 0; i < totalNoDom; i++) {
        const card = allCards.nth(i);
        const isVis = await card.isVisible().catch(() => false);
        const box = await card.boundingBox().catch(() => null);
        if (isVis && box && box.width > 0 && box.height > 0) {
          visiveis++;
        } else if (!invisibleCardStyles) {
          // Capture first invisible card's computed style
          invisibleCardStyles = await card.evaluate((el) => {
            const cs = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            const parent = el.parentElement;
            const pcs = parent ? getComputedStyle(parent) : null;
            const pRect = parent ? parent.getBoundingClientRect() : null;
            return {
              opacity: cs.opacity,
              visibility: cs.visibility,
              display: cs.display,
              transform: cs.transform,
              width: r.width,
              height: r.height,
              top: r.top,
              left: r.left,
              position: cs.position,
              overflow: cs.overflow,
              parentTag: parent?.tagName || "none",
              parentDisplay: pcs?.display || "none",
              parentOverflow: pcs?.overflow || "none",
              parentWidth: pRect?.width || 0,
              parentHeight: pRect?.height || 0,
              className: (el as HTMLElement).className?.substring(0, 200),
            };
          }).catch(() => null);
        }
      }

      console.log(`Cards VISIVEIS: ${visiveis} / ${totalNoDom}`);
      if (invisibleCardStyles) {
        console.log(`\n=== COMPUTED-STYLE DO 1o CARD INVISIVEL ===`);
        console.log(JSON.stringify(invisibleCardStyles, null, 2));
      }

      await page.screenshot({ path: "e2e/screenshots/t105-catalog-headed.png", fullPage: true });

      // ============ PASSO 1b: HOME VISIBILITY ============
      console.log("\n=== PASSO 1b: HOME ===");
      await page.goto(`${PROD}/pt-BR`, { waitUntil: "networkidle", timeout: 25000 });
      await page.waitForTimeout(2500);

      const homeCards = page.locator(cardSelector);
      const homeTotal = await homeCards.count();
      let homeVisiveis = 0;
      for (let i = 0; i < homeTotal; i++) {
        const card = homeCards.nth(i);
        const isVis = await card.isVisible().catch(() => false);
        const box = await card.boundingBox().catch(() => null);
        if (isVis && box && box.width > 0 && box.height > 0) homeVisiveis++;
      }
      console.log(`Home cards DOM: ${homeTotal}, VISIVEIS: ${homeVisiveis}`);

      await page.screenshot({ path: "e2e/screenshots/t105-home-headed.png", fullPage: true });

      // ============ PASSO 4: LOGIN + RELOAD + COOKIES ============
      console.log("\n=== PASSO 4: LOGIN + RELOAD ===");

      const testEmail = `t105-${Date.now()}@prova.test`;
      const testPass = "Prova@105!";
      const testName = "T105 User";

      // Register via API
      try {
        const regRes = await fetch(`${API}/api/v1/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: testName, email: testEmail, password: testPass }),
        });
        console.log(`[API] Register: ${regRes.status}`);
      } catch (e: any) {
        console.log(`[API] Register error: ${e.message}`);
      }

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
        await page.waitForTimeout(3000);
      }

      await page.waitForTimeout(2000);

      // Check user indicator visibility
      const userIndicator = page.locator('button:has-text("T105"), [data-testid="user-menu"], button:has-text("Perfil"), button:has-text("Conta"), a[href*="/dashboard"], a[href*="/profile"]').first();
      const indicatorVis = await userIndicator.isVisible().catch(() => false);
      console.log(`Indicador de usuario visivel apos login: ${indicatorVis}`);

      await page.screenshot({ path: "e2e/screenshots/t105-apos-login-headed.png", fullPage: false });

      // CONTEXT.COOKIES() - lê o cookie real do browser
      const cookiesAfterLogin = await context.cookies();
      const sessCookie = cookiesAfterLogin.find((c) => c.name === "sess");
      console.log("\n=== context.cookies() APOS LOGIN ===");
      console.log(`Total cookies: ${cookiesAfterLogin.length}`);
      if (sessCookie) {
        console.log(`Cookie 'sess': domain=${sessCookie.domain}, path=${sessCookie.path}, sameSite=${sessCookie.sameSite}, httpOnly=${sessCookie.httpOnly}, secure=${sessCookie.secure}`);
      } else {
        console.log("Cookie 'sess' NAO encontrado!");
        console.log("Cookies disponiveis:", cookiesAfterLogin.map((c) => `${c.name} (${c.domain})`).join(", "));
      }

      // RELOAD
      console.log("\n--- RELOAD ---");
      await page.reload({ waitUntil: "networkidle", timeout: 25000 });
      await page.waitForTimeout(2500);

      const urlAfterReload = page.url();
      const isDashboard = urlAfterReload.includes("/dashboard");
      const userIndAfterReload = await userIndicator.isVisible().catch(() => false);
      console.log(`URL apos reload: ${urlAfterReload}`);
      console.log(`Dashboard: ${isDashboard}`);
      console.log(`Indicador usuario visivel apos reload: ${userIndAfterReload}`);

      // Check if "Entrar" button appeared (indicating logged out)
      const entrarBtn = page.locator('a[href*="/login"], button:has-text("Entrar")').first();
      const entrarVis = await entrarBtn.isVisible().catch(() => false);
      console.log(`Botao "Entrar" visivel: ${entrarVis} (se true = deslogou)`);

      await page.screenshot({ path: "e2e/screenshots/t105-pos-reload-headed.png", fullPage: false });

      // Cookies after reload
      const cookiesAfterReload = await context.cookies();
      const sessAfterReload = cookiesAfterReload.find((c) => c.name === "sess");
      console.log("\n=== context.cookies() APOS RELOAD ===");
      if (sessAfterReload) {
        console.log(`Cookie 'sess': domain=${sessAfterReload.domain}, path=${sessAfterReload.path}, sameSite=${sessAfterReload.sameSite}, httpOnly=${sessAfterReload.httpOnly}, secure=${sessAfterReload.secure}`);
      } else {
        console.log("Cookie 'sess' NAO encontrado apos reload!");
      }

      // ============ RESUMO ============
      console.log("\n========== RESUMO T105 ==========");
      console.log(`Catalogo: DOM=${totalNoDom}, visiveis=${visiveis}`);
      console.log(`Home: DOM=${homeTotal}, visiveis=${homeVisiveis}`);
      console.log(`Login: indicator=${indicatorVis}, reload-indicator=${userIndAfterReload}, entrar-btn=${entrarVis}`);
      console.log(`Cookie sess: ${sessCookie ? "PRESENTE" : "AUSENTE"}`);

      // Gate assertions (soft - we expect these to fail on baseline)
      expect(homeVisiveis, "Home precisa ter cards visiveis").toBeGreaterThan(0);

    } finally {
      await browser.close();
    }
  });
});
