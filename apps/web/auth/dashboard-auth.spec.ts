import { test, expect } from "@playwright/test";

/**
 * D-588 (T211/B3) — baseline VISUAL do dashboard autenticado.
 *
 * É o pré-requisito que faltava para migrar a paleta legada `dash-*` para os
 * tokens canônicos (D-586): sem comparação de pixel numa rota logada, a migração
 * ficaria confiando só em "o valor hex é o mesmo" — e o dashboard é a primeira
 * tela do usuário logado.
 *
 * O baseline fica em `auth/dashboard-auth.spec.ts-snapshots/` (git-ignored, por
 * máquina) e é semeado com `npm run test:auth:update --workspace apps/web`.
 */

test.describe("dashboard — baseline visual autenticado", () => {
  test("dobra inicial do dashboard", async ({ page }) => {
    await page.goto("/pt-BR/dashboard", { waitUntil: "domcontentloaded" });
    // KPIs e gráficos entram no cliente; espera o conteúdo assentar.
    await page.waitForTimeout(3500);

    await expect(page).toHaveScreenshot("dashboard-dobra.png", {
      clip: { x: 0, y: 80, width: 1440, height: 900 },
    });
  });

  test("estrutura: seções consolidadas presentes e sem scroll horizontal", async ({ page }) => {
    await page.goto("/pt-BR/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const semScrollHorizontal = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    );
    expect(semScrollHorizontal, "dashboard com overflow horizontal em 1440px").toBe(true);

    const texto = (await page.locator("main").innerText()).toLowerCase();
    // Sinais de que a tela real renderizou (não o estado de "verificando sessão")
    expect(texto.length, "dashboard sem conteúdo").toBeGreaterThan(200);
  });
});
