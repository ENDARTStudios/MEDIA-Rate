import { test, chromium } from "@playwright/test";

const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

const URLS = [
  "https://media-rate-web.vercel.app",
  "https://web-6hiv0vqcj-end-art-studios.vercel.app",
  "https://web-ten-iota-34.vercel.app",
];

test("compare all URLs catalog", async () => {
  const browser = await chromium.launch({
    executablePath: BRAVE,
    headless: false,
    args: ["--no-sandbox", "--disable-gpu"],
  });

  for (const baseUrl of URLS) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    console.log(`\n=== ${baseUrl} ===`);
    try {
      await page.goto(`${baseUrl}/pt-BR/catalog`, { waitUntil: "load", timeout: 15000 });
      await page.waitForTimeout(2000);
      const count = await page.locator('a[href*="/media/"]').count();
      const url = page.url();
      console.log(`URL final: ${url.substring(0, 80)}`);
      console.log(`Cards no DOM: ${count}`);
      if (count > 0) {
        const box = await page.locator('a[href*="/media/"]').first().boundingBox().catch(() => null);
        console.log(`Card 0 box: ${box ? `${box.width}x${box.height}` : "null"}`);
      }
    } catch (e: any) {
      console.log(`ERROR: ${e.message?.substring(0, 100)}`);
    }
    await ctx.close();
  }

  await browser.close();
});
