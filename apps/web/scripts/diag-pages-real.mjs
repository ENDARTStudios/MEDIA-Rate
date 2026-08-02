// PASSO 5 — T066: diag-pages-real.mjs
// Valida páginas reais (/, /catalog, /register) DESLOGADO e LOGADO.
// Uso: node apps/web/scripts/diag-pages-real.mjs [BASE_URL]

import { chromium } from "playwright";

const BASE = process.argv[2] || "https://media-rate-web.vercel.app";
let pass = true;

const b = await chromium.launch();

console.log("=== DESLOGADO ===");
const ctx1 = await b.newContext();
const p1 = await ctx1.newPage();
const cards1 = async () =>
  p1.evaluate(
    () =>
      document.querySelectorAll('a[href*="/midia/"],a[href*="/media/"],[data-media-card],article')
        .length,
  );

await p1.goto(BASE + "/pt-BR/catalog", { waitUntil: "domcontentloaded", timeout: 30000 });
let prev = 0;
for (const t of [1000, 3000, 6000, 9000]) {
  await p1.waitForTimeout(t - prev);
  prev = t;
  const c = await cards1();
  console.log(`DESLOGADO /catalog @${t}ms cards=${c}`);
  if (c === 0) {
    console.log("[FAIL] DESLOGADO cards=0");
    pass = false;
  }
}
// Check landing page
await p1.goto(BASE + "/pt-BR", { waitUntil: "domcontentloaded", timeout: 30000 });
const landingLen = await p1.evaluate(
  () => (document.querySelector("main")?.innerText || "").trim().length,
);
console.log("DESLOGADO / landing mainLen=", landingLen);
if (landingLen === 0) {
  console.log("[FAIL] DESLOGADO landing empty");
  pass = false;
}
await ctx1.close();

console.log("\n=== LOGADO ===");
const ctx2 = await b.newContext();
const p2 = await ctx2.newPage();
const email = "t066-" + Date.now() + "@test.com";

await p2.goto(BASE + "/pt-BR/register", { waitUntil: "networkidle", timeout: 30000 });
await p2.waitForTimeout(1000);

// Try various form field selectors
const nameSel =
  'input[name="name"],input[name="nome"],input[placeholder*="Nome"],input[placeholder*="nome"]';
const emailSel = 'input[type="email"]';
const pwdSel = 'input[type="password"]';

const nameField = p2.locator(nameSel).first();
const emailField = p2.locator(emailSel).first();
const pwdFields = p2.locator(pwdSel);

if ((await nameField.count()) > 0) await nameField.fill("T066 Test");
if ((await emailField.count()) > 0) await emailField.fill(email);
if ((await pwdFields.count()) >= 2) {
  await pwdFields.nth(0).fill("TesteForte123!");
  await pwdFields.nth(1).fill("TesteForte123!");
} else if ((await pwdFields.count()) === 1) {
  await pwdFields.fill("TesteForte123!");
}

const chk = p2.locator('input[type="checkbox"]').first();
if ((await chk.count()) > 0) await chk.check().catch(() => {});

const submitBtn = p2
  .locator(
    'button[type="submit"],button:has-text("Cadastrar"),button:has-text("Register"),button:has-text("Sign up"),button:has-text("Registrarse")',
  )
  .first();
if ((await submitBtn.count()) > 0) await submitBtn.click();
await p2.waitForTimeout(4000);
console.log("LOGADO after register url=", p2.url());

// Try /catalog logged in
const cards2 = async () =>
  p2.evaluate(
    () =>
      document.querySelectorAll('a[href*="/midia/"],a[href*="/media/"],[data-media-card],article')
        .length,
  );

await p2.goto(BASE + "/pt-BR/catalog", { waitUntil: "domcontentloaded", timeout: 30000 });
prev = 0;
for (const t of [1000, 3000, 6000, 9000]) {
  await p2.waitForTimeout(t - prev);
  prev = t;
  const c = await cards2();
  console.log(`LOGADO /catalog @${t}ms cards=${c}`);
  if (c === 0) {
    console.log("[FAIL] LOGADO cards=0");
    pass = false;
  }
}

// Check session persistence
await p2.reload({ waitUntil: "networkidle" });
await p2.waitForTimeout(2000);
const urlAfter = p2.url();
console.log("LOGADO after reload url=", urlAfter);
if (urlAfter.includes("/login")) {
  console.log("[FAIL] LOGADO session lost after reload");
  pass = false;
}

const perr = [];
p2.on("pageerror", (e) => perr.push(e.message.slice(0, 120)));
await p2.waitForTimeout(500);
if (perr.length > 0) {
  console.log("[FAIL] pageerrors:", perr);
  pass = false;
}

await ctx2.close();
await b.close();

console.log("\n=== RESULTADO FINAL ===");
console.log(pass ? "PASS" : "FAIL");
if (!pass) process.exit(1);
