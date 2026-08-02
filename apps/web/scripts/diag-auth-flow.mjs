import { chromium } from "@playwright/test";

const BASE = "https://media-rate-end-art-studios.vercel.app";
const b = await chromium.launch();
const ctx = await b.newContext();
const p = await ctx.newPage();
const net = [];
p.on("request", (r) => {
  const u = r.url();
  if (/railway\.app\/api\/v1\/(auth|me)/.test(u)) {
    net.push({ m: r.method(), u: u.replace(/.*\/api\/v1/, "/api/v1") });
  }
});
p.on("response", async (r) => {
  const u = r.url();
  if (/railway\.app\/api\/v1\/(auth|me)/.test(u)) {
    const sc = r.headers()["set-cookie"] || "";
    net.push({
      s: r.status(),
      u: u.replace(/.*\/api\/v1/, "/api/v1"),
      setCookie: sc ? sc.split(";")[0]?.split("=")[0] : "",
    });
  }
});
const cerr = [];
p.on("console", (m) => {
  if (m.type() === "error") cerr.push(m.text().slice(0, 200));
});
const perr = [];
p.on("pageerror", (e) => perr.push(e.message.slice(0, 200)));

const email = "e2e-" + Date.now() + "@test.com";

// REGISTER
await p.goto(BASE + "/pt-BR/register", { waitUntil: "domcontentloaded", timeout: 15_000 });
await p.waitForTimeout(2000);

// Fill form — using name attribute (no type="email" on inputs)
await p.locator('input[name="name"], input[name="nome"]').first().fill("E2E User");
await p.locator('input[name="email"]').first().fill(email);
const pwdInputs = p.locator('input[type="password"]');
const pwdCount = await pwdInputs.count();
await pwdInputs.first().fill("TesteForte123!");
if (pwdCount > 1) await pwdInputs.nth(1).fill("TesteForte123!");
const chk = p.locator('input[type="checkbox"]').first();
if ((await chk.count()) > 0) await chk.check().catch(() => {});

net.length = 0;
await p
  .locator('button:has-text("Cadastrar")')
  .first()
  .click()
  .catch(() => {
    return p.locator('button[type="submit"]').first().click();
  });
await p.waitForTimeout(5000);
console.log("REGISTER url=", p.url());
console.log("REGISTER net=", JSON.stringify(net, null, 1));
console.log("console errs=", cerr.slice(0, 5));
console.log("page errs=", perr.slice(0, 3));

const meCall = net.find((x) => x.u.includes("/me"));
console.log("ME_CALL=", JSON.stringify(meCall));

// LOGOUT
await p.waitForTimeout(1000);
net.length = 0;
const logoutBtn = p.locator('button:has-text("Sair")');
if ((await logoutBtn.count()) > 0) {
  await logoutBtn
    .first()
    .click()
    .catch(() => {});
  await p.waitForTimeout(3000);
}
console.log("LOGOUT url=", p.url());
console.log("LOGOUT net=", JSON.stringify(net, null, 1));

// Protected route
await p
  .goto(BASE + "/pt-BR/dashboard", { waitUntil: "domcontentloaded", timeout: 10_000 })
  .catch(() => {});
await p.waitForTimeout(2000);
console.log("DASHBOARD url=", p.url());

await b.close();
