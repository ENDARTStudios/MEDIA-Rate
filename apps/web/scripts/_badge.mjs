import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("https://media-rate-hog9qjsh2-end-art-studios.vercel.app/pt-BR", {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.waitForTimeout(1500);
const r = await page.evaluate(() => {
  const badge = document.querySelector('[data-testid="preview-badge"]');
  if (!badge) return { badge: "none" };
  const b = badge.getBoundingClientRect();
  const card = badge.closest("[class*=relative]");
  return {
    badgeText: badge.textContent.trim(),
    badgeW: Math.round(b.width),
    badgeRight: Math.round(b.right),
    vw: window.innerWidth,
    nowrap: getComputedStyle(badge).whiteSpace,
  };
});
console.log(JSON.stringify(r));
await browser.close();
