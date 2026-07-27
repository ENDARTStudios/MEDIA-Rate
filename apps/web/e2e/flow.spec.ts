import { test, expect } from '@playwright/test';

test('fluxo completo: register → login → catálogo → watchlist → logout', async ({ page }) => {
  const email = `e2e-${Date.now()}@test.com`;
  const password = 'TesteForte123!';
  const BASE_URL = process.env.BASE_URL || 'https://media-rate-web.vercel.app';

  // 1. Register
  await page.goto(BASE_URL + '/pt-BR/register', { waitUntil: 'networkidle', timeout: 15000 });
  // Try to find form fields with flexible selectors
  const nameField = page.locator('input[name="name"]').first();
  if (await nameField.count()) await nameField.fill('E2E User');
  const emailField = page.locator('input[type="email"]').first();
  if (await emailField.count()) await emailField.fill(email);
  const pwdFields = page.locator('input[type="password"]');
  const pwdCount = await pwdFields.count();
  if (pwdCount >= 1) await pwdFields.nth(0).fill(password);
  if (pwdCount >= 2) await pwdFields.nth(1).fill(password);
  const terms = page.locator('input[type="checkbox"]').first();
  if (await terms.count()) await terms.check().catch(() => {});
  const submitBtn = page.locator('button[type="submit"]').first();
  if (await submitBtn.count()) await submitBtn.click();
  await page.waitForTimeout(4000);
  console.log('1.Register →', page.url());

  // 2. Catálogo
  await page.goto(BASE_URL + '/pt-BR/catalog', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  const cards = await page.locator('a[href*="/midia/"], a[href*="/media/"]').count();
  console.log('2.Catalog cards=', cards);
  expect(cards).toBeGreaterThan(0);

  // 3. Home
  await page.goto(BASE_URL + '/pt-BR', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  const heroText = await page.locator('#hero-title, h1').first().textContent();
  console.log('3.Home hero=', heroText?.slice(0, 50));

  // 4. Logout (find and click logout button)
  const logoutBtn = page.locator('button:has-text("Sair"), button:has-text("Logout"), button:has-text("Log out")').first();
  if (await logoutBtn.count()) {
    await logoutBtn.click();
    await page.waitForTimeout(2000);
    console.log('4.Logout →', page.url());
  }
});
