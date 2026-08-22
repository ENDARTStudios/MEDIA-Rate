/* eslint-disable */
// shot-menu.cjs (T401, D-370.7) — captura o menu '+' ABERTO (desktop+mobile)
// com sessão de teste autenticada (E2E_TEST_EMAIL/E2E_TEST_PASSWORD).
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "..", "..", "docs", "screenshots");
fs.mkdirSync(OUT, { recursive: true });
const BASE = "https://mediarate.app";
const EMAIL = process.env.E2E_TEST_EMAIL ?? "free@mediarate.test";
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "Senha@123";

async function abrirMenu(page) {
  await page.goto(`${BASE}/pt-BR/catalog?type=movie`, { waitUntil: "networkidle", timeout: 30000 });
  await page.getByTestId("status-quick").first().click({ timeout: 15000 });
  await page.waitForSelector('[data-testid="status-popover"]', { timeout: 5000 });
  await page.waitForTimeout(800);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  // Login com usuário de teste verificado.
  await page.goto(`${BASE}/pt-BR/login`, { waitUntil: "networkidle", timeout: 30000 });
  await page.locator('input[name="email"]').first().fill(EMAIL);
  await page.locator('input[name="password"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/(welcome|dashboard)$/, { timeout: 15000 });

  // Desktop.
  await abrirMenu(page);
  await page.screenshot({ path: path.join(OUT, "menu-plus-auth-desktop.png"), fullPage: false });

  // Mobile: fecha e reabre no viewport pequeno.
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await abrirMenu(page);
  await page.screenshot({ path: path.join(OUT, "menu-plus-auth-mobile.png"), fullPage: false });

  await browser.close();
  console.log("menu-plus-auth-desktop.png + menu-plus-auth-mobile.png capturados");
})().catch(async (e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
