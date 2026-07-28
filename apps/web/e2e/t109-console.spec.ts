import { test, chromium } from "@playwright/test";

const PROD = "https://media-rate-web.vercel.app";
const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

test("diag console debug", async () => {
  const browser = await chromium.launch({
    executablePath: BRAVE,
    headless: false,
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newContext({ viewport: { width: 1440, height: 900 } }).then((c) => c.newPage());

  try {
    // Capture ALL console messages
    const logs: string[] = [];
    page.on("console", (msg) => {
      if (msg.text().includes("Diag") || msg.text().includes("Error") || msg.text().includes("error") || msg.text().includes("crash")) {
        logs.push(`[${msg.type()}] ${msg.text().substring(0, 150)}`);
      }
    });
    page.on("pageerror", (e) => { logs.push(`[PAGEERROR] ${e.message}`); });

    await page.goto(`${PROD}/pt-BR?diag=1`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(4000);

    console.log("\n=== RELEVANT CONSOLE LOGS ===");
    logs.forEach((l) => console.log(l));

    // Check if the DiagPanelLoader rendered at all (any child of layout)
    const allFixed = await page.evaluate(() => {
      const divs = document.querySelectorAll('div[class*="fixed"]');
      return Array.from(divs).map((d) => ({
        cls: (d as HTMLElement).className?.substring(0, 100),
        text: (d as HTMLElement).innerText?.substring(0, 60),
      }));
    });
    console.log(`\n=== FIXED DIVS (${allFixed.length}) ===`);
    allFixed.forEach((d) => console.log(`  ${d.text} | ${d.cls}`));

  } finally {
    await browser.close();
  }
});
