import { test, chromium } from "@playwright/test";

const PROD = "https://media-rate-web.vercel.app";
const API = "https://media-rate-production.up.railway.app";
const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

test.describe("T136 - heart persistence verification", () => {
  test("favoritar -> reload -> persist -> sair/voltar -> persist -> desfavoritar", async () => {
    const browser = await chromium.launch({
      executablePath: BRAVE,
      headless: false,
      args: ["--no-sandbox", "--disable-gpu"],
    });
    const page = await browser.newContext({ viewport: { width: 1440, height: 900 } }).then((c) => c.newPage());

    try {
      const testEmail = "t136f-" + Date.now() + "@prova.test";
      await fetch(API + "/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: "T136Final", email: testEmail, password: "Prova@136!" }),
      });

      await page.goto(PROD + "/pt-BR/login", { waitUntil: "networkidle", timeout: 20000 });
      await page.locator('input[name="email"]').first().fill(testEmail);
      await page.locator('input[name="password"]').first().fill("Prova@136!");
      await page.locator('button[type="submit"]').first().click();
      try { await page.waitForURL("**/dashboard", { timeout: 15000 }); } catch {}
      await page.waitForTimeout(2000);

      await page.goto(PROD + "/pt-BR/catalog", { waitUntil: "load", timeout: 15000 });
      await page.waitForTimeout(5000);

      // Find heart button by its unique SVG path
      const heartSelector = 'svg path[d*="M20.84 4.61"]';
      const heartCount = await page.locator(heartSelector).count().catch(() => 0);
      console.log("Heart SVGs found:", heartCount);

      if (heartCount === 0) {
        console.log("No heart SVGs found");
        await page.screenshot({ path: "e2e/screenshots/t136-no-hearts.png" });
        return;
      }

      // Get the button that contains the first heart SVG
      const firstHeartSvg = page.locator(heartSelector).first();
      const firstHeartBtn = firstHeartSvg.locator("..");
      // Walk up if needed
      const parentTag = await firstHeartBtn.evaluate(el => el.tagName).catch(() => "");
      console.log("Heart parent tag:", parentTag);
      
      // The SVG is inside a <button>, which is inside <motion.button> which renders as <button>
      // Use ancestor matching
      const btn = page.locator('button:has(' + heartSelector + ')').first();
      const btnTag = await btn.evaluate(el => el.tagName).catch(() => "");
      console.log("Button tag:", btnTag);

      const initialLabel = await btn.getAttribute("aria-label").catch(() => "") || "";
      const initialTitle = await btn.getAttribute("title").catch(() => "") || "";
      console.log("Initial aria-label:", initialLabel);
      console.log("Initial title:", initialTitle);

      const initiallyFilled = initialLabel.includes("Quero Ver") || initialLabel.includes("Vendo") || initialLabel.includes("Vi");
      console.log("Initially filled:", initiallyFilled);

      // Click to favorite
      await btn.click();
      await page.waitForTimeout(2500);

      const labelAfterClick = await btn.getAttribute("aria-label").catch(() => "") || "";
      const afterClickFilled = labelAfterClick.includes("Quero Ver") || labelAfterClick.includes("Vendo") || labelAfterClick.includes("Vi");
      console.log("After click filled:", afterClickFilled, "|", labelAfterClick);

      if (!afterClickFilled) {
        console.log("Click did NOT fill heart — watchlist API may have failed");
        await page.screenshot({ path: "e2e/screenshots/t136-fail.png" });
        return;
      }

      // RELOAD
      console.log("\n--- RELOAD ---");
      await page.reload({ waitUntil: "load", timeout: 15000 });
      await page.waitForTimeout(5000);

      const btnAfterReload = page.locator('button:has(' + heartSelector + ')').first();
      const labelAfterReload = await btnAfterReload.getAttribute("aria-label").catch(() => "") || "";
      const persistsReload = labelAfterReload.includes("Quero Ver") || labelAfterReload.includes("Vendo") || labelAfterReload.includes("Vi");
      console.log("After reload filled:", persistsReload, "|", labelAfterReload);

      // NAVIGATE AWAY AND BACK
      console.log("\n--- NAVIGATE AWAY AND BACK ---");
      await page.goto(PROD + "/pt-BR", { waitUntil: "load", timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.goto(PROD + "/pt-BR/catalog", { waitUntil: "load", timeout: 15000 });
      await page.waitForTimeout(5000);

      const btnAfterNav = page.locator('button:has(' + heartSelector + ')').first();
      const labelAfterNav = await btnAfterNav.getAttribute("aria-label").catch(() => "") || "";
      const persistsNav = labelAfterNav.includes("Quero Ver") || labelAfterNav.includes("Vendo") || labelAfterNav.includes("Vi");
      console.log("After nav filled:", persistsNav, "|", labelAfterNav);

      // UNFAVORITE
      console.log("\n--- UNFAVORITE ---");
      await btnAfterNav.click();
      await page.waitForTimeout(1500);

      const removeBtn2 = page.locator('button:has-text("Remover")');
      if (await removeBtn2.count().catch(() => 0) > 0) {
        await removeBtn2.first().click();
        await page.waitForTimeout(2000);
      }

      const btnAfterRemove = page.locator('button:has(' + heartSelector + ')').first();
      const labelAfterRemove = await btnAfterRemove.getAttribute("aria-label").catch(() => "") || "";
      const unfavorited = !labelAfterRemove.includes("Quero Ver") && !labelAfterRemove.includes("Vendo") && !labelAfterRemove.includes("Vi");
      console.log("Unfavorited:", unfavorited, "|", labelAfterRemove);

      await page.screenshot({ path: "e2e/screenshots/t136-final.png", fullPage: false });

      // SUMMARY
      console.log("\n========== T136 GATE ==========");
      console.log("PERSISTS reload:", persistsReload);
      console.log("PERSISTS nav:", persistsNav);
      console.log("UNFAVORITED:", unfavorited);
      console.log("ALL PASS:", persistsReload && persistsNav && unfavorited);

    } finally {
      await browser.close();
    }
  });
});
