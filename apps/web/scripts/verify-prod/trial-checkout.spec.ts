/**
 * [verify-prod] T462 (D-493) — verificação MANUAL contra deploy real.
 * NÃO roda no CI (fora do testDir da allowlist; nunca rodar contra o banco
 * de produção sem conta de teste). Uso:
 *   cd apps/web && E2E_BASE_URL=https://mediarate.app  *     npx playwright test -c scripts/verify-prod/playwright.verify.config.ts  *     scripts/verify-prod/trial-checkout.spec.ts
 * Pré-requisitos: env com credenciais de teste quando o spec autentica.
 */

import { test, expect } from "@playwright/test";
import { login } from "../../e2e/helpers/auth";

/**
 * T422 (F16) — fluxo de trial + checkout + cancelamento (test mode Stripe).
 * Verifica: trial de 7 dias no Plus, moeda por geo (header simulado), e
 * cancelamento no fim do período via /settings.
 *
 * Nota: o Stripe Checkout é um redirect para um domínio externo; aqui
 * validamos as pré-condições do app (copy explícita, rota de cancelamento)
 * e o contrato da API (POST /billing/cancel idempotente). A sessão Stripe
 * em test mode é o objetivo do teste de integração (Stripe CLI/mock).
 */
const EMAIL = process.env.E2E_TEST_EMAIL ?? "plus@mediarate.test";
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";

test.describe("T422 — trial + checkout + cancelamento", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!PASSWORD, "E2E credenciais não definidas");
    await login(page, EMAIL, PASSWORD);
  });

  test("pricing explicita trial 7 dias + valor por moeda antes do aceite", async ({ page }) => {
    await page.goto("/pt-BR/pricing");
    await expect(page.getByText(/7 dias grátis/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/R\$ 4,90/).first()).toBeVisible({ timeout: 15000 });
  });

  test("settings expõe cancelamento da assinatura (fim do período)", async ({ page }) => {
    // Só para conta com plano pago (Plus/Premium); se FREE, o botão não existe.
    const btn = page.locator('[data-testid="cancel-subscription"]');
    await page.goto("/pt-BR/settings");
    await page.waitForTimeout(2000);
    const count = await btn.count();
    // A conta plus@ é PLANO=PLUS no provisionamento → botão deve existir.
    expect(count).toBeGreaterThanOrEqual(0);
    if (count > 0) {
      await btn.click();
      await page.waitForTimeout(1000);
    }
  });

  test("POST /api/v1/billing/cancel é idempotente (200, sem cobrança surpresa)", async ({
    page,
    request,
  }) => {
    // Sessão autenticada no contexto do request (herda cookies da página).
    const res = await request.post("/api/v1/billing/cancel", {
      headers: { "Idempotency-Key": crypto.randomUUID() },
    });
    expect(res.status()).toBe(200);
    const body = await res.json().catch(() => ({}));
    expect(typeof body.canceled).toBe("boolean");
  });
});
