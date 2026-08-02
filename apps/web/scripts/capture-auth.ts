import { chromium } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROD = "https://media-rate-web.vercel.app";
const STORAGE_STATE = path.resolve(__dirname, "..", "e2e", ".auth", "storageState.json");
const EMAIL = `test-${Date.now()}@mediarate.dev`;
const PASS = "TestPass123!";
const NAME = "Edi Test";

async function main() {
  const brave =
    process.env.BRAVE_PATH ||
    "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";
  const browser = await chromium.launch({ executablePath: brave, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Try register directly
  console.log(`Registering ${EMAIL} via API...`);

  const apiResult = await page.evaluate(
    async ({
      name,
      email,
      pass,
      origin,
    }: {
      name: string;
      email: string;
      pass: string;
      origin: string;
    }) => {
      try {
        const resp = await fetch(origin + "/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password: pass,
            confirmPassword: pass,
            acceptTerms: true,
          }),
          credentials: "include",
        });
        const data = await resp.json();
        return { ok: resp.ok, status: resp.status, data: JSON.stringify(data).substring(0, 100) };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    },
    { name: NAME, email: EMAIL, pass: PASS, origin: PROD },
  );

  console.log(`  API Register: ${JSON.stringify(apiResult)}`);

  let ok = apiResult.ok;
  if (ok) {
    // Navigate to dashboard to verify
    await page.goto(PROD + "/en-US/dashboard", { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(2000);
    ok = page.url().includes("dashboard") && !page.url().includes("login");
    console.log(`  Dashboard access: ${ok}`);
  }

  if (!ok) {
    console.log(`Login via API...`);
    const loginResult = await page.evaluate(
      async ({ email, pass, origin }: { email: string; pass: string; origin: string }) => {
        try {
          const resp = await fetch(origin + "/api/v1/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password: pass }),
            credentials: "include",
          });
          return { ok: resp.ok, status: resp.status };
        } catch (e: any) {
          return { ok: false, error: e.message };
        }
      },
      { email: EMAIL, pass: PASS, origin: PROD },
    );
    console.log(`  API Login: ${JSON.stringify(loginResult)}`);
    if (loginResult.ok) {
      await page.goto(PROD + "/en-US/dashboard", { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(2000);
      ok = page.url().includes("dashboard") && !page.url().includes("login");
    }
  }

  if (!ok) {
    console.error("Auth failed.");
    await browser.close();
    process.exit(1);
  }

  await ctx.storageState({ path: STORAGE_STATE });
  console.log("storageState saved.");

  // Capture 4 screenshots
  for (const [url, label] of [
    ["/en-US/profile", "profile-en"],
    ["/es-ES/profile", "profile-es"],
    ["/en-US/settings", "settings-en"],
    ["/es-ES/settings", "settings-es"],
  ] as [string, string][]) {
    await page.goto(PROD + url, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(2000);
    if (page.url().includes("/login")) {
      console.error(`FAIL: ${label} redirected to login.`);
      await browser.close();
      process.exit(1);
    }
    await page.screenshot({
      path: path.resolve(__dirname, "..", "e2e", "screenshots", `t174-${label}.png`),
      fullPage: false,
    });
    console.log(`  ✓ ${label}`);
  }

  await browser.close();
  console.log("Done.");
}

main();
