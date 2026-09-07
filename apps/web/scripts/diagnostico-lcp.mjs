// Diagnóstico F16 (Issue #17) — LCP da home vs. carregamento de fonte.
// Uso: node scripts/diagnostico-lcp.mjs [URL]
/* global PerformanceObserver: readonly, performance: readonly */
import { chromium } from "@playwright/test";

const URL = process.argv[2] ?? "https://mediarate.app/pt-BR";

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 412, height: 823 },
  deviceScaleFactor: 2.625,
});

await page.addInitScript(() => {
  window.__diag = { lcp: [], fonts: [], fcp: null, fontReadyAt: null, h1Sizes: [] };
  // LCP + FCP
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (e.entryType === "largest-contentful-paint") {
        window.__diag.lcp.push({
          at: Math.round(e.startTime),
          size: Math.round(e.size),
          tag: e.element?.tagName,
          cls: (e.element?.className || "").slice(0, 60),
        });
      } else if (e.entryType === "first-contentful-paint") {
        window.__diag.fcp = Math.round(e.startTime);
      }
    }
  }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) window.__diag.fcp = Math.round(e.startTime);
  }).observe({ type: "first-contentful-paint", buffered: true });

  // Fontes (woff2) — timing de carga
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (e.name.includes(".woff2") || e.initiatorType === "font" || e.name.includes("font")) {
        window.__diag.fonts.push({
          url: e.name.split("/").pop(),
          start: Math.round(e.startTime),
          end: Math.round(e.responseEnd),
          sizeKb: Math.round((e.transferSize || 0) / 1024),
        });
      }
    }
  }).observe({ type: "resource", buffered: true });

  // document.fonts.ready (quando TODAS as fontes carregaram/fallback)
  document.fonts?.ready?.then(() => {
    window.__diag.fontReadyAt = Math.round(performance.now());
  });
});

await page.goto(URL, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(15000);

// Amostra o H1: font-family computada + tamanho do box (antes/depois do swap)
const h1Info = await page.evaluate(() => {
  const h1 = document.querySelector("h1#hero-title");
  const out = {
    fontReadyAt: window.__diag.fontReadyAt,
    fcp: window.__diag.fcp,
    lcp: window.__diag.lcp,
    fonts: window.__diag.fonts,
  };
  if (h1) {
    const cs = getComputedStyle(h1);
    out.h1 = {
      fontFamily: cs.fontFamily.slice(0, 80),
      fontSize: cs.fontSize,
      text: h1.textContent.trim().slice(0, 40),
      box: [
        h1.getBoundingClientRect().width.toFixed(0),
        h1.getBoundingClientRect().height.toFixed(0),
      ],
    };
  }
  // fontes carregadas de fato
  out.fontFaces = [];
  document.fonts?.forEach?.((f) => out.fontFaces.push(f.family + ":" + f.status));
  return out;
});
console.log(JSON.stringify(h1Info, null, 1));
await browser.close();
