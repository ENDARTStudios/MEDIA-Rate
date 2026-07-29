import { test, chromium } from "@playwright/test";

const PROD = "https://media-rate-web.vercel.app";
const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

test.describe("T115 - Detail pages", () => {
  test("movie, tv, game pages render + code-splitting", async () => {
    const browser = await chromium.launch({
      executablePath: BRAVE,
      headless: false,
      args: ["--no-sandbox", "--disable-gpu"],
    });
    const page = await browser.newContext({ viewport: { width: 1440, height: 900 } }).then((c) => c.newPage());

    try {
      // Track which chunks are loaded
      const loadedChunks: string[] = [];
      page.on("response", (res) => {
        const url = res.url();
        if (url.includes("/_next/static/chunks/")) {
          loadedChunks.push(url);
        }
      });

      // === MOVIE ===
      console.log("\n=== MOVIE ===");
      await page.goto(`${PROD}/pt-BR/movie/a-odisseia`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(2000);
      const movieTitle = await page.locator("h1").first().textContent();
      console.log(`Movie title: ${movieTitle}`);
      const hasSeasonsChunk = loadedChunks.some((c) => c.includes("Seasons") || c.includes("seasons"));
      const hasEpisodesChunk = loadedChunks.some((c) => c.includes("Episodes") || c.includes("episodes"));
      console.log(`Seasons chunk loaded: ${hasSeasonsChunk}`);
      console.log(`Episodes chunk loaded: ${hasEpisodesChunk}`);
      await page.screenshot({ path: "e2e/screenshots/t115-movie.png", fullPage: false });

      // Clear chunks for next test
      loadedChunks.length = 0;

      // === TV with Seasons/Episodes ===
      console.log("\n=== TV ===");
      await page.goto(`${PROD}/pt-BR/tv//frieren`, { waitUntil: "networkidle", timeout: 20000 });
      // Fix double slash
      await page.goto(`${PROD}/pt-BR/tv/frieren`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(2000);
      const tvTitle = await page.locator("h1").first().textContent();
      console.log(`TV title: ${tvTitle}`);
      const tvSeasonsChunk = loadedChunks.some((c) => c.includes("Seasons") || c.includes("seasons"));
      const tvEpisodesChunk = loadedChunks.some((c) => c.includes("Episodes") || c.includes("episodes"));
      console.log(`Seasons chunk loaded: ${tvSeasonsChunk}`);
      console.log(`Episodes chunk loaded: ${tvEpisodesChunk}`);
      await page.screenshot({ path: "e2e/screenshots/t115-tv.png", fullPage: false });

      loadedChunks.length = 0;

      // === GAME ===
      console.log("\n=== GAME ===");
      await page.goto(`${PROD}/pt-BR/game/elden-ring`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(2000);
      const gameTitle = await page.locator("h1").first().textContent();
      console.log(`Game title: ${gameTitle}`);
      const gameSeasonsChunk = loadedChunks.some((c) => c.includes("Seasons") || c.includes("seasons"));
      const gameEpisodesChunk = loadedChunks.some((c) => c.includes("Episodes") || c.includes("episodes"));
      console.log(`Seasons chunk loaded: ${gameSeasonsChunk}`);
      console.log(`Episodes chunk loaded: ${gameEpisodesChunk}`);
      await page.screenshot({ path: "e2e/screenshots/t115-game.png", fullPage: false });

      console.log("\n========== RESUMO T115 ==========");
      console.log(`Movie: ${movieTitle}`);
      console.log(`TV: ${tvTitle}`);
      console.log(`Game: ${gameTitle}`);

    } finally {
      await browser.close();
    }
  });
});
