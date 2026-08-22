/* eslint-disable */
// audit-crawl.cjs (T403) — auditoria profunda de produção: crawl das páginas
// públicas + privadas (usuário de teste), captura de console/network/SEO e
// screenshots desktop+mobile. Saída: docs/auditoria/achados.json.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "..", "..", "docs", "auditoria");
fs.mkdirSync(OUT, { recursive: true });
const BASE = "https://mediarate.app";
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "Senha@123";

const PAGES = [
  { path: "/pt-BR", nome: "home-pt" },
  { path: "/en-US", nome: "home-en" },
  { path: "/es-ES", nome: "home-es" },
  { path: "/pt-BR/catalog", nome: "catalog-pt" },
  { path: "/pt-BR/catalog?type=movie", nome: "catalog-movie" },
  { path: "/pt-BR/media/o-enigma-de-outro-mundo", nome: "detail-filme" },
  { path: "/pt-BR/media/baldur-s-gate-3", nome: "detail-game" },
  { path: "/pt-BR/media/watchmen", nome: "detail-comic" },
  { path: "/pt-BR/media/berserk", nome: "detail-manga" },
  { path: "/pt-BR/pricing", nome: "pricing" },
  { path: "/pt-BR/login", nome: "login" },
  { path: "/pt-BR/register", nome: "register" },
  { path: "/pt-BR/sources", nome: "sources" },
  { path: "/pt-BR/methodology", nome: "methodology" },
  { path: "/pt-BR/privacy", nome: "privacy" },
  { path: "/pt-BR/terms", nome: "terms" },
];

const achados = [];

async function auditarPagina(page, ctx, p) {
  const consoleErros = [];
  const consoleWarnings = [];
  const redeFalha = [];
  const redeLenta = [];
  const inicio = Date.now();

  ctx.on("console", (msg) => {
    if (msg.type() === "error") consoleErros.push(msg.text().slice(0, 300));
    if (msg.type() === "warning") consoleWarnings.push(msg.text().slice(0, 200));
  });
  ctx.on("requestfailed", (req) => {
    redeFalha.push(`${req.method()} ${req.url().slice(0, 160)} ${req.failure()?.errorText ?? ""}`);
  });
  ctx.on("response", (res) => {
    const t = Date.now() - inicio;
    if (t > 3000 && res.status() < 400) {
      redeLenta.push(`${t}ms ${res.status()} ${res.url().slice(0, 160)}`);
    }
    if (res.status() >= 400) {
      redeFalha.push(`${res.status()} ${res.url().slice(0, 160)}`);
    }
  });

  let seo = {};
  try {
    await page.goto(BASE + p.path, { waitUntil: "networkidle", timeout: 40000 });
    seo = await page.evaluate(() => {
      const q = (sel) => document.querySelector(sel);
      const meta = (name) => q(`meta[name="${name}"]`)?.content ?? null;
      const prop = (name) => q(`meta[property="${name}"]`)?.content ?? null;
      const links = [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map(
        (l) => `${l.getAttribute("hreflang")}:${l.getAttribute("href")}`,
      );
      return {
        title: document.title,
        h1: q("h1")?.textContent?.trim().slice(0, 120) ?? null,
        canonical: q('link[rel="canonical"]')?.href ?? null,
        description: meta("description"),
        ogTitle: prop("og:title"),
        ogImage: prop("og:image"),
        ogType: prop("og:type"),
        twitterCard: meta("twitter:card"),
        hreflang: links,
        jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].length,
        lang: document.documentElement.lang,
      };
    });
  } catch (e) {
    seo = { erro: String(e.message).slice(0, 200) };
  }

  // Screenshots desktop+mobile apenas para páginas-chave.
  if (p.nome.startsWith("home") || p.nome.startsWith("catalog") || p.nome.startsWith("detail") || p.nome === "pricing") {
    try {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.screenshot({ path: path.join(OUT, `${p.nome}-desktop.png`) });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: path.join(OUT, `${p.nome}-mobile.png`) });
    } catch (e) {
      achados.push({ severidade: "P3", pagina: p.path, achado: `screenshot falhou: ${e.message.slice(0, 120)}` });
    }
  }

  achados.push({
    pagina: p.path,
    titulo: seo.title ?? null,
    h1: seo.h1 ?? null,
    consoleErros,
    consoleWarnings,
    redeFalha,
    redeLenta: redeLenta.slice(0, 10),
    seo,
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  // ---- páginas públicas -------------------------------------------------
  for (const p of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await auditarPagina(page, ctx, p);
    await ctx.close();
  }

  // ---- páginas privadas (login com usuário de teste) -------------------
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/pt-BR/login`, { waitUntil: "networkidle", timeout: 30000 });
    await page.locator('input[name="email"]').first().fill("free@mediarate.test");
    await page.locator('input[name="password"]').first().fill(PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/(welcome|dashboard)$/, { timeout: 15000 });
    for (const p of [
      { path: "/pt-BR/dashboard", nome: "dashboard" },
      { path: "/pt-BR/watchlist", nome: "watchlist" },
    ]) {
      await auditarPagina(page, ctx, p);
    }
  } catch (e) {
    achados.push({ severidade: "P1", pagina: "/login", achado: `fluxo autenticado falhou: ${e.message.slice(0, 160)}` });
  }
  await ctx.close();
  await browser.close();

  fs.writeFileSync(path.join(OUT, "achados.json"), JSON.stringify(achados, null, 2));
  const totalErros = achados.reduce((n, a) => n + (a.consoleErros?.length ?? 0), 0);
  const totalFalhas = achados.reduce((n, a) => n + (a.redeFalha?.length ?? 0), 0);
  console.log(`[audit] paginas=${achados.length} console_errors=${totalErros} requests_falhos=${totalFalhas}`);
  console.log(`[audit] saida: ${path.join(OUT, "achados.json")}`);
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
