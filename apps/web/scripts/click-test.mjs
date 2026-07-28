import { chromium } from "playwright";

const b = await chromium.launch();
const p = await b.newPage();
const perr = [];
p.on("pageerror", (e) => perr.push(e));
const failedReq = [];
p.on("response", (r) => { if (r.status() >= 400) failedReq.push(r.status() + " " + r.url()); });

const BASE = "https://media-rate-web.vercel.app";
await p.goto(BASE + "/pt-BR", { waitUntil: "networkidle", timeout: 15000 });
console.log("1. Home:", p.url());

// Click Planos
await p.click('a:has-text("Planos")');
await p.waitForTimeout(3000);
const pUrl = p.url();
const pH1 = await p.locator("h1").first().textContent();
const pErr = await p.locator('text="This page couldn"').count();
console.log("2. Planos:", pUrl, "| H1:", pH1?.slice(0, 60), "| couldntLoad:", pErr);

// Click Catálogo
await p.click('a:has-text("Catálogo")');
await p.waitForTimeout(3000);
const cUrl = p.url();
const cH1 = await p.locator("h1").first().textContent();
const cErr = await p.locator('text="This page couldn"').count();
console.log("3. Catálogo:", cUrl, "| H1:", cH1?.slice(0, 60), "| couldntLoad:", cErr);

// Click logo
await p.click('a[aria-label*="MEDIA"]');
await p.waitForTimeout(2000);
console.log("4. Home:", p.url());

console.log("Page errors:", perr.length, perr.map((e) => e.message?.slice(0, 80)));
console.log("Failed reqs:", failedReq.slice(0, 5));
const pass = pUrl.includes("pricing") && cUrl.includes("catalog") && pErr === 0 && cErr === 0;
console.log("RESULT:", pass ? "PASS" : "FAIL");
await b.close();
process.exit(pass ? 0 : 1);
