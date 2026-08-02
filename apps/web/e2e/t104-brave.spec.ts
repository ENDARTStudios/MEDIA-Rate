import { test, expect, chromium } from "@playwright/test";

const PROD = "https://media-rate-web.vercel.app";
const API = "https://media-rate-production.up.railway.app";
const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

interface ReqLog {
  url: string;
  host: string;
  hasCookie: boolean;
  type: string;
  method: string;
}

interface ResLog {
  url: string;
  host: string;
  status: number;
  setCookie: string;
  headers: Record<string, string>;
}

test.describe("T104 - Brave browser intercept", () => {
  test("Brave login + reload + catalog", async () => {
    const browser = await chromium.launch({
      executablePath: BRAVE,
      headless: true,
      args: ["--no-sandbox", "--disable-gpu"],
    });

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();

    const logs: { reqs: ReqLog[]; ress: ResLog[] } = { reqs: [], ress: [] };

    page.on("request", (req) => {
      const url = req.url();
      let host = "";
      try {
        host = new URL(url).host;
      } catch {
        host = "invalid";
      }
      const cookie = req.headers()["cookie"];
      logs.reqs.push({
        url,
        host,
        hasCookie: !!cookie,
        type: req.resourceType(),
        method: req.method(),
      });
      if (req.resourceType() === "fetch" || req.resourceType() === "xhr" || url.includes("/api/")) {
        console.log(
          `[REQ] ${req.method()} ${host} cookie=${cookie ? "SIM" : "NAO"} ${url.substring(0, 150)}`,
        );
      }
    });

    page.on("response", (res) => {
      const url = res.url();
      let host = "";
      try {
        host = new URL(url).host;
      } catch {
        host = "invalid";
      }
      const setCookie = res.headers()["set-cookie"] || "";
      const allHeaders = res.headers();
      logs.ress.push({ url, host, status: res.status(), setCookie, headers: allHeaders });
      if (url.includes("/api/") || setCookie) {
        const scMasked = setCookie ? setCookie.replace(/=[^;]+/, "=***").substring(0, 250) : "";
        console.log(
          `[RES] ${res.status()} ${host} set-cookie=${scMasked || "(none)"} ${url.substring(0, 120)}`,
        );
      }
    });

    try {
      // PASSO 0: Registra usuario via API
      const testEmail = `t104-brave-${Date.now()}@prova.test`;
      const testPass = "Prova@104!";
      const testName = "Brave T104";

      console.log(`\n[API] Registrando ${testEmail}...`);
      try {
        const regRes = await fetch(`${API}/api/v1/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: testName, email: testEmail, password: testPass }),
        });
        console.log(`[API] Register: ${regRes.status} ${(await regRes.text()).substring(0, 200)}`);
      } catch (e: any) {
        console.log(`[API] Register error: ${e.message}`);
      }

      // PASSO 1: Login via UI
      console.log("\n--- LOGIN NO BRAVE ---");
      await page.goto(`${PROD}/pt-BR/login`, { waitUntil: "networkidle", timeout: 25000 });
      await page.waitForSelector("form", { timeout: 15000 });

      await page.locator('input[name="email"]').first().fill(testEmail);
      await page.locator('input[name="password"]').first().fill(testPass);
      await page.locator('button[type="submit"]').first().click({ force: true });

      try {
        await page.waitForURL("**/dashboard", { timeout: 20000 });
        console.log("[OK] Login → dashboard");
      } catch {
        console.log(`[FALLBACK] Sem redirect. Current: ${page.url()}`);
        await page.waitForTimeout(3000);
      }

      await page.screenshot({ path: "e2e/screenshots/t104-brave-apos-login.png", fullPage: false });

      // Extrai Set-Cookie do login
      const loginRes = logs.ress.find((r) => r.url.includes("/api/v1/auth/login"));
      console.log(`\n=== SET-COOKIE DO LOGIN ===`);
      if (loginRes) {
        const raw = loginRes.setCookie;
        const hasLax = /samesite\s*=\s*lax/i.test(raw);
        const hasNone = /samesite\s*=\s*none/i.test(raw);
        const hasSecure = /secure/i.test(raw);
        const hasHttpOnly = /httponly/i.test(raw);
        const hasPathSlash = /path\s*=\s*\//i.test(raw);
        console.log(`SameSite: ${hasLax ? "LAX" : hasNone ? "NONE" : "AUSENTE"}`);
        console.log(`Secure: ${hasSecure}, HttpOnly: ${hasHttpOnly}, Path=/: ${hasPathSlash}`);
      } else {
        console.log("Set-Cookie NAO ENCONTRADO na resposta de login!");
      }

      // PASSO 2: RELOAD (simula hard refresh do Operador)
      console.log("\n--- RELOAD NO BRAVE ---");
      const beforeReload = logs.reqs.length;
      await page.reload({ waitUntil: "networkidle", timeout: 25000 });
      await page.waitForTimeout(3000);

      const afterReloadUrl = page.url();
      const isLogado = !afterReloadUrl.includes("/login") && !afterReloadUrl.includes("/register");
      console.log(`URL após reload: ${afterReloadUrl}`);
      console.log(`Logado após reload: ${isLogado}`);

      // /me após reload
      const meReqs = logs.reqs
        .slice(beforeReload)
        .filter(
          (r) => r.url.includes("/api/v1/auth/me") && (r.type === "fetch" || r.type === "xhr"),
        );
      const meRes = logs.ress.filter((r) => r.url.includes("/api/v1/auth/me"));

      console.log("\n--- /me NO RELOAD ---");
      meReqs.forEach((r) =>
        console.log(
          `  REQ: ${r.method} ${r.host} cookie=${r.hasCookie ? "PRESENTE" : "AUSENTE"} type=${r.type}`,
        ),
      );
      meRes.slice(-3).forEach((r) => console.log(`  RES: ${r.status} ${r.host}`));

      await page.screenshot({
        path: "e2e/screenshots/t104-brave-apos-reload.png",
        fullPage: false,
      });

      // PASSO 3: CATALOG
      console.log("\n--- CATALOG NO BRAVE ---");
      await page.goto(`${PROD}/pt-BR/catalog`, { waitUntil: "networkidle", timeout: 25000 });
      await page.waitForTimeout(3000);

      const cards = await page.locator('a[href*="/media/"]').count();
      console.log(`Cards visiveis: ${cards}`);

      // Cache-Control from page HTML
      const pageRes = logs.ress.find(
        (r) => r.url.includes("/catalog") && !r.url.includes("_rsc") && r.status === 200,
      );
      if (pageRes) {
        const cacheControl = pageRes.headers["cache-control"] || "AUSENTE";
        console.log(`Cache-Control catalog: ${cacheControl}`);
      }

      await page.screenshot({ path: "e2e/screenshots/t104-brave-catalog.png", fullPage: false });

      // RESUMO
      const railwayReqs = logs.reqs.filter(
        (r) => r.host.includes("railway.app") && (r.type === "fetch" || r.type === "xhr"),
      );
      console.log(`\n========== RESUMO BRAVE ==========`);
      console.log(`Total requests: ${logs.reqs.length}`);
      console.log(`railway.app fetch/xhr no JS: ${railwayReqs.length}`);
      console.log(`Reload logado: ${isLogado}`);
      console.log(`Catalog cards: ${cards}`);

      if (!isLogado) {
        console.log("\n*** BRAVE DESLOGOU NO RELOAD (PASSO 5 FATOS) ***");
        if (loginRes) {
          console.log(
            `Set-Cookie: ${loginRes.setCookie.replace(/=[^;]+/, "=***").substring(0, 400)}`,
          );
        }
        meReqs.forEach((r) =>
          console.log(`/me REQ: ${r.method} cookie=${r.hasCookie ? "PRESENTE" : "AUSENTE"}`),
        );
        meRes.forEach((r) => console.log(`/me RES: ${r.status}`));
      }

      expect(railwayReqs.length, "ZERO railway.app no JS").toBe(0);
      expect(cards, "Catalog com cards").toBeGreaterThan(0);
    } finally {
      await browser.close();
    }
  });
});
