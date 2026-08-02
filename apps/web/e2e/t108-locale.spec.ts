import { test, chromium } from "@playwright/test";

const PROD = "https://media-rate-web.vercel.app";
const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

test.describe("T108 - locale links gateway", () => {
  test("click links maintain /pt-BR, no 307 redirect", async () => {
    const browser = await chromium.launch({
      executablePath: BRAVE,
      headless: false,
      args: ["--no-sandbox", "--disable-gpu"],
    });
    const page = await browser
      .newContext({ viewport: { width: 1440, height: 900 } })
      .then((c) => c.newPage());

    try {
      const redirects307: string[] = [];
      page.on("response", (res) => {
        if (res.status() === 307) {
          redirects307.push(`${res.url()} -> ${res.headers()["location"]}`);
          console.log(`[307] ${res.url()} -> ${res.headers()["location"]}`);
        }
      });

      // === TEST 1: Login page - Logo visible ===
      console.log("\n=== TEST 1: Login - Logo ===");
      await page.goto(`${PROD}/pt-BR/login`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(1500);
      const logoVis = await page
        .locator('nav a[aria-label], a[href="/pt-BR"], a[href="/pt-BR/login"]')
        .first()
        .isVisible()
        .catch(() => false);
      console.log(`Logo visible: ${logoVis}`);

      // === TEST 2: Login - click "Cadastre-se" ===
      console.log("\n=== TEST 2: Login -> Cadastre-se ===");
      const cadastreLink = page.locator('a[href*="/register"]').first();
      const cadastreHref = await cadastreLink.getAttribute("href").catch(() => "");
      console.log(`Cadastre-se href: ${cadastreHref}`);
      if (cadastreHref.includes("/pt-BR/register")) {
        await cadastreLink.click();
        await page.waitForURL("**/pt-BR/register", { timeout: 10000 });
        console.log(`After click URL: ${page.url()}`);
      }

      // === TEST 3: Register - click "Entrar" ===
      console.log("\n=== TEST 3: Register -> Entrar ===");
      const entrarLink = page.locator('a[href*="/login"]').first();
      const entrarHref = await entrarLink.getAttribute("href").catch(() => "");
      console.log(`Entrar href: ${entrarHref}`);
      if (entrarHref.includes("/pt-BR/login")) {
        await entrarLink.click();
        await page.waitForURL("**/pt-BR/login", { timeout: 10000 });
        console.log(`After click URL: ${page.url()}`);
      }

      // === TEST 4: Register - Terms/Privacy href check (target=_blank) ===
      console.log("\n=== TEST 4: Terms/Privacy href ===");
      await page.goto(`${PROD}/pt-BR/register`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(1500);
      const tHref = await page
        .locator('a[href*="/terms"]')
        .first()
        .getAttribute("href")
        .catch(() => "");
      const pHref = await page
        .locator('a[href*="/privacy"]')
        .first()
        .getAttribute("href")
        .catch(() => "");
      console.log(`Terms href: ${tHref} -> has /pt-BR: ${tHref?.includes("/pt-BR/terms")}`);
      console.log(`Privacy href: ${pHref} -> has /pt-BR: ${pHref?.includes("/pt-BR/privacy")}`);

      await page.screenshot({ path: "e2e/screenshots/t108-register.png", fullPage: false });

      // === RESUMO ===
      console.log("\n========== RESUMO T108 ==========");
      console.log(`Redirects 307: ${redirects307.length}`);
      redirects307.forEach((r) => console.log(`  ${r}`));

      const hasLocale307 = redirects307.some(
        (r) =>
          r.includes("/login") ||
          r.includes("/register") ||
          r.includes("/terms") ||
          r.includes("/privacy"),
      );
      console.log(`307 involving locale paths: ${hasLocale307}`);

      if (hasLocale307) {
        console.log("FAIL: 307 redirects found on locale paths!");
      } else {
        console.log("PASS: No 307 redirects on locale paths");
      }
    } finally {
      await browser.close();
    }
  });
});
