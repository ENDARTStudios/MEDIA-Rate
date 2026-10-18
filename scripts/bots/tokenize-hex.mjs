#!/usr/bin/env node
/* global console */
// BOT 3 — tokenizador de hex (D-660, continuação do audit:routes v2)
//
// Sobraram ~500 literais de cor em 27 componentes das rotas públicas. Trocar isso à mão,
// arquivo por arquivo, é onde nascem os erros de digitação silenciosos (o gate de contraste
// não vê `text-fg-primray`, e o Tailwind também não). Este bot faz o trabalho mecânico com
// um mapa explícito e audita o que NÃO mapeou.
//
// Regra de ouro: só substitui o padrão de valor arbitrário `-[#RRGGBB]` (classe Tailwind).
// `style={{ color: "#..." }}` e `text-white` NÃO são tocados — aparecem no relatório como
// "fora de classe" para decisão humana.
//
// Uso:
//   node scripts/bots/tokenize-hex.mjs                     # relatório, não escreve
//   node scripts/bots/tokenize-hex.mjs --write             # todas as rotas públicas
//   node scripts/bots/tokenize-hex.mjs --write --rotas=/biblioteca,/watchlist
//   node scripts/bots/tokenize-hex.mjs --json              # relatório legível por máquina
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const RAIZ = process.cwd();
const WEB = join(RAIZ, "apps/web");
const SRC = join(WEB, "src");
const APP = join(SRC, "app");

const argv = process.argv.slice(2);
const flag = (nome) => argv.find((a) => a === `--${nome}` || a.startsWith(`--${nome}=`));
const WRITE = Boolean(flag("write"));
const JSON_OUT = Boolean(flag("json"));
const ROTAS_FILTRO = (() => {
  const f = flag("rotas");
  if (!f || !f.includes("=")) return null;
  return new Set(
    f
      .split("=")[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
})();

/**
 * Mapa valor → token. Só entram valores com UM significado no produto; os ambíguos
 * ficam de fora de propósito (o relatório os lista).
 *
 * `#1B1B2C` e `#1C1C2E` são a mesma superfície com 1-2 unidades de diferença (ver
 * docs/03-development-process/REESTRUTURACAO-SITE.md); `#11111E` idem em relação ao card.
 * `#09090F` é o fundo da home (o token `surface.bg` é #05050A).
 */
const MAPA = new Map(
  Object.entries({
    "#F5F5F7": "fg-primary",
    "#A0A0B8": "fg-secondary",
    "#85859F": "fg-muted",
    "#4A4A60": "fg-disabled",
    "#12121C": "surface-card",
    "#11111E": "surface-card",
    "#2A2A3D": "surface-border",
    "#1B1B2C": "surface-elevated",
    "#1C1C2E": "surface-elevated",
    "#2A2A3E": "surface-border",
    "#09090F": "surface-bg",
    "#05050A": "surface-bg",
    "#0D0D14": "surface-bg",
    "#0D0D1A": "surface-bg",
    // Superfícies do protótipo do dashboard (D-586): o mapa oficial manda as variantes
    // de #11111B…#1A1A28 para card/elevated.
    "#11111B": "surface-card",
    "#12121F": "surface-card",
    "#151524": "surface-elevated",
    "#18152D": "surface-elevated",
    "#1A1A28": "surface-elevated",
    "#8B7CFF": "accent-indigo",
    "#A69CFF": "accent-violet",
    "#EF4444": "destructive",
    "#818CF8": "accent-indigo",
    "#A5B4FC": "accent-indigo-hover",
    "#A5B0FF": "accent-indigo-hover",
    "#38BDF8": "accent-sky",
    "#E11D48": "brand",
    "#C31442": "brand-hover",
    "#34D399": "accent-emerald",
    "#FBBF24": "accent-amber",
    "#F472B6": "accent-pink",
    "#A78BFA": "accent-violet",
    "#F87171": "score-low",
    "#F59E0B": "score-6",
    "#F97316": "score-5",
  }).map(([hex, token]) => [hex.toUpperCase(), token]),
);

/**
 * #0F172A é a tinta escura sobre fundo de acento e o token certo depende do fundo do
 * MESMO className (`accent-indigo-foreground`, `brand-foreground`, …). Por isso não
 * entra no mapa: é resolvido por linha, olhando o `bg-` vizinho.
 */
const TINTA = "#0F172A";
const FUNDO_POR_TOKEN = [
  ["accent-indigo", "accent-indigo-foreground"],
  ["accent-sky", "accent-sky-foreground"],
  ["accent-emerald", "accent-emerald-foreground"],
  ["accent-amber", "accent-amber-foreground"],
  ["accent-pink", "accent-pink-foreground"],
  ["accent-violet", "accent-violet-foreground"],
  ["brand", "brand-foreground"],
];

// ---------- descoberta de rotas + componentes ----------
const asPosix = (p) => p.split("\\").join("/");
const RX_IMPORT = /(?:from\s*|import\(\s*)["']([^"']+)["']/g;
const EXT = [".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts"];

const materializar = (base) => {
  for (const cand of [base, ...EXT.map((e) => base + e)]) {
    try {
      if (statSync(cand).isFile()) return cand;
    } catch {
      /* segue */
    }
  }
  return null;
};

const resolver = (de, spec) => {
  if (spec.startsWith("@/")) return materializar(join(SRC, spec.slice(2)));
  if (spec.startsWith("./") || spec.startsWith("../"))
    return materializar(join(dirname(de), spec));
  return null;
};

const rotas = [];
const andar = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) {
      andar(abs);
      continue;
    }
    if (e.name !== "page.tsx") continue;
    const rel = asPosix(relative(APP, dir)) || "/";
    const semLocale = rel.split("/").filter((p) => p !== "[locale]").join("/");
    if (/^(admin|dashboard)(\/|$)/.test(semLocale)) continue;
    rotas.push({ rota: "/" + semLocale.replace(/^\/+/, ""), abs });
  }
};
andar(APP);

/** Página + tudo que ela puxa de components/ (BFS até 4 níveis). */
const arquivosDa = (pageAbs) => {
  const vistos = new Set([pageAbs]);
  const out = [pageAbs];
  let fronteira = [pageAbs];
  for (let nivel = 0; nivel < 4 && fronteira.length; nivel++) {
    const proxima = [];
    for (const abs of fronteira) {
      const c = readFileSync(abs, "utf8");
      let m;
      while ((m = RX_IMPORT.exec(c)) !== null) {
        const alvo = resolver(abs, m[1]);
        if (!alvo || vistos.has(alvo)) continue;
        vistos.add(alvo);
        if (!asPosix(alvo).includes("/components/")) continue;
        out.push(alvo);
        proxima.push(alvo);
      }
      RX_IMPORT.lastIndex = 0;
    }
    fronteira = proxima;
  }
  return out;
};

// ---------- transformação ----------
const seletor = ROTAS_FILTRO ? rotas.filter((r) => ROTAS_FILTRO.has(r.rota)) : rotas;
const desconhecidas = ROTAS_FILTRO ? [...ROTAS_FILTRO].filter((r) => !rotas.some((x) => x.rota === r)) : [];
if (desconhecidas.length) {
  console.error(`  rotas inexistentes no filtro: ${desconhecidas.join(", ")}`);
  process.exit(2);
}

const porArquivo = new Map();
for (const r of seletor) {
  for (const abs of arquivosDa(r.abs)) {
    if (!porArquivo.has(abs)) porArquivo.set(abs, new Set());
    porArquivo.get(abs).add(r.rota);
  }
}

const RX_CLASSE = /-\[#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})\]/g;

const tintaDa = (linha) => {
  for (const [fundo, tinta] of FUNDO_POR_TOKEN) {
    // `bg-accent-indigo` / `bg-accent-indigo/90` — mas não `bg-accent-indigo-hover`.
    if (new RegExp(`bg-${fundo}(?![a-z-])`).test(linha)) return tinta;
  }
  if (/bg-\[#818CF8\]/.test(linha)) return "accent-indigo-foreground";
  if (/bg-\[#38BDF8\]/.test(linha)) return "accent-sky-foreground";
  if (/bg-\[#E11D48\]/.test(linha)) return "brand-foreground";
  if (/bg-\[#34D399\]/.test(linha)) return "accent-emerald-foreground";
  if (/bg-\[#FBBF24\]/.test(linha)) return "accent-amber-foreground";
  if (/bg-\[#F472B6\]/.test(linha)) return "accent-pink-foreground";
  if (/bg-\[#A78BFA\]/.test(linha)) return "accent-violet-foreground";
  return null;
};

const transformar = (texto) => {
  const trocados = new Map();
  const sobras = [];
  const linhas = texto.split("\n").map((linha, i) => {
    let nova = linha.replace(RX_CLASSE, (m, hex) => {
      const chave = `#${hex.toUpperCase()}`;
      const token = MAPA.get(chave);
      if (!token) {
        sobras.push({ linha: i + 1, hex: m, motivo: "fora do mapa" });
        return m;
      }
      trocados.set(chave, (trocados.get(chave) ?? 0) + 1);
      return `-${token}`;
    });
    // tinta escura sobre acento: resolve pelo fundo da MESMA className
    if (nova.includes(TINTA)) {
      const tinta = tintaDa(nova);
      if (tinta) {
        const antes = nova;
        nova = nova.split(`-[${TINTA}]`).join(`-${tinta}`);
        if (nova !== antes) trocados.set(TINTA, (trocados.get(TINTA) ?? 0) + 1);
      } else {
        sobras.push({ linha: i + 1, hex: TINTA, motivo: "tinta sem fundo de acento na linha" });
      }
    }
    if (/style=\{\{[^}]*#[0-9A-Fa-f]{3,6}/.test(nova)) {
      sobras.push({ linha: i + 1, hex: "style inline", motivo: "cor em objeto de estilo" });
    }
    if (/text-white\b|bg-white\b|text-black\b|bg-black\b/.test(nova)) {
      sobras.push({ linha: i + 1, hex: "white/black", motivo: "cor nomeada" });
    }
    return nova;
  });
  return { novo: linhas.join("\n"), trocados, sobras };
};

// ---------- execução ----------
const relatorio = [];
let totalTrocado = 0;
for (const [abs, rotasDoArquivo] of [...porArquivo.entries()].sort()) {
  const original = readFileSync(abs, "utf8");
  const { novo, trocados, sobras } = transformar(original);
  const n = [...trocados.values()].reduce((s, x) => s + x, 0);
  totalTrocado += n;
  const rel = asPosix(relative(WEB, abs));
  relatorio.push({ arquivo: rel, rotas: [...rotasDoArquivo].sort(), trocados: Object.fromEntries(trocados), total: n, sobras });
  if (WRITE && novo !== original) writeFileSync(abs, novo);
}

const sobrasTotais = relatorio.flatMap((r) => r.sobras.map((s) => ({ arquivo: r.arquivo, ...s })));

if (JSON_OUT) {
  console.log(JSON.stringify({ write: WRITE, rotas: seletor.map((r) => r.rota), totalTrocado, relatorio, sobrasTotais }, null, 2));
  process.exit(0);
}

const pad = (s, n) => String(s).padEnd(n);
console.log(`\n  ${seletor.length} rota(s) · ${porArquivo.size} arquivo(s) · ${WRITE ? "ESCREVENDO" : "dry-run"}`);
console.log(`  ${totalTrocado} valor(es) de classe trocado(s) por token\n`);
for (const r of relatorio.filter((x) => x.total > 0 || x.sobras.length > 0)) {
  const pares = Object.entries(r.trocados)
    .map(([h, c]) => `${h}→${MAPA.get(h) ?? "tinta"}×${c}`)
    .join(" ");
  console.log(`  ${pad(r.arquivo, 56)} ${pad(r.rotas.join(","), 26)} ${pares}`);
  for (const s of r.sobras) console.log(`      ! linha ${s.linha}: ${s.hex} — ${s.motivo}`);
}
console.log(
  `\n  sobras para decisão humana: ${sobrasTotais.length} (style inline, white/black, valores fora do mapa)\n`,
);
