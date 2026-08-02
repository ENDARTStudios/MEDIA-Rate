import { test, chromium } from "@playwright/test";

const PROD = "https://web-6hiv0vqcj-end-art-studios.vercel.app";
const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

test("debug catalog deep", async () => {
  const browser = await chromium.launch({
    executablePath: BRAVE,
    headless: false,
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser
    .newContext({ viewport: { width: 1440, height: 900 } })
    .then((c) => c.newPage());

  try {
    await page.goto(`${PROD}/pt-BR/catalog`, { waitUntil: "load", timeout: 15000 });
    await page.waitForTimeout(3000);

    const chain = await page.evaluate(() => {
      const card = document.querySelector('a[href*="/media/"]');
      if (!card) return "no card found";

      const result: any[] = [];
      let e: Element | null = card;
      for (let i = 0; i < 5 && e; i++, e = e.parentElement) {
        const html = e as HTMLElement;
        result.push({
          d: i,
          t: e.tagName,
          cls: html.className?.substring(0, 80),
          inline_style: html.getAttribute("style")?.substring(0, 120) || "",
          dataset: JSON.stringify(Object.keys(html.dataset || {}) || []),
          cs_opacity: getComputedStyle(e).opacity,
          cs_display: getComputedStyle(e).display,
          children_count: e.children.length,
          child_tags: Array.from(e.children)
            .map((c) => c.tagName)
            .join(","),
        });
      }
      return result;
    });

    console.log("=== DEEP CHAIN ===");
    chain.forEach((c: any) => {
      console.log(`[${c.d}] ${c.t}.${c.cls}`);
      console.log(`    opacity=${c.cs_opacity} display=${c.cs_display}`);
      console.log(`    inline: ${c.inline_style}`);
      console.log(`    dataset: ${c.dataset}`);
      console.log(`    children(${c.children_count}): ${c.child_tags}`);
    });
  } finally {
    await browser.close();
  }
});
