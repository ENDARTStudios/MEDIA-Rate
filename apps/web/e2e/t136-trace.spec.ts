import { test, chromium } from "@playwright/test";

const PROD = "https://media-rate-web.vercel.app";
const API = "https://media-rate-production.up.railway.app";
const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

test("trace watchlist API v2", async () => {
  const browser = await chromium.launch({
    executablePath: BRAVE,
    headless: false,
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newContext({ viewport: { width: 1440, height: 900 } }).then((c) => c.newPage());

  try {
    const testEmail = "t136v3-" + Date.now() + "@prova.test";
    await fetch(API + "/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: "T136V3", email: testEmail, password: "Prova@136!" }),
    });

    await page.goto(PROD + "/pt-BR/login", { waitUntil: "networkidle", timeout: 20000 });
    await page.locator('input[name="email"]').first().fill(testEmail);
    await page.locator('input[name="password"]').first().fill("Prova@136!");
    await page.locator('button[type="submit"]').first().click();
    try { await page.waitForURL("**/dashboard", { timeout: 15000 }); } catch {}
    await page.waitForTimeout(2000);

    // Trace API responses
    let watchlistItems = "";
    page.on("response", async (resp) => {
      if (resp.url().includes("/api/v1/watchlist") && resp.request().method() === "GET") {
        try { watchlistItems = await resp.text(); } catch {}
      }
    });

    await page.goto(PROD + "/pt-BR/catalog", { waitUntil: "load", timeout: 15000 });
    await page.waitForTimeout(5000);

    console.log("Last watchlist GET items:", watchlistItems.substring(0, 300));

    // Get mediaId from first card's link
    const firstCardLink = page.locator('a[href*="/media/"]').first();
    const href = await firstCardLink.getAttribute("href").catch(() => "");
    const mediaId = href.split("/").pop() || "";
    console.log("First card href:", href);
    console.log("First card mediaId:", mediaId);

    // Click heart
    const heartBtn = page.locator('button:has(svg path[d*="M20.84 4.61"])').first();
    await heartBtn.click();
    await page.waitForTimeout(5000);

    // Check store state
    const storeState = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem("mediarate:csrf") || "";
        return "csrf: " + raw.substring(0, 50);
      } catch { return "error"; }
    });
    console.log("Store state:", storeState);

    const label = await heartBtn.getAttribute("aria-label").catch(() => "");
    console.log("Heart label after click + 5s wait:", label);

    // RELOAD and check again
    console.log("\n--- RELOAD ---");
    await page.reload({ waitUntil: "load", timeout: 15000 });
    await page.waitForTimeout(5000);

    const heartAfterReload = page.locator('button:has(svg path[d*="M20.84 4.61"])').first();
    const label2 = await heartAfterReload.getAttribute("aria-label").catch(() => "");
    console.log("Heart label after reload:", label2);

  } finally {
    await browser.close();
  }
});
