import { test, chromium } from "@playwright/test";

const DEPLOY_URL = "https://web-3f9nv06yi-end-art-studios.vercel.app";
const PROD = "https://media-rate-web.vercel.app";
const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

test("compare deploy vs prod catalog", async () => {
  const browser = await chromium.launch({
    executablePath: BRAVE,
    headless: false,
    args: ["--no-sandbox", "--disable-gpu"],
  });

  for (const url of [DEPLOY_URL, PROD]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    console.log(`\n=== ${url} ===`);
    await page.goto(`${url}/pt-BR/catalog`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(2500);

    const card = page.locator('a[href*="/media/"]').first();
    const box = await card.boundingBox();
    const chain = await card.evaluate((el) => {
      const result: any[] = [];
      let e: Element | null = el;
      for (let i = 0; i < 4 && e; i++, e = e.parentElement) {
        result.push({
          d: i,
          t: e.tagName,
          o: getComputedStyle(e).opacity,
        });
      }
      return result;
    });
    chain.forEach((c: any) => console.log(`  [${c.d}] ${c.t} opacity=${c.o}`));
    console.log(`  box: ${box?.width}x${box?.height}`);
    await ctx.close();
  }

  await browser.close();
});
