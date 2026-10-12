#!/usr/bin/env node
/**
 * visual-qa.mjs — harness de evidência visual do MEDIA Rate (Playwright).
 *
 * Para cada viewport (e locale) captura screenshot full-page, mede overflow
 * horizontal, presença/visibilidade do H1 (`#hero-title`), posição do CTA
 * primário em relação à dobra (1366×768), alvos de toque < 44 px e, com --axe,
 * violações WCAG A/AA.
 *
 * Uso:
 *   node .zcode/skills/visual-qa/scripts/visual-qa.mjs --base-url http://localhost:3000 [flags]
 *
 * Flags:
 *   --base-url <url>        default http://localhost:3000
 *   --path <path>           default /{locale} — use {locale} para variar por locale
 *   --locales a,b,c         default pt-BR   (gera um diretório por locale)
 *   --viewports w x h,...   default 1440x900,1024x768,768x1024,375x812
 *   --axe                   roda @axe-core/playwright (wcag2a + wcag2aa)
 *   --scope <selector>      limita o axe a um recorte (ex.: a hero) — útil para
 *                           separar débito pré-existente da página do que é novo
 *   --out <dir>             default .dsh-artifacts/visual-qa/<timestamp>
 *   --settle <ms>           espera antes de medir/capturar (default 2200) —
 *                           precisa cobrir a hidratação + animação de entrada
 *   --headed                abre o browser
 *
 * Exit 1 se: overflow horizontal, H1 ausente/invisível, CTA primário abaixo da
 * dobra em >=1366 px, pageerror, ou violação axe (com --axe).
 *
 * Requer Playwright instalado (devDependency do monorepo) e um servidor web vivo.
 * Nunca aponte para produção com usuários reais — ver skill media-rate-conventions.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    if (key === "axe" || key === "headed") flags[key] = true;
    else flags[key] = argv[++i];
  }
  return flags;
}

const flags = parseArgs(process.argv.slice(2));
const settleMs = Number(flags.settle ?? 2200);
const baseUrl = (flags["base-url"] ?? "http://localhost:3000").replace(/\/$/, "");
const path = flags.path ?? "/{locale}";
const locales = (flags.locales ?? "pt-BR").split(",").map((s) => s.trim());
const viewports = (flags.viewports ?? "1440x900,1024x768,768x1024,375x812")
  .split(",")
  .map((v) => {
    const [w, h] = v.trim().split("x").map(Number);
    return { width: w, height: h };
  });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = resolve(flags.out ?? `.dsh-artifacts/visual-qa/${stamp}`);
mkdirSync(outDir, { recursive: true });

const FOLD_WIDTH = 1366;

/** Medições no DOM. */
async function measure(page) {
  return page.evaluate(() => {
    const h1 = document.querySelector("#hero-title");
    const primaryCta = document.querySelector('[data-hero-cta="primary"]');
    const targets = Array.from(
      document.querySelectorAll('a[href], button:not([disabled]), [role="button"]'),
    )
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height) };
      })
      .filter((t) => t.w > 0 && t.h > 0);

    return {
      title: document.title,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      h1: h1
        ? {
            text: (h1.textContent ?? "").trim().slice(0, 120),
            top: Math.round(h1.getBoundingClientRect().top + window.scrollY),
            height: Math.round(h1.getBoundingClientRect().height),
          }
        : null,
      primaryCta: primaryCta
        ? {
            text: (primaryCta.textContent ?? "").trim(),
            top: Math.round(primaryCta.getBoundingClientRect().top + window.scrollY),
          }
        : null,
      smallTargets: targets.filter((t) => t.w < 44 || t.h < 44).length,
      totalTargets: targets.length,
      sourceChips: document.querySelectorAll("[data-source-chip]").length,
      categoryTiles: document.querySelectorAll("[data-category-tile]").length,
      // Diagnóstico de overflow: quem passa da largura do viewport.
      overflowing: Array.from(document.querySelectorAll("body *"))
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            tag: el.tagName.toLowerCase(),
            id: el.id || undefined,
            cls: (el.className && String(el.className).slice(0, 60)) || undefined,
            right: Math.round(r.right),
            width: Math.round(r.width),
          };
        })
        .filter((e) => e.width > 0 && e.right > document.documentElement.clientWidth + 1)
        .sort((a, b) => b.right - a.right)
        .slice(0, 6),
    };
  });
}

/** Fecha o banner de consentimento (LGPD) para a evidência não ficar coberta. */
async function dismissConsent(page) {
  const button = page
    .getByRole("button", { name: /^(Aceitar todos|Accept all|Aceptar todo)/i })
    .first();
  try {
    // O banner só monta depois da hidratação — esperar o botão, não o load.
    await button.waitFor({ state: "visible", timeout: 8000 });
    await button.click();
    await page.waitForTimeout(500);
    return true;
  } catch {
    return false; // sem banner (já consentido) ou rótulo diferente
  }
}

const browser = await chromium.launch({ headless: !flags.headed });
const report = { baseUrl, path, generatedAt: new Date().toISOString(), runs: [] };
const problems = [];

for (const locale of locales) {
  const url = `${baseUrl}${path.includes("{locale}") ? path.replace("{locale}", locale) : path}`;
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(String(e.message).slice(0, 200)));

    let metrics = null;
    let a11y = null;
    const label = `${locale}-${viewport.width}x${viewport.height}`;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      // 1) hidratação, 2) fecha o banner LGPD, 3) deixa a animação de entrada
      // terminar (senão a evidência registra os tiles em plena cascata).
      await page.waitForTimeout(1200);
      await dismissConsent(page);
      await page.waitForTimeout(settleMs);
      metrics = await measure(page);
      await page.screenshot({ path: `${outDir}/${label}.png`, fullPage: true });
      // Acima da dobra (viewport) + recorte da hero: são as evidências que o
      // review humano realmente olha (o full-page fica só como registro).
      await page.screenshot({ path: `${outDir}/${label}-fold.png`, fullPage: false });
      const hero = page.locator("section[aria-labelledby=hero-title]").first();
      if (await hero.count()) {
        await hero.screenshot({ path: `${outDir}/${label}-hero.png` });
      }

      if (flags.axe) {
        const { default: AxeBuilder } = await import("@axe-core/playwright");
        let builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]);
        if (flags.scope) builder = builder.include(flags.scope);
        const results = await builder.analyze();
        a11y = {
          violations: results.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.length,
            // Primeiros alvos: o suficiente para localizar o componente culpado.
            targets: v.nodes.slice(0, 5).map((n) => n.target.join(" ")),
            summary: v.nodes[0]?.failureSummary?.replace(/\s+/g, " ").slice(0, 200),
          })),
        };
      }

      // Passada com reduced-motion: nada pode desaparecer/deslocar.
      if (viewport.width === 1440) {
        const rmContext = await browser.newContext({
          viewport,
          reducedMotion: "reduce",
        });
        const rmPage = await rmContext.newPage();
        await rmPage.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
        await rmPage.waitForTimeout(1200);
        await dismissConsent(rmPage);
        await rmPage.waitForTimeout(Math.min(settleMs, 1200));
        await rmPage.screenshot({ path: `${outDir}/${label}-reduced-motion.png`, fullPage: true });
        await rmPage.screenshot({
          path: `${outDir}/${label}-reduced-motion-fold.png`,
          fullPage: false,
        });
        const rm = await measure(rmPage);
        report.runs.push({ label: `${label}-reduced-motion`, viewport, metrics: rm });
        if (!rm.h1) problems.push(`${label}: H1 ausente com reduced-motion`);
        if (rm.categoryTiles !== metrics.categoryTiles) {
          problems.push(
            `${label}: reduced-motion altera contagem de tiles (${rm.categoryTiles} vs ${metrics.categoryTiles})`,
          );
        }
        await rmContext.close();
      }
    } catch (error) {
      problems.push(`${label}: falha ao carregar ${url} — ${error.message.slice(0, 160)}`);
    }

    if (metrics) {
      if (metrics.scrollWidth > metrics.clientWidth + 1) {
        problems.push(
          `${label}: overflow horizontal (${metrics.scrollWidth}px > ${metrics.clientWidth}px)`,
        );
      }
      if (!metrics.h1 || metrics.h1.height === 0) problems.push(`${label}: #hero-title ausente`);
      if (viewport.width >= FOLD_WIDTH && metrics.primaryCta && metrics.primaryCta.top > viewport.height) {
        problems.push(
          `${label}: CTA primário abaixo da dobra (top ${metrics.primaryCta.top}px > ${viewport.height}px)`,
        );
      }
      if (a11y && a11y.violations.length > 0) {
        problems.push(
          `${label}: axe ${a11y.violations.map((v) => `${v.id}(${v.nodes})`).join(", ")}`,
        );
      }
    }
    if (pageErrors.length > 0) problems.push(`${label}: pageerror — ${pageErrors[0]}`);

    report.runs.push({ label, viewport, url, metrics, a11y, pageErrors });
    console.log(
      `[${label}] h1=${metrics?.h1 ? `"${metrics.h1.text.slice(0, 48)}…"` : "AUSENTE"} ` +
        `cta=${metrics?.primaryCta?.top ?? "-"}px tiles=${metrics?.categoryTiles ?? "-"} ` +
        `smallTargets=${metrics?.smallTargets ?? "-"}/${metrics?.totalTargets ?? "-"}`,
    );
    await context.close();
  }
}

await browser.close();

report.problems = problems;
writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2));

console.log(`\nArtefatos: ${outDir}`);
if (problems.length === 0) {
  console.log("Visual QA OK — sem overflow, H1 presente e CTA acima da dobra.");
  process.exit(0);
}
console.error("\nProblemas encontrados:");
for (const p of problems) console.error(`  - ${p}`);
process.exit(1);
