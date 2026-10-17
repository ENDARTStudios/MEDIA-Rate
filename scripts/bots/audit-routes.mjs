#!/usr/bin/env node
/* global console */
// BOT 1 — auditor de rotas (D-660)
// Existe porque um levantamento igual feito em PowerShell falhou duas vezes: o
// [locale] no caminho e classe de caracteres do PowerShell e todo Get-Content
// morria em silencio. Em Node nao existe esse problema.
// Mede cada rota contra o conceito da home: usa os tokens? tem hex cru fora de
// token? usa rounded-2xl (anti-padrao D-065)? e client? tem um h1?
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const RAIZ = process.cwd();
const APP = join(RAIZ, "apps/web/src/app");
const rotas = [];
const anda = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) {
      anda(abs);
      continue;
    }
    if (e.name !== "page.tsx") continue;
    const rel = relative(APP, dir).replace(/\\/g, "/") || "/";
    const semLocale = rel.replace(/^\[locale\]\/?/, "");
    if (/^(admin|dashboard)(\/|$)/.test(semLocale)) continue;
    rotas.push({ rota: rel.replace(/^\[locale\]/, "") || "/", abs });
  }
};
anda(APP);

const medir = ({ rota, abs }) => {
  const c = readFileSync(abs, "utf8");
  const conta = (re) => (c.match(re) ?? []).length;
  return {
    rota,
    tokens: conta(
      /surface-card|surface-border|fg-primary|fg-secondary|text-fg-|font-heading|bg-surface/g,
    ),
    hexCru: conta(/#[0-9A-Fa-f]{6}\b/g),
    r2xl: conta(/rounded-2xl/g),
    h1: conta(/<h1\b/g),
    client: /^"use client"/m.test(c) ? "sim" : "nao",
    i18n: /useTranslations|getTranslations/.test(c) ? "sim" : "nao",
    linhas: c.split("\n").length,
  };
};

const dados = rotas.map(medir).sort((a, b) => a.tokens - b.tokens || b.hexCru - a.hexCru);
const pad = (s, n) => String(s).padEnd(n);
console.log(
  `\n  ${rotas.length} rotas publicas — ordenadas por ADESAO AO CONCEITO (pior primeiro)\n`,
);
console.log(
  `  ${pad("rota", 34)} ${pad("tokens", 7)} ${pad("hex", 5)} ${pad("r2xl", 5)} ${pad("h1", 4)} ${pad("client", 7)} ${pad("i18n", 5)} linhas`,
);
console.log(`  ${"-".repeat(82)}`);
for (const d of dados)
  console.log(
    `  ${pad(d.rota, 34)} ${pad(d.tokens, 7)} ${pad(d.hexCru, 5)} ${pad(d.r2xl, 5)} ${pad(d.h1, 4)} ${pad(d.client, 7)} ${pad(d.i18n, 5)} ${d.linhas}`,
  );

const semToken = dados.filter((d) => d.tokens === 0);
const semH1 = dados.filter((d) => d.h1 === 0);
const comR2xl = dados.filter((d) => d.r2xl > 0);
console.log(
  `\n  ZERO token do conceito (${semToken.length}): ${semToken.map((d) => d.rota).join(", ") || "-"}`,
);
console.log(`  SEM <h1> (${semH1.length}): ${semH1.map((d) => d.rota).join(", ") || "-"}`);
console.log(
  `  COM rounded-2xl, anti-padrao D-065 (${comR2xl.length}): ${comR2xl.map((d) => d.rota).join(", ") || "-"}`,
);
console.log(`  hex cru total: ${dados.reduce((s, d) => s + d.hexCru, 0)} ocorrencia(s)\n`);
