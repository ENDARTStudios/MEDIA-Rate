import { chromium } from "@playwright/test";

const BASE = "https://media-rate-end-art-studios.vercel.app";
const b = await chromium.launch();
const ctx = await b.newContext();
const p = await ctx.newPage();
const net = [];
p.on("response", async (r) => {
  const u = r.url();
  if (/railway\.app\/api\/v1\/auth\/(login|logout|me)/.test(u)) {
    const sc = r.headers()["set-cookie"] || "";
    net.push({ s: r.status(), u: u.replace(/.*\/api\/v1/, "/api/v1"), setCookie: sc ? sc.split(",").map((c) => c.split(";")[0]?.split("=")[0]).join(",") : "" });
  }
});
p.on("request", (r) => {
  const u = r.url();
  if (/railway\.app\/api\/v1\/auth\/logout/.test(u)) {
    const h = r.headers();
    console.log("LOGOUT_REQ_HEADERS: x-csrf-token=", h["x-csrf-token"] ? "present" : "MISSING");
  }
});
const cerr = []; p.on("console", (m) => { if (m.type() === "error") cerr.push(m.text().slice(0, 160)); });
const perr = []; p.on("pageerror", (e) => perr.push((e.message || "").slice(0, 160)));

const email = "logout-" + Date.now() + "@test.com";

// REGISTER + login auto
await p.goto(BASE + "/pt-BR/register", { waitUntil: "domcontentloaded", timeout: 15_000 });
await p.waitForTimeout(2000);
await p.locator('input[name="name"], input[name="nome"]').first().fill("Logout Test");
await p.locator('input[name="email"]').first().fill(email);
const pwdInputs = p.locator('input[type="password"]');
const pwdCount = await pwdInputs.count();
await pwdInputs.first().fill("TesteForte123!");
if (pwdCount > 1) await pwdInputs.nth(1).fill("TesteForte123!");
const chk = p.locator('input[type="checkbox"]').first();
if ((await chk.count()) > 0) await chk.check().catch(() => {});
await p.locator('button:has-text("Cadastrar")').first().click().catch(() => {
  return p.locator('button[type="submit"]').first().click();
});
await p.waitForTimeout(4000);
console.log("AFTER_REGISTER url=", p.url());

// Confirm logged in: /me 200
net.length = 0;
await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForTimeout(2000);
const meLogged = net.find((x) => x.u.includes("/me"));
console.log("ME_WHEN_LOGGED=", JSON.stringify(meLogged));

const cookies = await ctx.cookies();
console.log("COOKIES_BEFORE_LOGOUT=", cookies.map((c) => `${c.name}=${c.value.slice(0, 8)}... domain=${c.domain} path=${c.path}`));
// LOGOUT: Click user avatar button, hover to keep menu open, click Sair
net.length = 0;
let clicked = null;
try {
  // Click user avatar to open dropdown
  const userBtn = p.locator('nav button:has(span.w-7)').first();
  await userBtn.click({ timeout: 3000 });
  await p.waitForTimeout(300);
  // Move mouse into the dropdown area and click Sair
  const sairBtn = p.locator('button:has-text("Sair")').first();
  if ((await sairBtn.count()) > 0) {
    await sairBtn.hover({ timeout: 2000 }); // prevents onMouseLeave
    await sairBtn.click({ timeout: 2000 });
    clicked = "Sair";
  }
} catch {}
if (!clicked) {
  try {
    // Mobile fallback
    const menuBtn = p.locator('[aria-label="Abrir menu"]').first();
    if ((await menuBtn.count()) > 0) {
      await menuBtn.click();
      await p.waitForTimeout(300);
      await p.locator('text=Sair').first().click({ timeout: 3000 });
      clicked = "Sair (mobile)";
    }
  } catch {}
}

console.log("LOGOUT_CLICKED=", clicked);
await p.waitForTimeout(3500);
const logoutCall = net.find((x) => x.u.includes("/logout"));
console.log("LOGOUT_CALL=", JSON.stringify(logoutCall));
console.log("AFTER_LOGOUT url=", p.url());

// Verify /me returns 401 after logout
net.length = 0;
await p.goto(BASE + "/pt-BR/dashboard", { waitUntil: "domcontentloaded", timeout: 10_000 }).catch(() => {});
await p.waitForTimeout(2500);
const meAfter = net.find((x) => x.u.includes("/me"));
console.log("ME_AFTER_LOGOUT=", JSON.stringify(meAfter));
console.log("PROTECTED_AFTER_LOGOUT url=", p.url());
console.log("CONSOLE_ERRS=", cerr.slice(0, 5), "PAGE_ERRS=", perr.slice(0, 5));

await b.close();
