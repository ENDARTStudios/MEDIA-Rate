// PASSO 3 — T058: diag-catalog-public.mjs
// Valida que catálogo/descoberta DESLOGADO é estável (cards > 0 em 9s, sem 401, sem pageerror).
// Uso: node apps/web/scripts/diag-catalog-public.mjs [BASE_URL]
// Default: https://media-rate-end-art-studios.vercel.app

import { chromium } from "playwright";
import { readFileSync } from "fs";

const BASE = process.argv[2] || "https://media-rate-end-art-studios.vercel.app";
const NOW = new Date().toISOString();

const b = await chromium.launch();
const ctx = await b.newContext();
const p = await ctx.newPage();

const authReq = [];
const errs = [];
const perr = [];

p.on("request", (r) => {
  if (/\/api\/v1\//.test(r.url()))
    authReq.push(r.method() + " " + r.url().replace(/.*\/api\/v1/, "/api/v1"));
});
p.on("response", (r) => {
  if (/\/api\/v1\//.test(r.url()) && r.status() === 401)
    errs.push("401 " + r.url().replace(/.*\/api\/v1/, "/api/v1"));
});
p.on("console", (m) => {
  if (m.type() === "error") errs.push("console " + m.text().slice(0, 120));
});
p.on("pageerror", (e) => perr.push(e.message.slice(0, 120)));

const cards = async () =>
  p.evaluate(() =>
    document.querySelectorAll(
      'a[href*="/midia/"],a[href*="/media/"],[data-media-card],article'
    ).length
  );
const txt = async () =>
  p.evaluate(() => (document.querySelector("main")?.innerText || "").trim().length);

const results = {};
for (const route of ["/pt-BR/catalog", "/pt-BR"]) {
  console.log(`--- ${route} ---`);
  await p.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 30000 });
  let prev = 0;
  const polls = [];
  for (const t of [1000, 3000, 6000, 9000]) {
    await p.waitForTimeout(t - prev);
    prev = t;
    const c = await cards();
    const tl = await txt();
    polls.push({ t, cards: c, mainLen: tl });
    console.log(`${route} @${t}ms cards=${c} mainLen=${tl}`);
  }
  const authReqSet = [...new Set(authReq)];
  const errSet = [...new Set(errs)].slice(0, 6);
  console.log(`${route} AUTH_REQ_ON_FIRST_PAINT=`, authReqSet);
  console.log(`${route} 401/ERR=`, errSet, " PAGEERR=", perr.slice(0, 4));
  results[route] = { polls, authReq: authReqSet, errs: errSet, pageerrs: [...perr] };
  authReq.length = 0;
  errs.length = 0;
  perr.length = 0;
}

await b.close();

// Binary criteria check
console.log("\n=== CRITERIO BINARIO ===");
let pass = true;
for (const route of ["/pt-BR/catalog", "/pt-BR"]) {
  const r = results[route];
  const last = r.polls[r.polls.length - 1];
  const prevLast = r.polls[r.polls.length - 2];

  if (route === "/pt-BR/catalog") {
    if (last.cards > 0 && prevLast.cards > 0) {
      console.log(`[PASS] ${route}: cards=${last.cards} estavel em 6s/9s`);
    } else {
      console.log(`[FAIL] ${route}: cards caiu para ${last.cards} — SOME detectado`);
      pass = false;
    }
  } else {
    if (last.mainLen > 0 && prevLast.mainLen > 0) {
      console.log(`[PASS] ${route}: mainLen=${last.mainLen} estavel`);
    } else {
      console.log(`[FAIL] ${route}: mainLen=${last.mainLen} — conteudo evaporou`);
      pass = false;
    }
  }

  if (r.errs.length > 0 && r.errs.some((e) => e.includes("401"))) {
    console.log(`[FAIL] ${route}: 401 detectado em rota de API — fetch autenticado na descoberta publica`);
    pass = false;
  }
  if (r.pageerrs.length > 0) {
    console.log(`[FAIL] ${route}: pageerror=${r.pageerrs.length} — ${r.pageerrs[0]}`);
    pass = false;
  }
}

console.log(`\nRESULTADO FINAL: ${pass ? "PASS" : "FAIL"}`);
if (!pass) process.exit(1);
