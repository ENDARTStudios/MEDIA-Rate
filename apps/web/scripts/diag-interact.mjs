import { chromium } from "@playwright/test";

const BASE = "https://media-rate-end-art-studios.vercel.app";
const b = await chromium.launch();

// === PASSO 1: Interactive register trace ===
{
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  const net = [];
  p.on("request", (r) => {
    const u = r.url();
    if (/api\/v1|auth|railway\.app|vercel\.app\/api|localhost/i.test(u))
      net.push({ phase: "req", m: r.method(), u });
  });
  p.on("response", async (r) => {
    const u = r.url();
    if (/api\/v1|auth|railway\.app|vercel\.app\/api|localhost/i.test(u)) {
      let body = "";
      try { body = (await r.text()).slice(0, 200); } catch {}
      net.push({ phase: "res", s: r.status(), u, body });
    }
  });
  p.on("requestfailed", (r) => {
    const u = r.url();
    if (/api\/v1|auth|railway\.app|vercel\.app\/api|localhost/i.test(u))
      net.push({ phase: "FAIL", u, err: r.failure()?.errorText });
  });
  const cerr = []; const perr = [];
  p.on("console", (m) => { if (m.type() === "error") cerr.push(m.text().slice(0, 200)); });
  p.on("pageerror", (e) => perr.push((e.message || "").slice(0, 200)));

  await p.goto(BASE + "/pt-BR/register", { waitUntil: "networkidle", timeout: 30_000 });
  await p.waitForTimeout(1500);

  // Fill form
  const email = p.locator('input[type="email"], input[name="email"]').first();
  const pwd = p.locator('input[type="password"]').first();
  const pwd2 = p.locator('input[type="password"]').nth(1);
  const nome = p.locator('input[name="nome"], input[name="name"]').first();
  if ((await nome.count()) > 0) await nome.fill("Smoke Operador").catch(() => {});
  await email.fill("smoke-op-" + Date.now() + "@test.com");
  await pwd.fill("TesteForte123!");
  if ((await pwd2.count()) > 0) await pwd2.fill("TesteForte123!");
  const chk = p.locator('input[type="checkbox"]').first();
  if ((await chk.count()) > 0) await chk.check().catch(() => {});

  net.length = 0; cerr.length = 0; perr.length = 0;

  const beforeUrl = p.url();
  const btn = p.getByRole("button", { name: /cadastrar|criar|registrar|sign ?up/i }).first();
  await btn.click().catch(async () => {
    await p.locator('form button[type="submit"], form button').last().click().catch(() => {});
  });
  await p.waitForTimeout(4000);
  const afterUrl = p.url();
  const afterText = (await p.locator("body").innerText({ timeout: 2000 })).slice(0, 400);

  console.log("=== CADASTRO INTERATIVO ===");
  console.log("beforeUrl=", beforeUrl, " afterUrl=", afterUrl);
  console.log("NET_AFTER_CLICK=", JSON.stringify(net, null, 1));
  console.log("CONSOLE_ERR=", cerr.slice(0, 8));
  console.log("PAGE_ERR=", perr.slice(0, 5));
  console.log("BODY_AFTER=", afterText.replace(/\n+/g, " | ").slice(0, 300));
  await ctx.close();
}

// === PASSO 2: Catalog polls ===
{
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  const cnet = [];
  p.on("response", async (r) => {
    const u = r.url();
    if (/api\/v1|midia|discover|search|railway\.app/i.test(u)) {
      let body = "";
      try { body = (await r.text()).slice(0, 150); } catch {}
      cnet.push({ s: r.status(), u, body });
    }
  });
  p.on("requestfailed", (r) => {
    const u = r.url();
    if (/api\/v1|midia|discover|search|railway\.app/i.test(u))
      cnet.push({ s: "FAIL", u, err: r.failure()?.errorText });
  });

  await p.goto(BASE + "/pt-BR/catalog", { waitUntil: "domcontentloaded", timeout: 30_000 });
  const cards = async () => p.evaluate(() => document.querySelectorAll('a[href*="/midia/"], a[href*="/media/"], [data-media-card], article').length);
  const txt = async () => p.evaluate(() => (document.querySelector("main")?.innerText || "").trim().length);

  let prev = 0;
  for (const t of [1000, 3000, 6000, 9000]) {
    await p.waitForTimeout(t - prev);
    prev = t;
    console.log(`catalog @${t}ms cards=${await cards()} mainLen=${await txt()}`);
  }
  console.log("CATALOG_NET=", JSON.stringify(cnet, null, 1));
  await ctx.close();
}

// === PASSO 3: Bundle API URL ===
{
  const html = await (await fetch(BASE + "/pt-BR")).text();
  const srcs = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);
  const found = [];
  for (const s of srcs.slice(0, 6)) {
    const url = s.startsWith("http") ? s : BASE + s;
    const js = await fetch(url).then((r) => r.text()).catch(() => "");
    const m = js.match(/https?:\/\/[a-z0-9.-]*(railway\.app|vercel\.app|localhost)[^"'\s`]*/gi) || [];
    const apiHits = js.match(/["'`](https?:\/\/[^"'`]*\/api\/v1|\/api\/v1)["'`]/gi) || [];
    if (m.length || apiHits.length)
      found.push({ chunk: s.split("/").pop(), hosts: [...new Set(m)].slice(0, 5), apiBase: [...new Set(apiHits)].slice(0, 5) });
  }
  console.log("BUNDLE_API_HITS=", JSON.stringify(found, null, 1));
}

await b.close();
