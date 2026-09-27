/**
 * BETA-GAP-13/14 (T108/T110) - medicao deterministica de layout.
 *
 * Planos: os 3 CTAs (`plan-cta-*`) devem ter MESMO y e MESMA altura (<=1px) e os
 * 3 cards (`plan-card-*`) a mesma altura (<=1px), em 1280x800 nos 3 locales.
 * Mobile 390x844: empilhados; offset (base do card - base do CTA) identico; CTA >= 40px.
 * Biblioteca: apenas MEDICAO/baseline (sem assert de densidade - BETA-GAP-14 na T111).
 *
 * Robustez (T110): `waitForFunction` confirmando bbox NAO NULO (w>0/h>0) de TODOS os
 * cards/CTAs antes de medir; `emulateMedia(reducedMotion: reduce)` neutraliza animacoes
 * do Motion/React; `scrollIntoViewIfNeeded` + `document.fonts.ready` + rAF duplo;
 * falha reporta INDICE + SELETOR exatos. Sem sleep arbitrario, sem skip/fixme/expect.soft.
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

/** Aguarda TODOS os seletores visiveis com bbox nao nulo (w>0, h>0). */
async function esperarEstavel(page: Page, seletores: string[]): Promise<void> {
  await page.waitForFunction(
    (sels: string[]) =>
      sels.every((s) => {
        const els = Array.from(document.querySelectorAll(s));
        if (els.length === 0) return false;
        return els.every((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
      }),
    seletores,
    { timeout: 15_000 },
  );
}

/** Estabiliza render: scroll, fontes e 2 rAF. */
async function estabilizar(page: Page, primeiro: string): Promise<void> {
  await page.locator(primeiro).first().scrollIntoViewIfNeeded();
  await page.evaluate(async () => {
    await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  });
}

async function medir(page: Page, seletor: string, rotulo: string): Promise<Caixa[]> {
  const itens = page.locator(seletor);
  const n = await itens.count();
  const caixas: Caixa[] = [];
  for (let i = 0; i < n; i += 1) {
    const b = await itens.nth(i).boundingBox();
    if (!b) throw new Error(`bbox nulo: ${rotulo}[${i}] (seletor ${seletor})`);
    caixas.push({ x: b.x, y: b.y, width: b.width, height: b.height });
  }
  return caixas;
}

function assertProximo(a: number, b: number, msg: string): void {
  expect(Math.abs(a - b), `${msg} (${a} vs ${b})`).toBeLessThanOrEqual(TOL);
}

const SEL_CARDS = '[data-testid^="plan-card-"]';
const SEL_CTAS = '[data-testid^="plan-cta-"]';

test.describe("BETA-GAP-13 - CTAs de Planos alinhados", () => {
  for (const locale of LOCALES) {
    test(`desktop 1280x800 - ${locale}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`/${locale}/pricing`);
      await esperarEstavel(page, [SEL_CARDS, SEL_CTAS]);
      await estabilizar(page, SEL_CARDS);

      const cards = await medir(page, SEL_CARDS, "card");
      const ctas = await medir(page, SEL_CTAS, "cta");
      expect(cards.length, "3 cards de plano").toBe(PLAN_IDS.length);
      expect(ctas.length, "3 CTAs de plano").toBe(PLAN_IDS.length);

      for (let i = 1; i < ctas.length; i += 1) {
        assertProximo(ctas[i].y, ctas[0].y, `y do CTA ${i} difere do 0`);
        assertProximo(ctas[i].height, ctas[0].height, `altura do CTA ${i} difere`);
      }
      for (let i = 1; i < cards.length; i += 1) {
        assertProximo(cards[i].height, cards[0].height, `altura do card ${i} difere`);
      }

      test.info().annotations.push({
        type: "medicao-planos-desktop",
        description: JSON.stringify({
          locale,
          ctaY: ctas.map((c) => Math.round(c.y)),
          ctaH: ctas.map((c) => Math.round(c.height)),
          cardH: cards.map((c) => Math.round(c.height)),
        }),
      });
    });
  }

  test("mobile 390x844 - empilhados e CTA >= 40px", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/pt-BR/pricing");
    await esperarEstavel(page, [SEL_CARDS]);
    await estabilizar(page, SEL_CARDS);

    const cards = await medir(page, SEL_CARDS, "card");
    const ctas = await medir(page, SEL_CTAS, "cta");
    expect(cards.length).toBe(PLAN_IDS.length);

    for (let i = 1; i < cards.length; i += 1) {
      expect(cards[i].y, "cards empilhados no mobile").toBeGreaterThan(cards[i - 1].y);
    }
    const offsets = cards.map((c, i) => c.y + c.height - (ctas[i].y + ctas[i].height));
    for (let i = 1; i < offsets.length; i += 1) {
      assertProximo(offsets[i], offsets[0], `offset CTA-card ${i} difere`);
    }
    for (const [i, cta] of ctas.entries()) {
      expect(cta.height, `CTA ${i} abaixo de 40px`).toBeGreaterThanOrEqual(40);
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

test.describe("BETA-GAP-14 - baseline de densidade da Biblioteca (medicao)", () => {
  test.skip(!E2E_FULL, "baseline requer E2E_FULL=1 (storageState)");

  test("desktop 1280x800 - medir cards e colunas", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/pt-BR/biblioteca");

    const seletorCards = '[data-testid="biblioteca-grid"] > *';
    await page.waitForSelector(seletorCards, { state: "visible" });
    await estabilizar(page, seletorCards);
    const cards = await medir(page, seletorCards, "card-biblioteca");
    expect(cards.length, "ao menos 1 card").toBeGreaterThan(0);

    const xs: number[] = [];
    for (const c of cards) if (!xs.some((x) => Math.abs(x - c.x) <= TOL)) xs.push(c.x);
    const colunas = xs.length;
    const gap = colunas > 1 ? Math.round(cards[1].x - (cards[0].x + cards[0].width)) : null;
    const larguraMedia =
      Math.round((cards.reduce((a, c) => a + c.width, 0) / cards.length) * 10) / 10;
    const alturaMedia =
      Math.round((cards.reduce((a, c) => a + c.height, 0) / cards.length) * 10) / 10;

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
