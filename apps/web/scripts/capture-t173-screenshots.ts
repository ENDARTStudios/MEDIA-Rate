import { chromium } from "@playwright/test";

const PROD = "https://media-rate-web.vercel.app";
const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

const PAGES = [
  { path: "/en-US/game/elden-ring", label: "game-en", waitFor: ".rounded-2xl" },
  { path: "/es-ES/game/elden-ring", label: "game-es", waitFor: ".rounded-2xl" },
  { path: "/en-US/privacy", label: "privacy-en" },
  { path: "/es-ES/privacy", label: "privacy-es" },
  { path: "/en-US/terms", label: "terms-en" },
  { path: "/es-ES/terms", label: "terms-es" },
  { path: "/en-US/profile", label: "profile-en", needsLogin: true },
  { path: "/es-ES/profile", label: "profile-es", needsLogin: true },
  { path: "/en-US/settings", label: "settings-en", needsLogin: true },
  { path: "/es-ES/settings", label: "settings-es", needsLogin: true },
];

(async () => {
  const browser = await chromium.launch({ executablePath: BRAVE, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  for (const p of PAGES) {
    console.log(`Capturing ${p.label}...`);
    await page.goto(PROD + p.path, { waitUntil: "networkidle", timeout: 15000 });
    if (p.waitFor) await page.waitForSelector(p.waitFor, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: `e2e/screenshots/t173-${p.label}.png`,
      fullPage: p.path.includes("privacy") || p.path.includes("terms"),
    });
  }

  await browser.close();
  console.log("Done — 10 screenshots captured.");
})();
