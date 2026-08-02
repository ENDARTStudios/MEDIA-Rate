// PASSO 8 — T059: diag-design-system.mjs
// Valida que a página de demonstração do design system carrega corretamente.
// Uso: node apps/web/scripts/diag-design-system.mjs [BASE_URL]
// Default: https://media-rate-web.vercel.app

import { chromium } from "playwright";

const BASE = process.argv[2] || "https://media-rate-web.vercel.app";

const b = await chromium.launch();
const ctx = await b.newContext();
const p = await ctx.newPage();
const perr = [];
p.on("pageerror", (e) => perr.push(e.message.slice(0, 120)));

await p.goto(BASE + "/pt-BR/design-system", { waitUntil: "networkidle", timeout: 30000 });
await p.waitForTimeout(2000);

const scoreDials = await p.locator('[data-testid="score-dial"], svg circle').count();
const mediaCards = await p.locator('a[href*="/media/"]').count();
const buttons = await p.locator("button").count();
const bgColor = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);

console.log("scoreDials=", scoreDials, "mediaCards=", mediaCards, "buttons=", buttons);
console.log("pageerr=", perr.slice(0, 5));
console.log("bgColor=", bgColor);

// Validate
let pass = true;
if (scoreDials === 0) {
  console.log("[FAIL] 0 score dials rendered");
  pass = false;
}
if (mediaCards === 0) {
  console.log("[FAIL] 0 media cards rendered");
  pass = false;
}
if (buttons === 0) {
  console.log("[FAIL] 0 buttons rendered");
  pass = false;
}
if (perr.length > 0) {
  console.log("[FAIL] pageerrors detected:", perr);
  pass = false;
}

const isBgDark = bgColor.includes("9, 9, 15") || bgColor === "rgb(9,9,15)";
if (!isBgDark) {
  console.log("[WARN] bgColor is not #09090F:", bgColor);
} else {
  console.log("[PASS] bgColor #09090F confirmed");
}

console.log("\nRESULTADO FINAL:", pass ? "PASS" : "FAIL");
await b.close();
if (!pass) process.exit(1);
