import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "https://media-rate-end-art-studios.vercel.app";

test.describe("Regression - Public Pages (T054)", () => {
  test("home /pt-BR carrega sem pageerror", async ({ page }) => {
    const perr: string[] = [];
    page.on("pageerror", (e) => perr.push(e.message));
    await page.goto(`${BASE}/pt-BR`, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await page.waitForTimeout(2000);

    const body = await page.locator("body").innerText();
    expect(body).toMatch(/MEDIA Rate|Score/i);
    expect(perr).toHaveLength(0);
  });

  test("catalog /pt-BR/catalog carrega com conteudo visivel", async ({ page }) => {
    const perr: string[] = [];
    page.on("pageerror", (e) => perr.push(e.message));
    await page.goto(`${BASE}/pt-BR/catalog`, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await page.waitForTimeout(2000);

    const mainText = await page
      .locator("main")
      .innerText()
      .catch(() => "");
    expect(mainText.length).toBeGreaterThan(100);
    expect(perr).toHaveLength(0);
  });

  test("pricing /pt-BR/pricing carrega planos", async ({ page }) => {
    const perr: string[] = [];
    page.on("pageerror", (e) => perr.push(e.message));
    await page.goto(`${BASE}/pt-BR/pricing`, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await page.waitForTimeout(2000);

    const body = await page.locator("body").innerText();
    expect(body).toMatch(/Plano|Free|Plus|Premium/i);
    expect(perr).toHaveLength(0);
  });

  test("register page carrega formulario", async ({ page }) => {
    const perr: string[] = [];
    page.on("pageerror", (e) => perr.push(e.message));
    await page.goto(`${BASE}/pt-BR/register`, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await page.waitForTimeout(2000);

    await expect(page.locator('input[name="email"]').first()).toBeVisible();
    expect(perr).toHaveLength(0);
  });

  test("login page carrega formulario", async ({ page }) => {
    const perr: string[] = [];
    page.on("pageerror", (e) => perr.push(e.message));
    await page.goto(`${BASE}/pt-BR/login`, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await page.waitForTimeout(2000);

    await expect(page.locator('input[name="email"]').first()).toBeVisible();
    expect(perr).toHaveLength(0);
  });
});
