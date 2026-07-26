import { test, expect } from "@playwright/test";
import { registerAndLogin, login, logout } from "./helpers/auth";

test.describe("Autenticacao (Login/Logout)", () => {
  test("exibe formulario de login", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("form")).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test("exibe formulario de registro", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("form")).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="acceptTerms"]')).toBeVisible();
  });

  test("registra novo usuario e redireciona para dashboard", async ({ page }) => {
    const email = `reg-${Date.now()}@e2e.test`;
    await registerAndLogin(page, { name: "E2E User", email, password: "Strong@Pass1" });

    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator("text=E2E User")).toBeVisible({ timeout: 5_000 });
  });

  test("faz login com credenciais validas", async ({ page }) => {
    const email = `login-${Date.now()}@e2e.test`;
    await registerAndLogin(page, { name: "Login Test", email, password: "Valid@Pass2" });
    await logout(page);

    await login(page, email, "Valid@Pass2");
    await expect(page).toHaveURL(/dashboard/);
  });

  test("exibe erro com credenciais invalidas", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[name="email"]').first().fill("wrong@test.com");
    await page.locator('input[name="password"]').first().fill("wrongpass");
    await page.locator('button[type="submit"]').first().click();

    await expect(page.locator("text=Email não encontrado")).toBeVisible({ timeout: 5_000 });
  });
});
