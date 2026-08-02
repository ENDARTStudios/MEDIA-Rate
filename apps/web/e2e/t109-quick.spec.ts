import { test, chromium } from "@playwright/test";

const PROD = "https://media-rate-web.vercel.app";
const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

test("quick diag debug", async () => {
  const browser = await chromium.launch({
    executablePath: BRAVE,
    headless: false,
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser
    .newContext({ viewport: { width: 1440, height: 900 } })
    .then((c) => c.newPage());

  try {
    await page.goto(`${PROD}/pt-BR?diag=1`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(3000);

    const finalUrl = page.url();
    console.log(`Final URL: ${finalUrl}`);
    console.log(`Has ?diag=1: ${finalUrl.includes("?diag=1") || finalUrl.includes("&diag=1")}`);

    // Check all window.location properties
    const locInfo = await page.evaluate(() => ({
      href: window.location.href,
      search: window.location.search,
      queryParams: new URLSearchParams(window.location.search).get("diag"),
    }));
    console.log(`window.location: ${JSON.stringify(locInfo)}`);

    const panelExist = await page.locator("[data-diag-panel]").count();
    console.log(`data-diag-panel count: ${panelExist}`);

    // Check page errors
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => {
      pageErrors.push(e.message);
      console.log(`[ERR] ${e.message}`);
    });

    // Wait a bit more and check again
    await page.waitForTimeout(2000);
    const panelExist2 = await page.locator("[data-diag-panel]").count();
    console.log(`data-diag-panel count after more wait: ${panelExist2}`);

    // Check for any fixed div in bottom-right
    const fixedDivs = page.locator(".fixed.bottom-4.right-4");
    const fixedCount = await fixedDivs.count();
    console.log(`Fixed bottom-right divs: ${fixedCount}`);
    for (let i = 0; i < fixedCount; i++) {
      const text = await fixedDivs
        .nth(i)
        .innerText()
        .catch(() => "error");
      console.log(`  [${i}]: ${text.substring(0, 80)}`);
    }
  } finally {
    await browser.close();
  }
});
