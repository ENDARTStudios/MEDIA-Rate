#!/usr/bin/env node
/**
 * design-hex-census (D-584) — gate advisory contra NOVO drift de cor.
 *
 * Contexto (auditoria de UI/UX, D-582/D-584): `design-tokens.ts` é a fonte
 * declarada, mas o app tem ~2.190 hex literais em `src/`, dos quais ~1.000 usam
 * valores que NÃO existem em nenhuma fonte de token. Não havia nenhuma barreira
 * contra introduzir mais um: `design:detect` é advisory e cobre os tokens, não os
 * literais em JSX.
 *
 * Este script NÃO bloqueia o legado (seria um PR de mil linhas): ele congela o
 * conjunto atual de valores fora de token num baseline versionado e falha
 * (exit 2) apenas quando um valor NOVO aparece. Assim o drift para de crescer sem
 * exigir a migração de uma vez.
 *
 * Uso:
 *   node apps/web/scripts/design-hex-census.mjs            # verifica
 *   node apps/web/scripts/design-hex-census.mjs --update    # regrava o baseline
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, "..");
const SRC = join(APP, "src");
const BASELINE = join(HERE, "hex-baseline.json");

/** Fontes canônicas: qualquer hex declarado aqui é "tokenizado". */
const FONTES_TOKEN = [
  join(SRC, "lib", "design-tokens.ts"),
  // D-586: a paleta legada do dashboard é declarada em um módulo único (fonte),
  // mesmo não sendo design system — o valor literal existe lá, uma vez.
  join(SRC, "lib", "dashboard-palette.ts"),
  join(SRC, "app", "globals.css"),
  join(APP, "tailwind.config.ts"),
];

const HEX = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;

function arquivos(dir) {
  const out = [];
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) out.push(...arquivos(p));
    else if (/\.(tsx?|css)$/.test(nome)) out.push(p);
  }
  return out;
}

function valoresDe(arquivos) {
  const mapa = new Map();
  for (const f of arquivos) {
    const texto = readFileSync(f, "utf8");
    for (const m of texto.match(HEX) ?? []) {
      const v = m.toUpperCase();
      const atual = mapa.get(v) ?? { total: 0, arquivos: new Set() };
      atual.total += 1;
      atual.arquivos.add(relative(APP, f).replace(/\\/g, "/"));
      mapa.set(v, atual);
    }
  }
  return mapa;
}

const tokens = new Set();
for (const f of FONTES_TOKEN) {
  if (!existsSync(f)) continue;
  const achados = readFileSync(f, "utf8").match(HEX) ?? [];
  // globals.css define os tokens em rgb()/var — hex aqui são as superfícies fixas.
  for (const h of achados) tokens.add(h.toUpperCase());
}

const todos = valoresDe(arquivos(SRC));
const foraDeToken = new Map([...todos].filter(([v]) => !tokens.has(v)));

const atual = Object.fromEntries(
  [...foraDeToken]
    .map(([v, info]) => [v, info.total])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
);

if (process.argv.includes("--update")) {
  writeFileSync(
    BASELINE,
    JSON.stringify(
      {
        // Regenerado por `npm run design:hex -- --update`. Não editar à mão.
        geradoEm: new Date().toISOString().slice(0, 10),
        totalOcorrencias: Object.values(atual).reduce((s, n) => s + n, 0),
        valoresForaDeToken: atual,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `design-hex-census: baseline gravado — ${Object.keys(atual).length} valores fora de token, ` +
      `${Object.values(atual).reduce((s, n) => s + n, 0)} ocorrências em apps/web/src`,
  );
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.error("design-hex-census: baseline ausente — rode com --update primeiro.");
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(BASELINE, "utf8")).valoresForaDeToken ?? {};
const novos = Object.keys(atual).filter((v) => !(v in baseline));
const totalAtual = Object.values(atual).reduce((s, n) => s + n, 0);
const totalBase = Object.values(baseline).reduce((s, n) => s + n, 0);
const crescimento = totalAtual - totalBase;

if (novos.length > 0) {
  console.error(
    `design-hex-census: ${novos.length} valor(es) de cor NOVO(s) fora de token — ` +
      "use um token de src/lib/design-tokens.ts (ou registre a exceção com justificativa):",
  );
  for (const v of novos) {
    const info = foraDeToken.get(v);
    console.error(`  ${v}  ${info.total}x  ${[...info.arquivos].slice(0, 3).join(", ")}`);
  }
  console.error(
    "\nSe a cor é legítima e nova, registre a decisão e rode: npm run design:hex -- --update",
  );
  process.exit(2);
}

console.log(
  `design-hex-census: OK — nenhum hex novo fora de token ` +
    `(${Object.keys(atual).length} valores legados, ${totalAtual} ocorrências` +
    `${crescimento !== 0 ? `, ${crescimento > 0 ? "+" : ""}${crescimento} vs baseline` : ""})`,
);
