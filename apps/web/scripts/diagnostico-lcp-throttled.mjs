// Diagnóstico F16 (Issue #17) — modo throttled (Lighthouse-like): Slow 4G + 4x CPU.
// Confirma se o LCP ~10s coincide com o swap da fonte.
/* global PerformanceObserver: readonly, performance: readonly, setInterval: readonly */
import { chromium } from "@playwright/test";

const URL = process.argv[2] ?? "https://mediarate.app/pt-BR";

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 412, height: 823 },
  deviceScaleFactor: 2.625,
});
const cdp = await page.context().newCDPSession(page);

// Lighthouse mobile throttling: Slow 4G + 4x CPU
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", {
  offline: false,
  latency: 150, // 150ms RTT
  downloadThroughput: (1.6 * 1024 * 1024) / 8, // 1.6 Mbps
  uploadThroughput: (750 * 1024) / 8,
  connectionType: "cellular3g",
});
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

await page.addInitScript(() => {
  window.__diag = { lcp: [], fonts: [], h1Snapshots: [] };
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      window.__diag.lcp.push({
        at: Math.round(e.startTime),
        size: Math.round(e.size),
        tag: e.element?.tagName,
      });
    }
  }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (e.name.includes(".woff2")) {
        window.__diag.fonts.push({
          url: e.name.split("/").pop(),
          start: Math.round(e.startTime),
          end: Math.round(e.responseEnd),
        });
      }
    }
  }).observe({ type: "resource", buffered: true });
  // snapshots do H1 (largura) ao longo do tempo — antes/depois do swap
  const snap = () => {
    const h1 = document.querySelector("h1#hero-title");
    if (h1) {
      window.__diag.h1Snapshots.push({
        t: Math.round(performance.now()),
        w: Math.round(h1.getBoundingClientRect().width),
        family: getComputedStyle(h1).fontFamily.split(",")[0],
      });
    }
  };
  snap();
  setInterval(snap, 250);
});

await page.goto(URL, { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(30000);
const out = await page.evaluate(() => window.__diag);
console.log(JSON.stringify(out, null, 1));
await browser.close();
