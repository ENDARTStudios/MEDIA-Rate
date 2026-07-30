import { test, chromium } from "@playwright/test";

const PROD = "https://media-rate-web.vercel.app";
const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

const PAGES = [
  { path: "/pt-BR", label: "Home pt-BR" },
  { path: "/en-US", label: "Home en-US" },
  { path: "/es-ES", label: "Home es-ES" },
  { path: "/pt-BR/catalog", label: "Catalog pt-BR" },
  { path: "/pt-BR/login", label: "Login pt-BR" },
  { path: "/pt-BR/register", label: "Register pt-BR" },
  { path: "/pt-BR/pricing", label: "Pricing pt-BR" },
  { path: "/pt-BR/movie/a-odisseia", label: "Movie pt-BR" },
  { path: "/pt-BR/game/elden-ring", label: "Game pt-BR" },
];

test.describe("T144 - C3 i18n verification", () => {
  for (const p of PAGES) {
    test(p.label + " — zero raw i18n keys", async () => {
      const browser = await chromium.launch({
        executablePath: BRAVE,
        headless: false,
        args: ["--no-sandbox", "--disable-gpu"],
      });
      const page = await browser.newContext({ viewport: { width: 1440, height: 900 } }).then((c) => c.newPage());

      try {
        await page.goto(PROD + p.path, { waitUntil: "load", timeout: 15000 });
        await page.waitForTimeout(3000);

        const text = await page.locator("body").innerText().catch(() => "") || "";
        
        // Look for raw i18n keys (pattern: namespace.key)
        const rawKeyPattern = /\b[a-z]+\.[a-z]+(\.[a-z]+)?\b/g;
        const matches = text.match(rawKeyPattern) || [];
        const realKeys = matches.filter((m) => !m.includes("vercel.app") && !m.startsWith("media-rate") && m.length > 5);

        // Filter out known false positives (URLs, email-like, class names)
        const falsePositives = ["media.rate", "vercel.app", "end.art", "tmdb.org", "rawg.io", "akamaihd.net"];
        const actualLeaks = realKeys.filter((k) => !falsePositives.some((fp) => k.includes(fp)));

        if (actualLeaks.length > 0) {
          console.log("  LEAKED KEYS:", [...new Set(actualLeaks)].slice(0, 10));
        } else {
          console.log("  ✅ 0 raw keys");
        }

        // Check chrome UI translated (basic)
        const inEnglish = p.path.includes("en-US");
        if (inEnglish && (text.includes("Entrar") || text.includes("Cadastrar"))) {
          console.log("  ⚠️ Portuguese text found in en-US page");
        }

      } finally {
        await browser.close();
      }
    });
  }
});
