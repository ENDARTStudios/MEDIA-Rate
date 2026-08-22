const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "..", "..", "docs", "screenshots");
fs.mkdirSync(OUT, { recursive: true });

const BASE = "https://mediarate.app";

const alvos = [
  { nome: "landing-pt-desktop", url: `${BASE}/pt-BR`, vp: { w: 1280, h: 800 } },
  { nome: "landing-pt-mobile", url: `${BASE}/pt-BR`, vp: { w: 390, h: 844 } },
  { nome: "catalog-comic-desktop", url: `${BASE}/pt-BR/catalog?type=comic`, vp: { w: 1280, h: 800 } },
  { nome: "detail-comic-desktop", url: `${BASE}/pt-BR/media/watchmen`, vp: { w: 1280, h: 800 } },
  { nome: "detail-manga-mobile", url: `${BASE}/pt-BR/media/berserk`, vp: { w: 390, h: 844 } },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const a of alvos) {
    const page = await browser.newPage({ viewport: { width: a.vp.w, height: a.vp.h } });
    try {
      await page.goto(a.url, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT, `${a.nome}.png`), fullPage: false });
      console.log(`OK ${a.nome} -> ${a.url}`);
    } catch (e) {
      console.log(`FAIL ${a.nome}: ${e.message}`);
    } finally {
      await page.close();
    }
  }
  await browser.close();
  console.log(`screenshots em ${OUT}`);
})();
