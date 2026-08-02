import { test, chromium } from "@playwright/test";

const PROD = "https://media-rate-web.vercel.app";
const API = "https://media-rate-production.up.railway.app";
const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

test.describe("T130 - SSR flash diagnostic", () => {
  test("intercept SSR HTML on reload — prove flash", async () => {
    const browser = await chromium.launch({
      executablePath: BRAVE,
      headless: false,
      args: ["--no-sandbox", "--disable-gpu"],
    });
    const page = await browser
      .newContext({ viewport: { width: 1440, height: 900 } })
      .then((c) => c.newPage());

    try {
      // Register + Login
      const testEmail = `t130-${Date.now()}@prova.test`;
      const testPass = "Prova@130!";
      await fetch(`${API}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: "T130 SSR", email: testEmail, password: testPass }),
      });

      await page.goto(`${PROD}/pt-BR/login`, { waitUntil: "networkidle", timeout: 20000 });
      await page.locator('input[name="email"]').first().fill(testEmail);
      await page.locator('input[name="password"]').first().fill(testPass);
      await page.locator('button[type="submit"]').first().click();
      try {
        await page.waitForURL("**/dashboard", { timeout: 15000 });
      } catch {}

      // === SSR HTML intercept on reload ===
      console.log("\n=== SSR HTML SNAPSHOT ON RELOAD ===");

      const ssrSnapshots: string[] = [];
      page.on("response", async (resp) => {
        if (resp.request().resourceType() === "document" && resp.url().includes("/pt-BR")) {
          try {
            const html = await resp.text();
            ssrSnapshots.push(html);
            const hasEntrar = html.includes("Entrar");
            const hasCadastrar = html.includes("Cadastrar") || html.includes("Cadastre-se");
            const hasEdi =
              html.includes("Edi") || html.includes("avatar-menu") || html.includes("data-authed");
            // Extract the nav section (~1000 chars around "Entrar")
            const entrarIdx = html.indexOf("Entrar");
            const snippet =
              entrarIdx > 0
                ? html.substring(Math.max(0, entrarIdx - 400), entrarIdx + 600)
                : "NOT_FOUND";
            console.log(`\nSSR HTML (document reload):`);
            console.log(`  contiene "Entrar": ${hasEntrar}`);
            console.log(`  contiene "Cadastrar/Cadastre-se": ${hasCadastrar}`);
            console.log(`  contiene indicador logado (Edi/avatar): ${hasEdi}`);
            console.log(
              `  snippet (~1000 chars): ${snippet
                .replace(/[\n\r]/g, " ")
                .replace(/\s+/g, " ")
                .substring(0, 500)}`,
            );
          } catch {}
        }
      });

      await page.reload({ waitUntil: "load", timeout: 20000 });
      await page.waitForTimeout(2000);

      // Also check after reload: DOM state
      const urlAfterReload = page.url();
      console.log(`\nURL após reload: ${urlAfterReload}`);

      // Check DiagPanel state
      await page.goto(`${PROD}/pt-BR?diag=1`, { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(3000);
      const diagText = await page
        .locator("[data-diag-panel]")
        .innerText()
        .catch(() => "N/A");
      console.log(`\nDiagPanel after login+reload:`);
      // Extract the me line
      const meLine = diagText.split("\n").find((l: string) => l.includes("me:"));
      console.log(`  ${meLine}`);

      console.log(`\nSSR snapshots captured: ${ssrSnapshots.length}`);
    } finally {
      await browser.close();
    }
  });
});
