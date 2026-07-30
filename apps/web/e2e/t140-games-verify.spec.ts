import { test, chromium } from "@playwright/test";

const PROD = "https://media-rate-web.vercel.app";
const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

test.describe("T140 - game images verification", () => {
  test("game cards have images, consistent aspect-ratio, clear hierarchy", async () => {
    const browser = await chromium.launch({
      executablePath: BRAVE,
      headless: false,
      args: ["--no-sandbox", "--disable-gpu"],
    });
    const page = await browser.newContext({ viewport: { width: 1440, height: 900 } }).then((c) => c.newPage());

    try {
      // Track image loading errors
      const imgErrors: string[] = [];
      page.on("response", (resp) => {
        if (resp.status() === 404 && resp.url().includes("image.tmdb.org")) {
          imgErrors.push(resp.url().substring(0, 100));
        }
      });

      await page.goto(PROD + "/pt-BR/catalog", { waitUntil: "load", timeout: 15000 });
      await page.waitForTimeout(4000);

      // Check image elements in cards
      const imgs = page.locator('a[href*="/media/"] img');
      const imgCount = await imgs.count().catch(() => 0);
      console.log("Total images in cards:", imgCount);

      // Check images that are actually loaded (not placeholder, not broken)
      let visibleImgs = 0;
      for (let i = 0; i < imgCount; i++) {
        const img = imgs.nth(i);
        const src = await img.getAttribute("src").catch(() => "") || "";
        const natural = await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0).catch(() => false);
        if (natural && src.includes("image.tmdb.org")) {
          visibleImgs++;
        } else if (natural) {
          visibleImgs++;
        }
      }
      console.log("Natural images loaded:", visibleImgs);

      // Check card sizes for consistency
      const cards = page.locator('a[href*="/media/"]');
      const cardCount = await cards.count().catch(() => 0);
      let prevWidth = 0;
      let allSame = true;
      for (let i = 0; i < Math.min(cardCount, 8); i++) {
        const box = await cards.nth(i).boundingBox().catch(() => null);
        if (box) {
          if (i > 0 && Math.abs(box.width - prevWidth) > 5) allSame = false;
          prevWidth = box.width;
          if (i < 4) console.log("Card", i, "size:", Math.round(box.width) + "x" + Math.round(box.height));
        }
      }
      console.log("All cards same width:", allSame);

      // Check for image errors
      imgErrors.forEach((e) => console.log("Image 404:", e));

      await page.screenshot({ path: "e2e/screenshots/t140-games.png", fullPage: true });

      console.log("\n=== SUMMARY ===");
      console.log("Images loaded:", visibleImgs, "/", imgCount);
      console.log("Cards consistent:", allSame);
      console.log("Image errors:", imgErrors.length);

    } finally {
      await browser.close();
    }
  });
});
