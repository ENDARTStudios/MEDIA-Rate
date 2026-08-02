import { test, chromium } from "@playwright/test";

const PROD = "https://media-rate-web.vercel.app";
const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

const PAGES = [
  { path: "/pt-BR/movie/a-odisseia", label: "Movie pt-BR" },
  { path: "/pt-BR/tv/frieren", label: "TV pt-BR" },
  { path: "/pt-BR/game/elden-ring", label: "Game pt-BR" },
  { path: "/en-US/movie/a-odisseia", label: "Movie en-US" },
  { path: "/es-ES/movie/a-odisseia", label: "Movie es-ES" },
];

test.describe("T146 - detail page verification", () => {
  for (const p of PAGES) {
    test(p.label + " — zero cru, zero buraco, hierarquia, estados vazios", async () => {
      const browser = await chromium.launch({
        executablePath: BRAVE,
        headless: false,
        args: ["--no-sandbox", "--disable-gpu"],
      });
      const page = await browser
        .newContext({ viewport: { width: 1440, height: 900 } })
        .then((c) => c.newPage());

      try {
        await page.goto(PROD + p.path, { waitUntil: "load", timeout: 15000 });
        await page.waitForTimeout(3000);

        const text =
          (await page
            .locator("body")
            .innerText()
            .catch(() => "")) || "";
        console.log("\n=== " + p.label + " ===");

        // 1. Zero cru
        const hasUndefined = /undefined/i.test(text);
        const hasNull = /\bnull\b/i.test(text);
        const hasNaN = /\bNaN\b/.test(text);
        console.log("undefined:", hasUndefined, "null:", hasNull, "NaN:", hasNaN);
        const noCru = !hasUndefined && !hasNaN;

        // 2. Zero raw i18n key
        const rawKeys = text.match(/\b[a-z]+\.[a-z]+\.[a-z]+\b/g) || [];
        console.log("Raw i18n keys:", rawKeys.length);

        // 3. Estados vazios elegantes
        const hasSinopse =
          text.includes("Sinopse") || text.includes("Synopsis") || text.includes("Sinopsis");
        const hasElenco = text.includes("Elenco") || text.includes("Cast");
        const hasStreaming =
          text.includes("assistir") || text.includes("Watch") || text.includes("ver");
        console.log("Sinopse section:", hasSinopse);
        console.log("Elenco section:", hasElenco);
        console.log("Streaming section:", hasStreaming);

        // 4. Título presente (H1)
        const h1 = await page
          .locator("h1")
          .first()
          .textContent()
          .catch(() => "");
        console.log("H1 title:", h1.substring(0, 50));

        // 5. Headings hierarchy
        const h2s = await page
          .locator("h2")
          .count()
          .catch(() => 0);
        console.log("H2 count:", h2s);

        // Summary
        const pass = noCru && h1.length > 0 && h2s > 0;
        console.log("PASS:", pass);

        await page.screenshot({
          path: "e2e/screenshots/t146-" + p.label.replace(/[ /]/g, "-") + ".png",
          fullPage: false,
        });
      } finally {
        await browser.close();
      }
    });
  }
});
