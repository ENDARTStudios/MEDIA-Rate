import { test, chromium } from "@playwright/test";

const PROD = "https://media-rate-web.vercel.app";
const API = "https://media-rate-production.up.railway.app";
const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

test.describe("T131 - SSR data-authed snapshot", () => {
  test("com sessao: SSR contem data-authed='1'", async () => {
    const browser = await chromium.launch({
      executablePath: BRAVE,
      headless: false,
      args: ["--no-sandbox", "--disable-gpu"],
    });
    const page = await browser.newContext({ viewport: { width: 1440, height: 900 } }).then((c) => c.newPage());

    try {
      // Login
      const testEmail = `t131-${Date.now()}@prova.test`;
      await fetch(`${API}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: "T131", email: testEmail, password: "Prova@131!" }),
      });

      await page.goto(`${PROD}/pt-BR/login`, { waitUntil: "networkidle", timeout: 20000 });
      await page.locator('input[name="email"]').first().fill(testEmail);
      await page.locator('input[name="password"]').first().fill("Prova@131!");
      await page.locator('button[type="submit"]').first().click();
      try { await page.waitForURL("**/dashboard", { timeout: 15000 }); } catch {}

      // Intercept SSR HTML
      const results: { authed: boolean; snippet: string }[] = [];
      page.on("response", async (resp) => {
        if (resp.request().resourceType() === "document") {
          try {
            const html = await resp.text();
            results.push({
              authed: html.includes('data-authed="1"'),
              snippet: html.includes('data-authed="1"')
                ? html.substring(html.indexOf('data-authed="1"') - 50, html.indexOf('data-authed="1"') + 100)
                : (html.includes("<nav") ? html.substring(html.indexOf("<nav"), html.indexOf("<nav") + 200) : "NO_NAV"),
            });
          } catch {}
        }
      });

      await page.reload({ waitUntil: "load", timeout: 20000 });
      await page.waitForTimeout(1000);

      console.log("\n=== COM SESSAO ===");
      for (const r of results) {
        console.log(`  data-authed="1": ${r.authed}`);
        console.log(`  snippet: ${r.snippet.replace(/[\n\r]/g, " ")}`);
      }
    } finally {
      await browser.close();
    }
  });

  test("sem sessao: SSR NAO contem data-authed='1'", async () => {
    const browser = await chromium.launch({
      executablePath: BRAVE,
      headless: false,
      args: ["--no-sandbox", "--disable-gpu"],
    });
    const page = await browser.newContext({ viewport: { width: 1440, height: 900 } }).then((c) => c.newPage());

    try {
      const results: { authed: boolean; snippet: string }[] = [];
      page.on("response", async (resp) => {
        if (resp.request().resourceType() === "document") {
          try {
            const html = await resp.text();
            results.push({
              authed: html.includes('data-authed="1"'),
              snippet: html.includes("<nav") ? html.substring(html.indexOf("<nav"), html.indexOf("<nav") + 200) : "NO_NAV",
            });
          } catch {}
        }
      });

      await page.goto(`${PROD}/pt-BR`, { waitUntil: "load", timeout: 20000 });

      console.log("\n=== SEM SESSAO ===");
      for (const r of results) {
        console.log(`  data-authed="1": ${r.authed}`);
        console.log(`  snippet: ${r.snippet.replace(/[\n\r]/g, " ")}`);
      }
    } finally {
      await browser.close();
    }
  });
});
