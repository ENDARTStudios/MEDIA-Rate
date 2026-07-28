# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: teste-fechado.spec.ts >> Teste Fechado — MEDIA Rate >> 01 — Register
- Location: e2e\teste-fechado.spec.ts:35:3

# Error details

```
Error: UNKNOWN: unknown error, open 'D:\PROJETOS\MEDIA Rate\MEDIA Rate\apps\web\apps\web\e2e\screenshots\01b-register-result.png'
```

# Test source

```ts
  1   | // T079 — Varredura completa: 11 fluxos do teste fechado
  2   | // node --experimental-vm-modules node_modules/.bin/playwright test e2e/teste-fechado.spec.ts
  3   | 
  4   | import { test, expect } from "@playwright/test";
  5   | import fs from "fs";
  6   | 
  7   | const BASE = "https://media-rate-web.vercel.app";
  8   | const SCREEN_DIR = "apps/web/e2e/screenshots";
  9   | fs.mkdirSync(SCREEN_DIR, { recursive: true });
  10  | 
  11  | function ss(page, name) {
  12  |   const path = `${SCREEN_DIR}/${name}.png`;
  13  |   return page.screenshot({ path, fullPage: false });
  14  | }
  15  | 
  16  | test.describe("Teste Fechado — MEDIA Rate", () => {
  17  |   const bugs = [];
  18  |   const consoleErrors = [];
  19  |   const networkErrors = [];
  20  |   const pageErrors = [];
  21  | 
  22  |   test.beforeEach(async ({ page }) => {
  23  |     page.on("console", (msg) => {
  24  |       if (msg.type() === "error") consoleErrors.push({ url: page.url(), text: msg.text().slice(0, 200) });
  25  |     });
  26  |     page.on("requestfailed", (req) => {
  27  |       networkErrors.push({ url: page.url(), failed: req.url(), reason: req.failure()?.errorText || "unknown" });
  28  |     });
  29  |     page.on("pageerror", (err) => {
  30  |       pageErrors.push({ url: page.url(), message: err.message.slice(0, 200) });
  31  |     });
  32  |   });
  33  | 
  34  |   // Fluxo 1: Register
  35  |   test("01 — Register", async ({ page }) => {
  36  |     const email = `e2e-${Date.now()}@test.com`;
  37  |     await page.goto(`${BASE}/pt-BR/register`, { waitUntil: "networkidle", timeout: 15000 });
  38  |     await ss(page, "01a-register-form");
  39  | 
  40  |     const name = page.locator('input[name="name"]').first();
  41  |     const emailF = page.locator('input[type="email"]').first();
  42  |     const pwds = page.locator('input[type="password"]');
  43  |     const chk = page.locator('input[type="checkbox"]').first();
  44  |     const submit = page.locator('button[type="submit"]').first();
  45  | 
  46  |     if (await name.count()) await name.fill("E2E Tester");
  47  |     if (await emailF.count()) await emailF.fill(email);
  48  |     const pwdCount = await pwds.count();
  49  |     if (pwdCount >= 1) await pwds.nth(0).fill("TesteForte123!");
  50  |     if (pwdCount >= 2) await pwds.nth(1).fill("TesteForte123!");
  51  |     if (await chk.count()) await chk.check().catch(() => {});
  52  |     if (await submit.count()) await submit.click();
  53  | 
  54  |     await page.waitForTimeout(5000);
  55  |     const url = page.url();
  56  |     console.log("  Register result:", url);
> 57  |     await ss(page, "01b-register-result");
      |     ^ Error: UNKNOWN: unknown error, open 'D:\PROJETOS\MEDIA Rate\MEDIA Rate\apps\web\apps\web\e2e\screenshots\01b-register-result.png'
  58  | 
  59  |     if (url.includes("/register")) {
  60  |       bugs.push({ id: "BUG-001", fluxo: 1, severity: "Alto", desc: "Register — não redirecionou após submit", evidence: `Console: ${consoleErrors.length}, Network: ${networkErrors.length}, Page: ${pageErrors.length}, URL: ${url}`, cause: "Form não submeteu ou backend não respondeu" });
  61  |     }
  62  |   });
  63  | 
  64  |   // Fluxo 2: Login
  65  |   test("02 — Login", async ({ page }) => {
  66  |     await page.goto(`${BASE}/pt-BR/login`, { waitUntil: "networkidle", timeout: 15000 });
  67  |     await ss(page, "02a-login-form");
  68  | 
  69  |     const emailF = page.locator('input[type="email"]').first();
  70  |     const pwdF = page.locator('input[type="password"]').first();
  71  |     const submit = page.locator('button[type="submit"]').first();
  72  | 
  73  |     if (await emailF.count()) await emailF.fill("teste@exemplo.com");
  74  |     if (await pwdF.count()) await pwdF.fill("qualquercoisa");
  75  |     if (await submit.count()) await submit.click();
  76  | 
  77  |     await page.waitForTimeout(4000);
  78  |     await ss(page, "02b-login-result");
  79  |   });
  80  | 
  81  |   // Fluxo 3: Catálogo
  82  |   test("03 — Catálogo", async ({ page }) => {
  83  |     await page.goto(`${BASE}/pt-BR/catalog`, { waitUntil: "networkidle", timeout: 15000 });
  84  |     await page.waitForTimeout(2000);
  85  | 
  86  |     const cards = await page.locator('a[href*="/media/"]').count();
  87  |     const images = await page.locator('img').count();
  88  |     console.log(`  Catalog: cards=${cards} images=${images}`);
  89  |     await ss(page, "03-catalog");
  90  | 
  91  |     if (cards === 0) {
  92  |       bugs.push({ id: "BUG-002", fluxo: 3, severity: "Crítico", desc: "Catálogo — 0 cards visíveis", evidence: `Cards: ${cards}, Console: ${consoleErrors.length}, Network: ${networkErrors.length}` });
  93  |     }
  94  |     if (images === 0) {
  95  |       bugs.push({ id: "BUG-003", fluxo: 3, severity: "Alto", desc: "Catálogo — 0 imagens carregadas", evidence: `Images: ${images}` });
  96  |     }
  97  |   });
  98  | 
  99  |   // Fluxo 4: Card → Detalhe
  100 |   test("04 — Detalhe de mídia", async ({ page }) => {
  101 |     await page.goto(`${BASE}/pt-BR/catalog`, { waitUntil: "networkidle", timeout: 15000 });
  102 |     await page.waitForTimeout(1000);
  103 | 
  104 |     const firstCard = page.locator('a[href*="/media/"]').first();
  105 |     if (await firstCard.count()) {
  106 |       await firstCard.click();
  107 |       await page.waitForTimeout(3000);
  108 |       await ss(page, "04a-detail");
  109 | 
  110 |       const h1Count = await page.locator("h1").count();
  111 |       const scoreDial = await page.locator("svg circle").count();
  112 |       console.log(`  Detail: H1=${h1Count} ScoreDial=${scoreDial} URL=${page.url()}`);
  113 | 
  114 |       if (h1Count === 0) {
  115 |         bugs.push({ id: "BUG-004", fluxo: 4, severity: "Alto", desc: "Detalhe — sem H1", evidence: `H1: ${h1Count}` });
  116 |       }
  117 |       if (page.url().includes("404") || page.url().includes("not-found")) {
  118 |         bugs.push({ id: "BUG-005", fluxo: 4, severity: "Crítico", desc: "Detalhe — 404 ao clicar card", evidence: `URL: ${page.url()}` });
  119 |       }
  120 |     } else {
  121 |       bugs.push({ id: "BUG-006", fluxo: 4, severity: "Crítico", desc: "Detalhe — 0 cards no catálogo para clicar", evidence: "No media card links found" });
  122 |     }
  123 |   });
  124 | 
  125 |   // Fluxo 5: Watchlist
  126 |   test("05 — Watchlist", async ({ page }) => {
  127 |     await page.goto(`${BASE}/pt-BR/catalog`, { waitUntil: "networkidle", timeout: 15000 });
  128 |     await page.waitForTimeout(1000);
  129 | 
  130 |     const wlBtn = page.locator('button[aria-label*="watchlist"], button[aria-label*="Watchlist"], button:has-text("Adicionar")').first();
  131 |     if (await wlBtn.count()) {
  132 |       await wlBtn.click();
  133 |       await page.waitForTimeout(2000);
  134 |       await ss(page, "05a-watchlist-add");
  135 |     }
  136 | 
  137 |     await page.goto(`${BASE}/pt-BR/watchlist`, { waitUntil: "networkidle", timeout: 15000 });
  138 |     await page.waitForTimeout(2000);
  139 |     await ss(page, "05b-watchlist-page");
  140 |     const wlCards = await page.locator('a[href*="/media/"]').count();
  141 |     console.log(`  Watchlist cards: ${wlCards}`);
  142 |   });
  143 | 
  144 |   // Fluxo 6: Home
  145 |   test("06 — Home", async ({ page }) => {
  146 |     await page.goto(`${BASE}`, { waitUntil: "networkidle", timeout: 15000 });
  147 |     await page.waitForTimeout(2000);
  148 | 
  149 |     const hero = await page.locator("#hero-title, h1").first().textContent();
  150 |     const rails = await page.locator("section").count();
  151 |     const cards = await page.locator('a[href*="/media/"]').count();
  152 |     console.log(`  Home: hero="${hero?.slice(0, 60)}" sections=${rails} cards=${cards}`);
  153 |     await ss(page, "06a-home-desktop");
  154 | 
  155 |     if (!hero) {
  156 |       bugs.push({ id: "BUG-007", fluxo: 6, severity: "Alto", desc: "Home — hero section vazio", evidence: `Hero text: ${hero}` });
  157 |     }
```