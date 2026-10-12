import { test, expect, type Page } from "@playwright/test";

/**
 * T208/D-580 — regressão visual do hero (pixel + estrutura).
 *
 * Só `pt-BR` entra no baseline de imagem: cada locale extra multiplica a
 * manutenção do PNG sem cobrir risco novo (o layout é o mesmo; o texto varia e
 * é coberto pelo teste estrutural abaixo e pelos gates de i18n do vitest).
 *
 * O baseline de pixel roda com `prefers-reduced-motion: reduce` DE PROPÓSITO:
 * é a única forma de obter dois frames idênticos consecutivos (o Playwright
 * exige estabilidade) e, de quebra, congela o contrato de movimento reduzido do
 * hero — entrada da constelação, flutuação, brilho, anel e marquee desligados.
 */

const LOCALE = "pt-BR";

/** Fecha o banner LGPD (ele cobre o rodapé do hero e entra no PNG). */
async function dismissConsent(page: Page) {
  await page
    .getByRole("button", { name: /^(Aceitar todos|Accept all|Aceptar todo)/i })
    .first()
    .click({ timeout: 6000 })
    .catch(() => undefined);
}

test.describe("hero — baseline de pixel (reduced-motion)", () => {
  test("screenshot da dobra do hero", async ({ page }) => {
    await page.goto(`/${LOCALE}`, { waitUntil: "domcontentloaded" });
    // Emula a preferência ANTES de esperar: é o que congela a constelação
    // (entrada, flutuação, brilho, anel e marquee) e garante frames estáveis.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await page.waitForTimeout(1200);
    await dismissConsent(page);
    // Hidratação concluída + sem animação (reduced-motion) = frames estáveis.
    await page.waitForTimeout(1200);
    // Topo absoluto: o recorte precisa ser independente de scroll.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);

    const viewport = page.viewportSize();
    const height = Math.min(620, (viewport?.height ?? 620) - 100);
    await expect(page).toHaveScreenshot(`hero-${LOCALE}-reduced-motion.png`, {
      // Screenshot de PÁGINA com recorte fixo (e não de elemento): o cabeçalho é
      // `fixed` e, no screenshot de elemento, ele é sobreposto ao topo do hero em
      // posição dependente do scroll — era isso que deixava o diff instável
      // (~5-7% dos pixels). Aqui a região começa abaixo do cabeçalho (y=64) e
      // termina antes do rodapé, com tamanho fixo.
      clip: { x: 0, y: 64, width: viewport?.width ?? 1440, height },
      timeout: 15_000,
    });
  });
});

test.describe("hero — estrutura (estável entre SOs e com movimento)", () => {
  test("funil, CTA acima da dobra, 6 categorias e sem scroll horizontal", async ({ page }) => {
    await page.goto(`/${LOCALE}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    await dismissConsent(page);
    await page.waitForTimeout(800);

    // LCP/contrato: H1 existe, é texto e tem o gancho.
    const h1 = page.locator("#hero-title");
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText(/.{20,}/);

    // CTA primária (catálogo) acima da dobra e visível.
    const cta = page.locator('[data-hero-cta="primary"]');
    await expect(cta).toBeVisible();
    const ctaBox = await cta.boundingBox();
    const viewport = page.viewportSize();
    expect(ctaBox, "CTA primária sem caixa").not.toBeNull();
    expect(ctaBox!.y + ctaBox!.height).toBeLessThanOrEqual(viewport!.height);

    // As 6 categorias canônicas continuam renderizando como links navegáveis.
    await expect(page.locator("[data-category-tile]")).toHaveCount(6);

    // Sem scroll horizontal (regressão clássica de hero largo).
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, "scroll horizontal no hero").toBeLessThanOrEqual(1);
  });
});
