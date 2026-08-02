import { test, chromium } from "@playwright/test";

const PROD = "https://media-rate-web.vercel.app";
const API = "https://media-rate-production.up.railway.app";
const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

test.describe("T109 - DiagPanel fail-proof + login capture", () => {
  test("diag no-crash + panel text capture + cookie fact", async () => {
    const browser = await chromium.launch({
      executablePath: BRAVE,
      headless: false,
      args: ["--no-sandbox", "--disable-gpu"],
    });
    const page = await browser
      .newContext({
        viewport: { width: 1440, height: 900 },
        ignoreHTTPSErrors: true,
      })
      .then((c) => c.newPage());

    try {
      const pageErrors: string[] = [];
      const failedRequests: string[] = [];
      page.on("pageerror", (e) => {
        pageErrors.push(e.message);
        console.log(`[PAGEERROR] ${e.message}`);
      });
      page.on("requestfailed", (r) => {
        failedRequests.push(`${r.url()} — ${r.failure()?.errorText}`);
      });

      // ============ PASSO 2: ?diag=1 no crash ============
      console.log("\n=== PASSO 2: ?diag=1 NO CRASH ===");
      await page.goto(`${PROD}/pt-BR?diag=1`, { waitUntil: "networkidle", timeout: 25000 });
      await page.waitForTimeout(3000);

      const bodyText = await page
        .locator("body")
        .innerText()
        .catch(() => "");
      const hasCantLoad = bodyText.includes("couldn't load") || bodyText.includes("could not load");
      console.log(`"couldn't load" found: ${hasCantLoad}`);

      // Check home content is visible (hero or main content)
      const heroTitle = await page
        .locator("#hero-title")
        .isVisible()
        .catch(() => false);
      const mainContent = await page
        .locator("main h1, main h2, main section")
        .first()
        .isVisible()
        .catch(() => false);
      console.log(`Hero visible: ${heroTitle}, Main content: ${mainContent}`);

      // Check DiagPanel in DOM
      const panelCount = await page.locator("[data-diag-panel]").count();
      const panelText = await page
        .locator("[data-diag-panel]")
        .innerText()
        .catch(() => "PANEL-NOT-FOUND");
      console.log(`DiagPanel count: ${panelCount}, text length: ${panelText.length}`);
      if (panelText !== "PANEL-NOT-FOUND") {
        console.log(`\n--- DIAGPANEL TEXT (no login) ---`);
        console.log(panelText);
      }

      await page.screenshot({ path: "e2e/screenshots/t109-diag-no-crash.png", fullPage: true });

      // ============ PASSO 3: LOGIN + PANEL TEXT ============
      console.log("\n=== PASSO 3: LOGIN + PANEL TEXT ===");

      const testEmail = `t109-${Date.now()}@prova.test`;
      const testPass = "Prova@109!";

      const regRes = await fetch(`${API}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: "T109 Diag", email: testEmail, password: testPass }),
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
      await page.waitForTimeout(2000);

      // Go to ?diag=1 logged
      await page.goto(`${PROD}/pt-BR?diag=1`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(3500); // Wait for /me + /watchlist fetches

      // Click "Retestar" button to refresh the status
      const retestarBtn = page.locator('button:has-text("Retestar")');
      if (await retestarBtn.isVisible().catch(() => false)) {
        await retestarBtn.click();
        await page.waitForTimeout(2500);
      }

      const loggedPanelText = await page
        .locator("[data-diag-panel]")
        .innerText()
        .catch(() => "PANEL-NOT-FOUND");
      console.log(`\n--- DIAGPANEL TEXT (LOGADO) ---`);
      console.log(loggedPanelText);

      // Cookie in browser
      const cookiesAfterLogin = await page.context().cookies();
      const sess = cookiesAfterLogin.find((c) => c.name === "sess");
      console.log(`\n--- COOKIE 'sess' (LOGADO) ---`);
      if (sess) {
        console.log(`name: ${sess.name}`);
        console.log(`domain: ${sess.domain}`);
        console.log(`path: ${sess.path}`);
        console.log(`sameSite: ${sess.sameSite}`);
        console.log(`httpOnly: ${sess.httpOnly}`);
        console.log(`secure: ${sess.secure}`);
        console.log(`expires: ${sess.expires}`);
      } else {
        console.log("Cookie 'sess' AUSENTE!");
      }

      await page.screenshot({ path: "e2e/screenshots/t109-diag-logado.png", fullPage: true });

      // ============ RELOAD ============
      console.log("\n--- RELOAD ---");
      await page.reload({ waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(3500);

      const retestarBtn2 = page.locator('button:has-text("Retestar")');
      if (await retestarBtn2.isVisible().catch(() => false)) {
        await retestarBtn2.click();
        await page.waitForTimeout(2500);
      }

      const reloadPanelText = await page
        .locator("[data-diag-panel]")
        .innerText()
        .catch(() => "PANEL-NOT-FOUND");
      console.log(`\n--- DIAGPANEL TEXT (POS-RELOAD) ---`);
      console.log(reloadPanelText);

      const cookiesAfterReload = await page.context().cookies();
      const sess2 = cookiesAfterReload.find((c) => c.name === "sess");
      console.log(`\n--- COOKIE 'sess' (POS-RELOAD) ---`);
      if (sess2) {
        console.log(`name: ${sess2.name}`);
        console.log(`domain: ${sess2.domain}`);
        console.log(`path: ${sess2.path}`);
        console.log(`sameSite: ${sess2.sameSite}`);
        console.log(`httpOnly: ${sess2.httpOnly}`);
        console.log(`secure: ${sess2.secure}`);
        console.log(`expires: ${sess2.expires}`);
      } else {
        console.log("Cookie 'sess' AUSENTE apos reload!");
      }

      await page.screenshot({ path: "e2e/screenshots/t109-diag-pos-reload.png", fullPage: true });

      // ============ RESUMO ============
      console.log("\n========== RESUMO T109 ==========");
      console.log(`Page errors: ${pageErrors.length}`);
      pageErrors.forEach((e) => console.log(`  ${e}`));
      console.log(`Failed requests: ${failedRequests.length}`);
      failedRequests.forEach((r) => console.log(`  ${r}`));
      console.log(`"couldn't load" found: ${hasCantLoad}`);
      console.log(`DiagPanel found: ${panelCount > 0}`);
    } finally {
      await browser.close();
    }
  });
});
