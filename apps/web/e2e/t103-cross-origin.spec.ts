import { test, expect } from "@playwright/test";

const PROD = "https://media-rate-web.vercel.app";
const API = "https://media-rate-production.up.railway.app";

interface ReqLog {
  url: string;
  host: string;
  hasCookie: boolean;
  type: string;
  method: string;
}

interface ResLog {
  url: string;
  status: number;
  host: string;
  headers: Record<string, string>;
}

test.describe("T103 - fetch auth cross-origin intercept", () => {
  test("prova cross-origin + reload + catalog logado", async ({ page, request }) => {
    const logs: { reqs: ReqLog[]; ress: ResLog[] } = { reqs: [], ress: [] };

    page.on("request", (req) => {
      const url = req.url();
      let host = "";
      try { host = new URL(url).host; } catch { host = "invalid"; }
      const cookie = req.headers()["cookie"];
      logs.reqs.push({ url, host, hasCookie: !!cookie, type: req.resourceType(), method: req.method() });
      if (req.resourceType() === "fetch" || req.resourceType() === "xhr") {
        console.log(`[REQ] ${req.method()} ${host} cookie=${!!cookie ? "SIM" : "NAO"} ${url.substring(0, 150)}`);
      }
    });

    page.on("response", (res) => {
      let host2 = "";
      try { host2 = new URL(res.url()).host; } catch { host2 = "invalid"; }
      const h: Record<string, string> = {};
      // Log only headers for auth-related responses
      logs.ress.push({ url: res.url(), status: res.status(), host: host2, headers: h });
      if (res.url().includes("/api/") || res.url().includes("/auth/")) {
        console.log(`[RES] ${res.status()} ${host2} ${res.url().substring(0, 150)}`);
      }
    });

    // --- PASSO 0: registra usuario via API (permitido pela tarefa) ---
    const testEmail = `t103-${Date.now()}@prova.test`;
    const testPass = "Prova@103!";
    const testName = "Prova T103";

    console.log(`\n[API] Registrando ${testEmail}...`);
    try {
      const regRes = await fetch(`${API}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: testName, email: testEmail, password: testPass }),
      });
      const regBody = await regRes.text();
      console.log(`[API] Register response: ${regRes.status} ${regBody.substring(0, 200)}`);
    } catch (e: any) {
      console.log(`[API] Register error: ${e.message}`);
    }

    // --- PASSO 1: vai para pagina de login ---
    console.log("\n--- LOGIN FLOW ---");
    await page.goto(`${PROD}/pt-BR/login`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForSelector("form", { timeout: 15000 });
    console.log(`Current URL: ${page.url()}`);

    // Debug: ve o que tem no form
    const formHtml = await page.locator("form").first().innerHTML();
    console.log(`Form innerHTML length: ${formHtml.length}`);

    // Preenche o formulario com selectores mais especificos
    const emailInput = page.locator('input[name="email"]').first();
    const passInput = page.locator('input[name="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.waitFor({ state: "visible", timeout: 10000 });
    await emailInput.fill(testEmail);
    await passInput.fill(testPass);
    console.log("Form preenchido, clicando submit...");

    await submitBtn.click({ force: true });

    // Aguarda navegacao
    try {
      await page.waitForURL("**/dashboard", { timeout: 20000 });
      console.log("[OK] Login → dashboard");
    } catch {
      console.log(`[FALLBACK] Sem redirect. Current URL: ${page.url()}`);
      // Check for error toasts
      const toastMsg = await page.locator('[data-sonner-toast], [role="alert"], .toast').allTextContents();
      console.log(`Toast/alert messages: ${toastMsg.join(" | ")}`);
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: "e2e/screenshots/t103-apos-login.png", fullPage: false });

    // --- ANALISE: cross-origin? ---
    const jsReqs = logs.reqs.filter((r) => r.type === "fetch" || r.type === "xhr");
    const railwayReqs = jsReqs.filter((r) => r.host.includes("railway.app"));
    const apiReqs = jsReqs.filter((r) => r.url.includes("/api/"));

    console.log(`\n=== INTERCEPT RESUMO (${jsReqs.length} fetch/xhr) ===`);
    console.log(`railway.app: ${railwayReqs.length} | api calls (any host): ${apiReqs.length}`);

    if (railwayReqs.length > 0) {
      console.log("\n*** SMOKING GUN: railway.app no JS ***");
      railwayReqs.forEach((r) => console.log(`  ${r.method} ${r.url} cookie=${r.hasCookie ? "SIM" : "NAO"}`));
    } else {
      console.log("--- SEM railway.app no JS (T098 ok) ---");
    }

    // Lista todas as chamadas de API
    console.log("\nTodas chamadas fetch/xhr para /api/:");
    apiReqs.forEach((r) => console.log(`  ${r.method} ${r.host} cookie=${r.hasCookie ? "SIM" : "NAO"} ${r.url.substring(0, 150)}`));

    // --- RELOAD ---
    console.log("\n=== RELOAD ===");
    const beforeReloadCount = logs.reqs.length;
    await page.reload({ waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "e2e/screenshots/t103-apos-reload.png", fullPage: false });

    const afterReloadUrl = page.url();
    const isLogado = !afterReloadUrl.includes("/login") && !afterReloadUrl.includes("/register");

    // /me after reload (exact match for API /me)
    const meReqsAfterReload = logs.reqs
      .slice(beforeReloadCount)
      .filter((r) => {
        const u = r.url;
        return (u.includes("/api/v1/auth/me") || u.endsWith("/v1/auth/me") || u.includes("/auth/me")) && (r.type === "fetch" || r.type === "xhr");
      });
    const meResAfterReload = logs.ress
      .filter((r) => {
        const u = r.url;
        return (u.includes("/api/v1/auth/me") || u.endsWith("/v1/auth/me") || u.includes("/auth/me"));
      });

    console.log(`URL após reload: ${afterReloadUrl}`);
    console.log(`Logado após reload: ${isLogado}`);
    console.log(`Requisições /me (fetch/xhr) após reload:`);
    meReqsAfterReload.forEach((r) => console.log(`  ${r.method} ${r.host} cookie=${r.hasCookie ? "SIM" : "NAO"} type=${r.type}`));
    meResAfterReload.forEach((r) => console.log(`  RESPONSE: ${r.status} ${r.host}`));

    // --- CATALOG ---
    console.log("\n=== CATALOG LOGADO ===");
    const beforeCatalogCount = logs.reqs.length;
    await page.goto(`${PROD}/pt-BR/catalog`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(3000);

    const cards = await page.locator('a[href*="/media/"]').count();
    console.log(`Cards visiveis: ${cards}`);

    // Check for any error banner
    const errorBanner = await page.locator('[role="alert"]').count();
    console.log(`Error banners na pagina: ${errorBanner}`);

    await page.screenshot({ path: "e2e/screenshots/t103-catalog-logado.png", fullPage: false });

    // --- RESUMO FINAL ---
    const totalRailway = logs.reqs.filter((r) => r.host.includes("railway.app"));
    const totalRailwayJS = logs.reqs.filter((r) => r.host.includes("railway.app") && (r.type === "fetch" || r.type === "xhr"));

    console.log(`\n========== RESUMO FINAL ==========`);
    console.log(`Total requests: ${logs.reqs.length}`);
    console.log(`railway.app (todas): ${totalRailway.length}`);
    console.log(`railway.app fetch/xhr no JS: ${totalRailwayJS.length}`);
    console.log(`Reload logado: ${isLogado}`);
    console.log(`Catalog cards: ${cards}`);
    console.log(`Cookies sent in any request: ${logs.reqs.some((r) => r.hasCookie)}`);

    // GATE BINARIO
    expect(totalRailwayJS.length, "ZERO requests para railway.app vindos de fetch/xhr no JS").toBe(0);
    expect(cards, "Catalog com cards visiveis").toBeGreaterThan(0);
  });
});
