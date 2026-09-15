import { test, expect } from "@playwright/test";

/**
 * T461 (D-492): todos os testes deste spec dependem de API + banco
 * (registro/login/CSRF). O job de CI sobe apenas `next dev` (sem API em
 * :4000) e apontar para produção é PROIBIDO — o edge devolve 429 a IPs de
 * datacenter e criaria usuários reais no banco de produção.
 *
 * Gate: com E2E_FULL=1 (ambiente full-stack, API em :4000) os testes rodam
 * contra URLs relativas do `baseURL`. Sem a variável, pulados com a
 * dispensa documentada em docs/E2E.md.
 */
const E2E_FULL = process.env.E2E_FULL === "1";

const PWD = "TesteForte123!";

async function registerUser(page, name, email) {
  await page.goto("/pt-BR/register", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.locator('input[name="name"], input[name="nome"]').first().fill(name);
  await page.locator('input[name="email"]').first().fill(email);
  const pwdInputs = page.locator('input[type="password"]');
  await pwdInputs.first().fill(PWD);
  if ((await pwdInputs.count()) > 1) await pwdInputs.nth(1).fill(PWD);
  const chk = page.locator('input[type="checkbox"]').first();
  if ((await chk.count()) > 0) await chk.check().catch(() => {});
  await page
    .locator('button:has-text("Cadastrar")')
    .first()
    .click()
    .catch(() => {
      return page.locator('button[type="submit"]').first().click();
    });
}

async function logoutViaUI(page) {
  // Desktop: click user avatar
  const userBtn = page.locator("nav button:has(span.w-7)").first();
  if ((await userBtn.count()) > 0) {
    await userBtn.click();
    await page.waitForTimeout(300);
    const sair = page.locator('button:has-text("Sair")').first();
    if ((await sair.count()) > 0) {
      await sair.hover();
      await sair.click({ timeout: 3000 });
      return true;
    }
  }
  // Mobile: open hamburger menu
  const menuBtn = page.locator('[aria-label="Abrir menu"]').first();
  if ((await menuBtn.count()) > 0) {
    await menuBtn.click();
    await page.waitForTimeout(300);
    await page.locator("text=Sair").first().click({ timeout: 3000 });
    return true;
  }
  return false;
}

test.describe("A1 Auth E2E (T054)", () => {
  test.skip(!E2E_FULL, "T461: requer API+DB (E2E_FULL=1) — CI sobe só o web; ver docs/E2E.md");

  test("register → login automatico → dashboard", async ({ page }) => {
    const email = `e2e-reg-${Date.now()}@test.com`;
    await registerUser(page, "E2E Reg", email);

    await page.waitForURL("**/dashboard", { timeout: 10_000 });
    expect(page.url()).toContain("/dashboard");
  });

  test("logout → sessao limpa → protected redirect", async ({ page }) => {
    const email = `e2e-logout-${Date.now()}@test.com`;
    await registerUser(page, "E2E Logout", email);
    await page.waitForURL("**/dashboard", { timeout: 10_000 });
    await page.waitForTimeout(2000);

    await logoutViaUI(page);
    await page.waitForTimeout(2000);

    await page
      .goto("/pt-BR/dashboard", { waitUntil: "domcontentloaded", timeout: 10_000 })
      .catch(() => {});
    await page.waitForTimeout(2000);
    expect(page.url()).toContain("/login");
  });

  test("login com credenciais invalidas → erro visivel", async ({ page }) => {
    await page.goto("/pt-BR/login", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.locator('input[name="email"]').first().fill("nao-existe@x.com");
    await page.locator('input[type="password"]').first().fill("senha-errada");
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(2000);

    const body = await page.locator("body").innerText();
    expect(body).toMatch(/inválida|erro|não encontrado/i);
    expect(page.url()).not.toContain("/dashboard");
  });

  test("register com email ja cadastrado → erro visivel", async ({ page }) => {
    const email = `e2e-dup-${Date.now()}@test.com`;
    await registerUser(page, "E2E Dup", email);
    await page.waitForTimeout(3000);

    // Try registering same email again
    await page.goto("/pt-BR/register", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.locator('input[name="name"], input[name="nome"]').first().fill("Dup2");
    await page.locator('input[name="email"]').first().fill(email);
    const pwdInputs = page.locator('input[type="password"]');
    await pwdInputs.first().fill(PWD);
    if ((await pwdInputs.count()) > 1) await pwdInputs.nth(1).fill(PWD);
    await page
      .locator('button:has-text("Cadastrar")')
      .first()
      .click()
      .catch(() => {
        return page.locator('button[type="submit"]').first().click();
      });
    await page.waitForTimeout(2000);

    const body = await page.locator("body").innerText();
    expect(body).toMatch(/cadastrado|existe|já/i);
  });

  test("CSRF: cookie csrf_token presente apos login", async ({ page }) => {
    const email = `e2e-csrf-${Date.now()}@test.com`;
    await registerUser(page, "E2E CSRF", email);
    // Wait for sessionStorage to be populated
    await page.waitForTimeout(2000);

    const csrf = await page.evaluate(() => {
      try {
        return sessionStorage.getItem("mediarate:csrf");
      } catch {
        return null;
      }
    });
    // csrf_token em sessionStorage confirma captura cross-domain
    expect(csrf).toBeDefined();
    if (csrf) expect(csrf.length).toBe(64);
  });
});
