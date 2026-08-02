import { test, chromium } from "@playwright/test";

const PROD = "https://media-rate-web.vercel.app";
const API = "https://media-rate-production.up.railway.app";
const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

test.describe("T138 - heart persistence post-migration", () => {
  test("favoritar -> GET returns entry -> persist reload -> persist nav -> desfavoritar", async () => {
    const browser = await chromium.launch({
      executablePath: BRAVE,
      headless: false,
      args: ["--no-sandbox", "--disable-gpu"],
    });
    const page = await browser
      .newContext({ viewport: { width: 1440, height: 900 } })
      .then((c) => c.newPage());

    try {
      // Login
      const testEmail = "t138-" + Date.now() + "@prova.test";
      await fetch(API + "/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: "T138Verify", email: testEmail, password: "Prova@138!" }),
      });

      await page.goto(PROD + "/pt-BR/login", { waitUntil: "networkidle", timeout: 20000 });
      await page.locator('input[name="email"]').first().fill(testEmail);
      await page.locator('input[name="password"]').first().fill("Prova@138!");
      await page.locator('button[type="submit"]').first().click();
      try {
        await page.waitForURL("**/dashboard", { timeout: 15000 });
      } catch {}
      await page.waitForTimeout(2000);

      // Intercept watchlist API
      let postStatus = 0;
      let getBody = "";
      let getCount = 0;
      page.on("response", async (resp) => {
        const url = resp.url();
        if (!url.includes("/api/v1/watchlist")) return;
        if (resp.request().method() === "POST") postStatus = resp.status();
        if (resp.request().method() === "GET") {
          getCount++;
          try {
            getBody = await resp.text();
          } catch {}
        }
      });

      // Go to catalog
      await page.goto(PROD + "/pt-BR/catalog", { waitUntil: "load", timeout: 15000 });
      await page.waitForTimeout(5000);

      // Get first card's mediaId
      const firstCard = page.locator('a[href*="/media/"]').first();
      const href = (await firstCard.getAttribute("href").catch(() => "")) || "";
      const mediaId = href.split("/").pop() || "";
      console.log("Card mediaId:", mediaId);

      // Click heart
      const heartBtn = page.locator('button:has(svg path[d*="M20.84 4.61"])').first();
      await heartBtn.click();
      await page.waitForTimeout(4000);

      console.log("\n=== AFTER CLICK ===");
      console.log("POST status:", postStatus);
      const entryFound = getBody.includes(mediaId);
      console.log("GET body has mediaId:", entryFound);
      console.log("GET body:", getBody.substring(0, 300));

      const label1 = (await heartBtn.getAttribute("aria-label").catch(() => "")) || "";
      const filled1 =
        label1.includes("Quero Ver") || label1.includes("Vendo") || label1.includes("Vi");
      console.log("Heart filled:", filled1, "|", label1);

      // RELOAD
      console.log("\n--- RELOAD ---");
      getBody = "";
      getCount = 0;
      postStatus = 0;
      await page.reload({ waitUntil: "load", timeout: 15000 });
      await page.waitForTimeout(5000);

      const heart2 = page.locator('button:has(svg path[d*="M20.84 4.61"])').first();
      const label2 = (await heart2.getAttribute("aria-label").catch(() => "")) || "";
      const filled2 =
        label2.includes("Quero Ver") || label2.includes("Vendo") || label2.includes("Vi");
      const entryFound2 = getBody.includes(mediaId);
      console.log("Reload heart filled:", filled2, "|", label2);
      console.log("Reload GET has mediaId:", entryFound2);
      console.log("Reload GET body:", getBody.substring(0, 300));

      // NAVIGATE AWAY AND BACK
      console.log("\n--- NAV AWAY + BACK ---");
      getBody = "";
      await page.goto(PROD + "/pt-BR", { waitUntil: "load", timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.goto(PROD + "/pt-BR/catalog", { waitUntil: "load", timeout: 15000 });
      await page.waitForTimeout(5000);

      const heart3 = page.locator('button:has(svg path[d*="M20.84 4.61"])').first();
      const label3 = (await heart3.getAttribute("aria-label").catch(() => "")) || "";
      const filled3 =
        label3.includes("Quero Ver") || label3.includes("Vendo") || label3.includes("Vi");
      console.log("Nav-back heart filled:", filled3, "|", label3);

      // UNFAVORITE
      console.log("\n--- UNFAVORITE ---");
      await heart3.click();
      await page.waitForTimeout(1500);
      const removeBtn = page.locator('button:has-text("Remover")');
      if ((await removeBtn.count().catch(() => 0)) > 0) {
        await removeBtn.first().click();
        await page.waitForTimeout(2000);
      }
      const label4 = (await heart3.getAttribute("aria-label").catch(() => "")) || "";
      const unfilled = label4.includes("Adicionar");
      console.log("Unfavorited:", unfilled, "|", label4);

      await page.screenshot({ path: "e2e/screenshots/t138-final.png", fullPage: false });

      // SUMMARY
      console.log("\n========== T138 GATE ==========");
      console.log("POST 201:", postStatus === 201);
      console.log("GET has mediaId (string match):", entryFound || entryFound2);
      console.log("Heart filled after click:", filled1);
      console.log("Heart persists reload:", filled2);
      console.log("Heart persists nav:", filled3);
      console.log("Unfavorited:", unfilled);
    } finally {
      await browser.close();
    }
  });
});
