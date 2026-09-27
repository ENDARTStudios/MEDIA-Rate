/**
 * BETA-GAP-13/14 (T108) — medição determinística de layout.
 *
 * - Planos: os 3 CTAs (`plan-cta-*`) devem ter MESMO y e MESMA altura (≤1px) e os
 *   3 cards (`plan-card-*`) a mesma altura (≤1px), em 1280×800 nos 3 locales.
 * - Planos mobile 390×844: empilhados; offset (base do card − base do CTA)
 *   idêntico entre os 3 (≤1px); altura do CTA ≥ 40px.
 * - Biblioteca: apenas MEDIÇÃO/baseline (sem assert de densidade — BETA-GAP-14
 *   será definido na T109 com os números medidos). Roda só com E2E_FULL=1
 *   (usa o storageState autenticado do globalSetup).
 *
 * Determinismo: espera de `document.fonts.ready` + rAF duplo; tolerância 1px.
 * Sem sleep arbitrário, sem retry cego, sem skip/fixme/expect.soft.
 */
import { test, expect, type Page } from "@playwright/test";

const E2E_FULL = process.env.E2E_FULL === "1";
const LOCALES = ["pt-BR", "en-US", "es-ES"] as const;
const PLAN_IDS = ["free", "plus", "premium"] as const;
const TOL = 1;

interface Caixa {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Aguarda hidratação + fontes + 2 rAF (estabilidade de layout). */
async function estabilizar(page: Page, seletor: string): Promise<void> {
  await page.waitForSelector(seletor, { state: "visible" });
  await page.evaluate(async () => {
    await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  });
}

async function medir(page: Page, seletor: string): Promise<Caixa[]> {
  const itens = page.locator(seletor);
  const n = await itens.count();
  const caixas: Caixa[] = [];
  for (let i = 0; i < n; i += 1) {
    const b = await itens.nth(i).boundingBox();
    if (!b) throw new Error(`sem boundingBox para ${seletor}[${i}]`);
    caixas.push({ x: b.x, y: b.y, width: b.width, height: b.height });
  }
  return caixas;
}

function assertProximo(a: number, b: number, msg: string): void {
  expect(Math.abs(a - b), `${msg} (${a} vs ${b})`).toBeLessThanOrEqual(TOL);
}

test.describe("BETA-GAP-13 — CTAs de Planos alinhados", () => {
  for (const locale of LOCALES) {
    test(`desktop 1280x800 — ${locale}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`/${locale}/pricing`);

      const seletorCards = '[data-testid^="plan-card-"]';
      const seletorCtas = '[data-testid^="plan-cta-"]';
      await estabilizar(page, seletorCards);

      const cards = await medir(page, seletorCards);
      const ctas = await medir(page, seletorCtas);
      expect(cards.length, "deve haver 3 cards de plano").toBe(PLAN_IDS.length);
      expect(ctas.length, "deve haver 3 CTAs de plano").toBe(PLAN_IDS.length);

      // CTAs: mesmo topo (y) e mesma altura.
      for (let i = 1; i < ctas.length; i += 1) {
        assertProximo(ctas[i].y, ctas[0].y, `y do CTA ${i} difere do card 0`);
        assertProximo(ctas[i].height, ctas[0].height, `altura do CTA ${i} difere`);
      }
      // Cards: mesma altura (o grid é items-stretch).
      for (let i = 1; i < cards.length; i += 1) {
        assertProximo(cards[i].height, cards[0].height, `altura do card ${i} difere`);
      }

      const resumo = {
        locale,
        ctaY: ctas.map((c) => Math.round(c.y)),
        ctaH: ctas.map((c) => Math.round(c.height)),
        cardH: cards.map((c) => Math.round(c.height)),
      };
      test
        .info()
        .annotations.push({ type: "medicao-planos-desktop", description: JSON.stringify(resumo) });
    });
  }

  test("mobile 390x844 — cards empilhados e CTA >= 40px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/pt-BR/pricing");

    const seletorCards = '[data-testid^="plan-card-"]';
    await estabilizar(page, seletorCards);
    const cards = await medir(page, seletorCards);
    const ctas = await medir(page, '[data-testid^="plan-cta-"]');
    expect(cards.length).toBe(PLAN_IDS.length);

    // Empilhados: y estritamente crescente.
    for (let i = 1; i < cards.length; i += 1) {
      expect(cards[i].y, "cards devem estar empilhados no mobile").toBeGreaterThan(cards[i - 1].y);
    }
    // Offsets (base do card − base do CTA) idênticos entre os 3.
    const offsets = cards.map((c, i) => c.y + c.height - (ctas[i].y + ctas[i].height));
    for (let i = 1; i < offsets.length; i += 1) {
      assertProximo(offsets[i], offsets[0], `offset CTA↔card ${i} difere`);
    }
    for (const [i, cta] of ctas.entries()) {
      expect(cta.height, `CTA ${i} abaixo de 40px (tap target)`).toBeGreaterThanOrEqual(40);
    }

    test.info().annotations.push({
      type: "medicao-planos-mobile",
      description: JSON.stringify({
        offsets: offsets.map((o) => Math.round(o)),
        ctaH: ctas.map((c) => Math.round(c.height)),
      }),
    });
  });
});

test.describe("BETA-GAP-14 — baseline de densidade da Biblioteca (medição)", () => {
  // Baseline exige sessão autenticada (storageState do globalSetup).
  test.skip(!E2E_FULL, "BETA-GAP-14 baseline requer E2E_FULL=1 (storageState)");

  test("desktop 1280x800 — medir cards e colunas", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/pt-BR/biblioteca");

    const seletorCards = '[data-testid="biblioteca-grid"] > *';
    await estabilizar(page, seletorCards);
    const cards = await medir(page, seletorCards);
    expect(cards.length, "esperado ao menos 1 card na biblioteca").toBeGreaterThan(0);

    // Colunas efetivas: conta x distintos (tolerância de 1px).
    const xs: number[] = [];
    for (const c of cards) {
      if (!xs.some((x) => Math.abs(x - c.x) <= TOL)) xs.push(c.x);
    }
    const colunas = xs.length;
    const gap = colunas > 1 ? Math.round(cards[1].x - (cards[0].x + cards[0].width)) : null;
    const larguraMedia =
      Math.round((cards.reduce((a, c) => a + c.width, 0) / cards.length) * 10) / 10;
    const alturaMedia =
      Math.round((cards.reduce((a, c) => a + c.height, 0) / cards.length) * 10) / 10;

    // Sanidade apenas (sem assert de densidade — fix é T109).
    expect(cards[0].width).toBeGreaterThan(0);
    expect(cards[0].height).toBeGreaterThan(0);
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientW = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollW, "sem overflow horizontal").toBeLessThanOrEqual(clientW + TOL);

    test.info().annotations.push({
      type: "baseline-biblioteca-desktop",
      description: JSON.stringify({
        nCards: cards.length,
        colunas,
        gap,
        larguraMedia,
        alturaMedia,
        primeiroCard: { w: Math.round(cards[0].width), h: Math.round(cards[0].height) },
      }),
    });
  });
});
