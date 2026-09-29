import { test, expect } from "@playwright/test";

/**
 * T147 (UG-09/B2-B5) — E2E DIRIGIDO "live" contra ambiente COM dados reais
 * (produção/preview): PLAYWRIGHT_BASE_URL="https://mediarate.app".
 *
 * NÃO entra na allowlist web-only do CI (T461): sem API/DB o catálogo local
 * fica vazio e as asserções seriam vacuamente verdes. Aqui o guard exige
 * dials visíveis — ambiente sem dados falha em vez de passar de graça.
 *
 * TODOS os gotos usam caminho COM prefixo de locale: caminho relativo sem
 * locale cai na origem nua e o middleware redireciona (Accept-Language),
 * trocando o idioma da página sob o teste.
 *
 * Regras provadas:
 * - B2: mangá NUNCA aparece como "de 100" (dial/aria) no catálogo pt-BR.
 * - B2/B5: ficha de mangá com nota decimal tem aria "7,9 de 10" e vírgula.
 * - Rota canônica do catálogo é /catalog (nunca /catalogo — 404 não é defeito).
 */

test("mangá no catálogo pt-BR nunca expõe escala 'de 100'", async ({ page }) => {
  await page.goto("/pt-BR/catalog?type=manga");
  // Guard de significância: precisa haver dials de nota na página (pt-BR).
  const dials = page.locator('[role="img"][aria-label*="de 10"]');
  await expect(dials.first()).toBeVisible({ timeout: 15_000 });
  // B2: nenhum dial/aria de mangá pode anunciar escala 0-100.
  const de100 = page.locator('[aria-label*="de 100"]');
  await expect(de100).toHaveCount(0);
});

test("ficha de mangá com nota decimal: aria 'de 10' e separador pt-BR (B2/B5)", async ({
  page,
}) => {
  await page.goto("/pt-BR/media/goodnight-punpun");
  const modulo = page.locator('svg[role="img"][aria-label*="Score geral"]');
  await expect(modulo).toBeVisible({ timeout: 15_000 });
  // B5: número com vírgula (pt-BR); B2: escala 0-10, nunca "de 100".
  await expect(modulo).toHaveAttribute("aria-label", /7,9 de 10/);
  await expect(modulo).not.toHaveAttribute("aria-label", /de 100/);
});
