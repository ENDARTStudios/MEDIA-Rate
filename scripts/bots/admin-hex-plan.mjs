#!/usr/bin/env node
/* global console */
// BOT 4 — plano de varredura do hex no admin/dashboard (D-586), SEM escrever nada.
//
// A paleta legada do protótipo do dashboard (`dash-*`) está congelada de propósito, e o
// próprio tailwind.config.ts já traz o mapa oficial valor -> token mais próximo. Este bot
// percorre as rotas de /admin e /dashboard, agrupa os hex por valor, aplica o mapa e mede
// a DIFERENÇA em RGB de cada consolidação — para a decisão de descongelar ser tomada com
// números, não com "é quase igual".
//
// Uso: node scripts/bots/admin-hex-plan.mjs [--json]
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const RAIZ = process.cwd();
const WEB = join(RAIZ, "apps/web");
const SRC = join(WEB, "src");
const APP = join(SRC, "app");

/** Mapa D-586: valor do protótipo -> token canônico (mesma tabela do tokenize-hex). */
const MAPA = new Map(
  Object.entries({
    "#11111B": "surface-card",
    "#11111E": "surface-card",
    "#151524": "surface-elevated",
    "#151522": "surface-elevated",
    "#181827": "surface-elevated",
    "#1A1A28": "surface-elevated",
    "#1C1C2E": "surface-elevated",
    "#0D0D1A": "surface-bg",
    "#09090F": "surface-bg",
    "#9693A8": "fg-muted",
    "#8B8BA0": "fg-muted",
    "#F2C36B": "accent-amber",
    "#9B8CFF": "accent-violet",
    "#B9B0FF": "accent-violet",
    "#4DB6FF": "accent-sky",
    "#FF7F66": "score-low",
    "#FF9A86": "score-low",
    // Valores que JÁ são token (aparecem no admin como literal): identidade, Δ = 0.
    "#34D399": "accent-emerald",
    "#818CF8": "accent-indigo",
    "#0F172A": "ink",
    "#2A2A3D": "surface-border",
    "#E11D48": "brand",
    "#C31442": "brand-hover",
    "#A5B4FC": "accent-indigo-hover",
    "#38BDF8": "accent-sky",
    "#F87171": "score-low",
    "#FBBF24": "accent-amber",
    // Aprovadas pelo Operador (2026-10-19) depois da tabela de Δ por canal. As de
    // Δ > 0 estão aqui porque a troca foi autorizada explicitamente; as de Δ = 0
    // já entraram na varredura mecânica.
    "#8B7CFF": "accent-indigo",
    "#A69CFF": "accent-violet",
    "#C9C4FF": "accent-indigo-hover",
    "#0D0D14": "accent-indigo-foreground",
    "#0B0B12": "surface-bg",
    "#171725": "surface-elevated",
    "#18152D": "surface-elevated",
    "#12121F": "surface-card",
    "#111C2B": "surface-elevated",
    "#62D7C5": "accent-teal",
  }).map(([h, t]) => [h.toUpperCase(), t]),
);

/**
 * Valor final de cada token. Tabela literal de propósito: parsear o
 * `tailwind.config.ts` casa primeiro com as cores do shadcn (`card: "hsl(var(...))"`)
 * e devolve null — foi o bug da primeira versão deste bot. O teste
 * `test/conceito-rotas.spec.ts` já guarda a existência dos tokens no fonte.
 */
const TOKEN_RGB = new Map(
  Object.entries({
    "surface-bg": "#05050A",
    "surface-card": "#12121C",
    "surface-elevated": "#1B1B2C",
    "surface-border": "#2A2A3D",
    "surface-border-hover": "#3A3A52",
    "fg-primary": "#F5F5F7",
    "fg-secondary": "#A0A0B8",
    "fg-muted": "#85859F",
    "fg-disabled": "#4A4A60",
    "ink": "#0F172A",
    "accent-indigo": "#818CF8",
    "accent-indigo-hover": "#A5B4FC",
    "accent-indigo-foreground": "#0F172A",
    "accent-teal": "#62D7C5",
    "accent-violet": "#A78BFA",
    "accent-sky": "#38BDF8",
    "accent-emerald": "#34D399",
    "accent-amber": "#FBBF24",
    "accent-pink": "#F472B6",
    "accent-audience": "#E11D48",
    "accent-brand": "#E11D48",
    "brand": "#E11D48",
    "brand-hover": "#C31442",
    "score-low": "#F87171",
  }),
);

const rgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

/** Distância máxima por canal — simples de explicar e suficiente para "dá para ver?". */
const delta = (a, b) => {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return Math.max(Math.abs(r1 - r2), Math.abs(g1 - g2), Math.abs(b1 - b2));
};

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
  if (spec.startsWith("./") || spec.startsWith("../")) return materializar(join(dirname(de), spec));
  return null;
};

// rotas de /admin e /dashboard
const rotas = [];
const andar = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) {
      andar(abs);
      continue;
    }
    if (e.name !== "page.tsx") continue;
    const rel = asPosix(relative(APP, dir));
    if (!/\[locale\]\/(admin|dashboard)(\/|$)/.test(rel)) continue;
    rotas.push({ rota: rel.replace("[locale]", ""), abs });
  }
};
andar(APP);

const arquivos = new Set();
for (const r of rotas) {
  const vistos = new Set([r.abs]);
  let fronteira = [r.abs];
  arquivos.add(r.abs);
  for (let nivel = 0; nivel < 4 && fronteira.length; nivel++) {
    const proxima = [];
    for (const f of fronteira) {
      RX_IMPORT.lastIndex = 0;
      let m;
      const fonte = readFileSync(f, "utf8");
      while ((m = RX_IMPORT.exec(fonte)) !== null) {
        const alvo = resolver(f, m[1]);
        if (!alvo || vistos.has(alvo)) continue;
        vistos.add(alvo);
        if (!asPosix(alvo).includes("/components/")) continue;
        arquivos.add(alvo);
        proxima.push(alvo);
      }
    }
    fronteira = proxima;
  }
}

const ocorrencias = new Map();
for (const f of arquivos) {
  const fonte = readFileSync(f, "utf8");
  for (const hex of fonte.match(/#[0-9A-Fa-f]{6}\b/g) ?? []) {
    const v = hex.toUpperCase();
    const atual = ocorrencias.get(v) ?? { total: 0, arquivos: new Set() };
    atual.total += 1;
    atual.arquivos.add(asPosix(relative(WEB, f)));
    ocorrencias.set(v, atual);
  }
}

const linhas = [...ocorrencias.entries()]
  .map(([hex, info]) => {
    const token = MAPA.get(hex) ?? null;
    const destino = token ? (TOKEN_RGB.get(token) ?? null) : null;
    return {
      hex,
      total: info.total,
      arquivos: info.arquivos.size,
      token,
      destino,
      delta: destino ? delta(hex, destino) : null,
    };
  })
  .sort((a, b) => b.total - a.total);

/**
 * Dois modos de escrita:
 * - `--write-identity`: só as trocas com Δ = 0 (mesmo valor escrito como literal).
 *   É dívida pura: nenhum pixel muda, então não precisa de decisão de design.
 * - `--write-all`: todas as mapeadas, inclusive as de Δ > 0 — só depois de o
 *   Operador aprovar a tabela de diferença por canal.
 */
const modoIdentidade = process.argv.includes("--write-identity");
const modoTodas = process.argv.includes("--write-all");
if (modoIdentidade || modoTodas) {
  const alvo = new Map(
    linhas.filter((l) => l.token && (modoTodas || l.delta === 0)).map((l) => [l.hex, l.token]),
  );
  let trocas = 0;
  let arquivosTocados = 0;
  for (const f of arquivos) {
    const original = readFileSync(f, "utf8");
    const novo = original.replace(/-\[#([0-9A-Fa-f]{6})\]/g, (m, hex) => {
      const token = alvo.get(`#${hex.toUpperCase()}`);
      if (!token) return m;
      trocas += 1;
      return `-${token}`;
    });
    if (novo !== original) {
      writeFileSync(f, novo);
      arquivosTocados += 1;
    }
  }
  const escopo = modoTodas ? "Δ qualquer (aprovado)" : "só Δ = 0";
  console.log(
    `\n  ${modoTodas ? "--write-all" : "--write-identity"}: ${trocas} troca(s) em ${arquivosTocados} arquivo(s) — ${escopo}\n`,
  );
}

if (process.argv.includes("--json")) {
  console.log(
    JSON.stringify({ rotas: rotas.length, arquivos: arquivos.size, valores: linhas }, null, 2),
  );
  process.exit(0);
}

const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);
console.log(
  `\n  ${rotas.length} rotas de admin/dashboard · ${arquivos.size} arquivos · ${linhas.length} valores distintos\n`,
);
console.log(
  `  ${pad("valor", 9)} ${padL("usos", 5)} ${padL("arq", 4)}  ${pad("token proposto", 24)} ${pad("valor do token", 9)} ${padL("Δmax", 5)}  percepcao`,
);
console.log(`  ${"-".repeat(92)}`);
for (const l of linhas) {
  const percepcao =
    l.delta == null
      ? "SEM MAPA"
      : l.delta === 0
        ? "identico"
        : l.delta <= 4
          ? "imperceptivel"
          : l.delta <= 12
            ? "sutil"
            : "visivel";
  console.log(
    `  ${pad(l.hex, 9)} ${padL(l.total, 5)} ${padL(l.arquivos, 4)}  ${pad(l.token ?? "—", 24)} ${pad(l.destino ?? "—", 9)} ${padL(l.delta ?? "—", 5)}  ${percepcao}`,
  );
}

const semMapa = linhas.filter((l) => l.token == null);
const custo = linhas.filter((l) => l.delta != null);
console.log(
  `\n  ${custo.reduce((s, l) => s + l.total, 0)} ocorrencia(s) mapeadas · ${semMapa.reduce((s, l) => s + l.total, 0)} sem mapa (${semMapa.length} valores)`,
);
if (semMapa.length)
  console.log(`  sem mapa: ${semMapa.map((l) => `${l.hex}(${l.total})`).join(", ")}`);
console.log("");
