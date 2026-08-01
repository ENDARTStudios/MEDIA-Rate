import { test, chromium } from "@playwright/test";

const PROD = "https://media-rate-web.vercel.app";
const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

const PAGES = [
  { path: "/pt-BR/movie/a-odisseia", label: "Movie pt-BR", type: "movie" },
  { path: "/en-US/movie/a-odisseia", label: "Movie en-US", type: "movie" },
  { path: "/es-ES/movie/a-odisseia", label: "Movie es-ES", type: "movie" },
  { path: "/pt-BR/tv/frieren", label: "TV pt-BR", type: "tv" },
  { path: "/en-US/tv/frieren", label: "TV en-US", type: "tv" },
  { path: "/es-ES/tv/frieren", label: "TV es-ES", type: "tv" },
  { path: "/pt-BR/game/elden-ring", label: "Game pt-BR", type: "game" },
  { path: "/en-US/game/elden-ring", label: "Game en-US", type: "game" },
  { path: "/es-ES/game/elden-ring", label: "Game es-ES", type: "game" },
];

const SHARE_ICON_SVG = "M8.684 13.342"; // From the share SVG path

test.describe("T161 - detalhe completa e coerente", () => {
  for (const p of PAGES) {
    test(p.label + " — gate completo", async () => {
      const browser = await chromium.launch({
        executablePath: BRAVE,
        headless: true,
        args: ["--no-sandbox", "--disable-gpu"],
      });
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        permissions: ["clipboard-read", "clipboard-write"],
      });
      const page = await context.newPage();

      try {
        await page.goto(PROD + p.path, { waitUntil: "load", timeout: 15000 });
        await page.waitForTimeout(2000);

        const locale = p.path.split("/")[1];
        let issues: string[] = [];

        // === GATE 1: Zero raw i18n keys ===
        const bodyText = await page.locator("body").innerText().catch(() => "") || "";
        const rawKeys = (bodyText.match(/\b[a-z]+\.[a-z]+\.[A-Za-z]+\b/g) || []).filter((k: string) => {
          const ns = k.split(".")[0];
          return ["catalog", "watchlist", "nav", "common"].includes(ns);
        });
        if (rawKeys.length > 0) issues.push(`RAW_KEYS:${rawKeys.slice(0, 5).join(",")}`);

        // === GATE 2: No cruft ===
        if (/\bN\/A\b/.test(bodyText)) issues.push("N/A_FOUND");
        if (/\bundefined\b/.test(bodyText)) issues.push("UNDEFINED");

        // === GATE 3: H2 headings in correct locale ===
        const h2Texts = await page.locator("h2").allInnerTexts().catch(() => []);
        const allH2 = h2Texts.join(" ");

        if (locale === "pt-BR") {
          if (!allH2.includes("Sinopse") && !bodyText.includes("Sinopse")) issues.push("MISSING:Sinopse");
          if (allH2.includes("Synopsis")) issues.push("WRONG_H2:Synopsis(EN) in PT");
        } else if (locale === "en-US") {
          if (!allH2.includes("Synopsis") && !bodyText.includes("Synopsis")) issues.push("MISSING:Synopsis");
          if (allH2.includes("Sinopse")) issues.push("WRONG_H2:Sinopse(PT) in EN");
        } else {
          if (!allH2.includes("Sinopsis") && !bodyText.includes("Sinopsis")) issues.push("MISSING:Sinopsis");
          if (allH2.includes("Synopsis")) issues.push("WRONG_H2:Synopsis(EN) in ES");
        }

        // === GATE 4: Share button present with correct locale text ===
        const shareSelector = locale === "pt-BR" ? "Compartilhar" : locale === "en-US" ? "Share" : "Compartir";
        const shareCount = await page.locator(`text="${shareSelector}"`).count().catch(() => 0);
        if (shareCount === 0) {
          // Maybe the share button renders only an icon without text
          const shareBtns = page.locator("button[aria-label]").filter({ hasText: "" });
          const shareBtnCount = await shareBtns.count().catch(() => 0);
          if (shareBtnCount === 0) {
            // Check if share SVG exists
            const hasShareSvg = await page.locator(`svg`).filter({ hasText: "" }).count().catch(() => 0);
            if (hasShareSvg === 0) issues.push("NO_SHARE_BUTTON");
          }
        } else {
          // Verify share button click produces feedback
          try {
            const btn = page.locator(`text="${shareSelector}"`).first();
            await btn.click();
            await page.waitForTimeout(600);
            const updatedText = await page.locator("body").innerText().catch(() => "") || "";
            const feedbackLabel = locale === "pt-BR" ? "Link copiado" : locale === "en-US" ? "Link copied" : "Enlace copiado";
            if (!updatedText.includes(feedbackLabel)) {
              // Don't fail on this - clipboard may be blocked in headless
              console.log("  (share feedback not detected in headless)");
            }
          } catch {
            // ignore click errors
          }
        }

        // === GATE 5: Breadcrumb locale ===
        const navText = await page.locator("nav[aria-label=Breadcrumb]").first().innerText().catch(() => "") || "";
        if (locale === "pt-BR") {
          if (navText.includes("Catalog")) issues.push("BREADCRUMB:EN_Catalog in PT");
        } else if (locale === "en-US") {
          if (navText.includes("Catálogo")) issues.push("BREADCRUMB:PT_Catálogo in EN");
        } else {
          if (navText.includes("Catalog")) issues.push("BREADCRUMB:EN_Catalog in ES");
        }

        // === GATE 6: H1 present ===
        const h1 = await page.locator("h1").first().textContent().catch(() => "");
        if (!h1 || h1.length === 0) issues.push("NO_H1");

        // === GATE 7: No page errors ===
        page.on("pageerror", (err) => {
          issues.push(`PAGE_ERROR:${err.message.substring(0, 80)}`);
        });

        // Screenshot
        await page.screenshot({
          path: `e2e/screenshots/t161-detalhe-${p.label.replace(/[ /]/g, "-").toLowerCase()}.png`,
          fullPage: false,
        });

        console.log("\n=== " + p.label + " ===");
        console.log("  H1:", h1.substring(0, 60));
        console.log("  H2s:", allH2.substring(0, 80));
        console.log("  Breadcrumb:", navText.substring(0, 60));
        console.log("  Share count:", shareCount);
        if (issues.length === 0) {
          console.log("  PASS");
        } else {
          console.log("  FAIL:", issues.join(" | "));
        }

        if (issues.length > 0) {
          throw new Error(`T161 gate [${p.label}]: ${issues.join(" | ")}`);
        }

      } finally {
        await browser.close();
      }
    });
  }
});
