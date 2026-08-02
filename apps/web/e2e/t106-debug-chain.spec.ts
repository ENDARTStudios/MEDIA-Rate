import { test, chromium } from "@playwright/test";

const PROD = "https://media-rate-web.vercel.app";
const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

test("debug catalog chain opacity", async () => {
  const browser = await chromium.launch({
    executablePath: BRAVE,
    headless: false,
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser
    .newContext({ viewport: { width: 1440, height: 900 } })
    .then((c) => c.newPage());

  try {
    await page.goto(`${PROD}/pt-BR/catalog`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(3000);

    const card = page.locator('a[href*="/media/"]').first();
    const isVis = await card.isVisible();
    const box = await card.boundingBox();
    console.log(`Card 0 isVisible: ${isVis}, box: ${JSON.stringify(box)}`);

    const chain = await card.evaluate((el) => {
      const result: any[] = [];
      let e: Element | null = el;
      for (let i = 0; i < 6 && e; i++, e = e.parentElement) {
        const cs = getComputedStyle(e);
        result.push({
          depth: i,
          tag: e.tagName,
          cls: (e as HTMLElement).className?.substring(0, 60) || "",
          opacity: cs.opacity,
          display: cs.display,
          visibility: cs.visibility,
          width: e.getBoundingClientRect().width,
          height: e.getBoundingClientRect().height,
        });
      }
      return result;
    });

    console.log("\n=== OPACITY CHAIN ===");
    chain.forEach((c: any) => {
      console.log(
        `[${c.depth}] ${c.tag}.${c.cls} opacity=${c.opacity} display=${c.display} ${c.width}x${c.height}`,
      );
    });

    // Check prefers-reduced-motion
    const prm = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
    console.log(`\nprefers-reduced-motion: ${prm}`);
  } finally {
    await browser.close();
  }
});
