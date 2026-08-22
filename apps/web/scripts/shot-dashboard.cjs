/* eslint-disable */
// shot-dashboard.cjs (T402, D-378) — screenshots do dashboard por plano
// (Free/Plus/Premium) pós-deploy, com sessão de teste autenticada.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "..", "..", "docs", "screenshots");
fs.mkdirSync(OUT, { recursive: true });
const BASE = "https://mediarate.app";
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "Senha@123";

const ALVOS = [
  { plano: "free", email: "free@mediarate.test", nome: "dashboard-free" },
  { plano: "plus", email: "plus@mediarate.test", nome: "dashboard-plus" },
  { plano: "premium", email: "premium@mediarate.test", nome: "dashboard-premium" },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const a of ALVOS) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}/pt-BR/login`, { waitUntil: "networkidle", timeout: 30000 });
      await page.locator('input[name="email"]').first().fill(a.email);
      await page.locator('input[name="password"]').first().fill(PASSWORD);
      await page.locator('button[type="submit"]').first().click();
      await page.waitForURL(/\/(welcome|dashboard)$/, { timeout: 15000 });
      await page.goto(`${BASE}/pt-BR/dashboard`, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT, `${a.nome}.png`), fullPage: false });
      console.log(`OK ${a.nome}`);
    } catch (e) {
      console.log(`FAIL ${a.nome}: ${e.message}`);
    } finally {
      await ctx.close();
    }
  }
  await browser.close();
  console.log("dashboards capturados");
})().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
