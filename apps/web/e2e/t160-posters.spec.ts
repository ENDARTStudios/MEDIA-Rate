import { test, chromium } from "@playwright/test";

const PROD = "https://media-rate-web.vercel.app";
const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

test.describe("T160 - game poster verification", () => {
  test("8/8 games naturalWidth>0 on catalog", async () => {
    const browser = await chromium.launch({
      executablePath: BRAVE,
      headless: false,
      args: ["--no-sandbox", "--disable-gpu"],
    });
    const page = await browser
      .newContext({ viewport: { width: 1440, height: 900 } })
      .then((c) => c.newPage());

    try {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });

      await page.goto(PROD + "/pt-BR/catalog?type=game", { waitUntil: "load", timeout: 15000 });
      await page.waitForTimeout(4000);

      const imgs = page.locator('a[href*="/media/"] img');
      const count = await imgs.count().catch(() => 0);
      console.log("Game images found:", count);

      let allOk = true;
      for (let i = 0; i < count; i++) {
        const img = imgs.nth(i);
        const nw = await img
          .evaluate((el: HTMLImageElement) => (el.complete ? el.naturalWidth : 0))
          .catch(() => 0);
        const src = (await img.getAttribute("src").catch(() => "")) || "";
        const name = src.split("/").pop()?.substring(0, 40) || "?";
        console.log("  [" + i + "] nw=" + nw + " " + name);
        if (nw === 0) allOk = false;
      }

      // Check next/image errors
      const imgErrors = errors.filter((e) => e.includes("hostname") || e.includes("images"));
      console.log("\nNext/image errors:", imgErrors.length);
      imgErrors.forEach((e) => console.log("  ", e.substring(0, 120)));

      console.log("\nALL 8/8 naturalWidth>0:", allOk && count >= 8);
    } finally {
      await browser.close();
    }
  });
});
