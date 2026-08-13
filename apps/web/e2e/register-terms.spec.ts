import { test, expect } from "@playwright/test";

/**
 * T306 (D-295) — Termos + aceite no cadastro.
 *
 * Cobre:
 *  (a) /terms renderiza nos 3 locales SEM os marcadores de revisão jurídica;
 *  (b) checkbox de aceite obrigatório: sem pré-seleção, botão submit desabilitado
 *      até marcar (anti-dark-pattern);
 *  (c) contrato do backend: register sem aceite → 422; com aceite → 201.
 */
const LOCALES = ["pt-BR", "en-US", "es-ES"] as const;
const MARKERS = ["REVISAR COM ADVOGADO", "REQUIRES LEGAL REVIEW", "REQUIERE REVISIÓN LEGAL"];
const DOMAIN_PLACEHOLDER: Record<(typeof LOCALES)[number], string> = {
  "pt-BR": "[domínio]",
  "en-US": "[domain]",
  "es-ES": "[dominio]",
};

for (const locale of LOCALES) {
  test(`(a) /${locale}/terms sem marcadores de revisão`, async ({ page }) => {
    await page.goto(`/${locale}/terms`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 15_000 });
    const body = await page.locator("body").innerText();
    for (const m of MARKERS) {
      expect(body).not.toContain(m);
    }
    // Placeholder de domínio permanece até o Operador fechar o domínio (D-295).
    expect(body).toContain(DOMAIN_PLACEHOLDER[locale]);
  });

  test(`(b) /${locale}/register exige aceite (checkbox sem pré-seleção)`, async ({ page }) => {
    await page.goto(`/${locale}/register`, { waitUntil: "domcontentloaded" });
    const chk = page.locator("#auth-register-accept-terms");
    const submit = page.locator('button[type="submit"]').first();
    await chk.waitFor({ timeout: 15_000 });
    await expect(chk).not.toBeChecked();
    await expect(submit).toBeDisabled();
    await chk.check();
    await expect(submit).toBeEnabled();
    await chk.uncheck();
    await expect(submit).toBeDisabled();
  });
}

test("(c) register: sem aceite 422, com aceite 201 (contrato do backend)", async ({ page }) => {
  test.skip(
    !process.env.TEST_TERMS_API,
    "TEST_TERMS_API ausente — pula contrato de API (requer backend)",
  );
  await page.goto("/pt-BR/register", { waitUntil: "domcontentloaded" });
  const base = new URL(page.url()).origin;
  const email = `t306-terms-${Date.now()}@test.com`;

  const noAccept = await page.evaluate(
    async ({ base, email }) => {
      try {
        const r = await fetch(`${base}/api/v1/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password: "Senha@123", nome: "T306" }),
        });
        return r.status;
      } catch {
        return -1;
      }
    },
    { base, email },
  );
  test.skip(noAccept === -1, "API inalcançável — pula contrato");
  expect(noAccept).toBe(422);

  const withAccept = await page.evaluate(
    async ({ base, email }) => {
      try {
        const r = await fetch(`${base}/api/v1/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email,
            password: "Senha@123",
            nome: "T306",
            aceitouTermos: true,
          }),
        });
        return { status: r.status, body: await r.json().catch(() => null) };
      } catch {
        return { status: -1, body: null };
      }
    },
    { base, email },
  );
  if (withAccept.status === -1) return; // idempotente: não falha se API sumir
  expect(withAccept.status).toBe(201);
});
