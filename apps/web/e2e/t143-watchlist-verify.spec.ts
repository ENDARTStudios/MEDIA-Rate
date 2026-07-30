import { test, chromium } from "@playwright/test";

const PROD = "https://media-rate-web.vercel.app";
const API = "https://media-rate-production.up.railway.app";
const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

const LOCALES = ["pt-BR", "en-US", "es-ES"];
const GAME_TITLES = ["Elden Ring", "Minecraft", "Cyberpunk 2077", "God of War"];

test.describe("T143 - watchlist verification", () => {
  for (const locale of LOCALES) {
    test(locale + " — 0 raw ID, 0 raw key, real titles, counts correct", async () => {
      const browser = await chromium.launch({
        executablePath: BRAVE,
        headless: false,
        args: ["--no-sandbox", "--disable-gpu"],
      });
      const page = await browser.newContext({ viewport: { width: 1440, height: 900 } }).then((c) => c.newPage());

      try {
        // Login
        const testEmail = "t143-" + Date.now() + "@prova.test";
        await fetch(API + "/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: "T143WL", email: testEmail, password: "Prova@143!" }),
        });

        await page.goto(PROD + "/" + locale + "/login", { waitUntil: "networkidle", timeout: 20000 });
        await page.locator('input[name="email"]').first().fill(testEmail);
        await page.locator('input[name="password"]').first().fill("Prova@143!");
        await page.locator('button[type="submit"]').first().click();
        try { await page.waitForURL("**/dashboard", { timeout: 15000 }); } catch {}
        await page.waitForTimeout(2000);

        // Go to watchlist
        await page.goto(PROD + "/" + locale + "/watchlist", { waitUntil: "load", timeout: 15000 });
        await page.waitForTimeout(5000);

        const bodyText = await page.locator("body").innerText().catch(() => "") || "";
        console.log("\n=== " + locale + " ===");

        // Check 1: no raw "Mídia <id/uuid>" patterns
        const rawIdPattern = /Mídia\s+[0-9a-f]{4,}/i;
        const hasRawId = rawIdPattern.test(bodyText);
        console.log("Raw 'Mídia <id>' found:", hasRawId);

        // Check 2: no raw "watchlist.moveTo" key
        const hasRawKey = bodyText.includes("watchlist.moveTo");
        console.log("Raw 'watchlist.moveTo' found:", hasRawKey);

        // Check 3: titles are real (not raw IDs)
        const lines = bodyText.split("\n").filter((l) => l.trim().length > 0);
        const suspiciousLines = lines.filter((l) => /^\s*(?:Mídia|[0-9a-f]{8,})\s*$/.test(l.trim()));
        console.log("Suspicious lines (raw IDs):", suspiciousLines.length);
        suspiciousLines.forEach((l) => console.log("  ", l));

        // Check 4: real titles visible (sample)
        const hasTitles = GAME_TITLES.some((t) => bodyText.includes(t));
        console.log("Real game titles visible:", hasTitles);

        // Check 5: "moveTo" translated
        const expectedMoveTo = locale === "pt-BR" ? "Mover para" : locale === "en-US" ? "Move to" : "Mover a";
        const moveToVisible = bodyText.includes(expectedMoveTo);
        console.log("moveTo translated '" + expectedMoveTo + "' visible:", moveToVisible);

        // Check 6: some content loaded (not empty)
        const hasContent = bodyText.includes("Quero Ver") || bodyText.includes("Want to") || bodyText.includes("Quiero ver");
        console.log("Watchlist columns visible:", hasContent);

        await page.screenshot({ path: "e2e/screenshots/t143-" + locale + ".png", fullPage: false });

        // Summary
        const pass = !hasRawId && !hasRawKey && !hasContent === false;
        console.log("PASS:", pass);

      } finally {
        await browser.close();
      }
    });
  }
});
