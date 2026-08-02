import { test, chromium } from "@playwright/test";

const PROD = "https://media-rate-web.vercel.app";
const API = "https://media-rate-production.up.railway.app";
const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

test.describe("T135 - heart persistence diagnostic", () => {
  test("diagnose heart on real browser", async () => {
    const browser = await chromium.launch({
      executablePath: BRAVE,
      headless: false,
      args: ["--no-sandbox", "--disable-gpu"],
    });
    const page = await browser
      .newContext({ viewport: { width: 1440, height: 900 } })
      .then((c) => c.newPage());

    try {
      const testEmail = "t135-" + Date.now() + "@prova.test";
      await fetch(API + "/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: "T135Diag", email: testEmail, password: "Prova@135!" }),
      });

      await page.goto(PROD + "/pt-BR/login", { waitUntil: "networkidle", timeout: 20000 });
      await page.locator('input[name="email"]').first().fill(testEmail);
      await page.locator('input[name="password"]').first().fill("Prova@135!");
      await page.locator('button[type="submit"]').first().click();
      try {
        await page.waitForURL("**/dashboard", { timeout: 15000 });
      } catch {}

      // Track watchlist API
      let watchlistCalls = 0;
      let watchlistData = "";
      page.on("response", async (resp) => {
        if (resp.url().includes("/api/v1/watchlist") && resp.request().method() === "GET") {
          watchlistCalls++;
          try {
            watchlistData = await resp.text();
          } catch {}
        }
      });

      await page.goto(PROD + "/pt-BR/catalog", { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(3000);

      console.log("=== DIAGNOSTIC ===");
      console.log("Watchlist GET calls:", watchlistCalls);
      console.log("Watchlist response:", watchlistData.substring(0, 400));

      // Check heart buttons exist
      const btns = page.locator('button[aria-label*="Quero"], button[aria-label*="adicionar"]');
      const count = await btns.count().catch(() => 0);
      console.log("Heart buttons found:", count);

      if (count > 0) {
        // Read store state via evaluation
        const watchlistIds = await page.evaluate(() => {
          const raw = localStorage.getItem("mediarate:watchlist") || "";
          return raw.substring(0, 200);
        });
        console.log("LocalStore watchlist:", watchlistIds);

        // Click first heart
        await btns.first().click();
        await page.waitForTimeout(2500);

        // RELOAD
        console.log("\n--- RELOAD ---");
        await page.reload({ waitUntil: "networkidle", timeout: 20000 });
        await page.waitForTimeout(3000);

        // Check hearts after reload
        const filledNow = await page
          .locator(
            'svg[fill*="EF4444"], button[title*="vendo"], button[title*="vi"], button[title*="Quero"]',
          )
          .count()
          .catch(() => 0);
        console.log("Filled hearts after reload:", filledNow);
      }
    } finally {
      await browser.close();
    }
  });
});
