import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 700 } });
await page.goto("https://media-rate-5gkywrzwx-end-art-studios.vercel.app/pt-BR/register", {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.waitForTimeout(4000);
const r = await page.evaluate(() => {
  const iframes = [...document.querySelectorAll("iframe")].filter(
    (i) => i.src.includes("accounts.google") || i.title.includes("Google") || i.width > 100,
  );
  const iframe = iframes[0];
  const form = [...document.querySelectorAll("form")][0];
  if (!iframe || !form)
    return {
      iframe: iframe ? Math.round(iframe.getBoundingClientRect().width) : null,
      form: form ? Math.round(form.getBoundingClientRect().width) : null,
    };
  const iw = Math.round(iframe.getBoundingClientRect().width);
  const fw = Math.round(form.getBoundingClientRect().width);
  return { iframeW: iw, formW: fw, match: Math.abs(iw - fw) < 8 };
});
console.log(JSON.stringify(r));
await browser.close();
