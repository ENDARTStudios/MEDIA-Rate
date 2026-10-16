#!/usr/bin/env node
/**
 * contrast-audit.mjs — auditoria WCAG 2.1 de contraste dos tokens REAIS do
 * MEDIA Rate.
 *
 * Lê `apps/web/src/lib/design-tokens.ts` (fonte única) e extrai os blocos
 * canônicos (`media`, `text`, `score`, `accent`, superfícies), calculando a
 * razão de contraste de cada par usado como TEXTO/ícone informativo sobre as
 * superfícies escuras do app.
 *
 * Limites: 4.5:1 para texto normal; 3:1 para texto grande e ícone informativo
 * (WCAG 2.1 SC 1.4.3 / 1.4.11).
 *
 * Uso (de qualquer diretório):
 *   node .zcode/skills/design-review/scripts/contrast-audit.mjs [--json] [--strict]
 *
 * Exit code 1 quando algum par OBRIGATÓRIO reprova. Pares de superfície
 * "elevado" (`#1B1B2C`) entram como DÉBITO quando o token muted fica no fio
 * (4.42:1) — débito pré-existente do design system, reportado mas não
 * bloqueante; use `--strict` para tratá-lo como falha.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..", "..", "..");
const TOKENS = join(REPO, "apps", "web", "src", "lib", "design-tokens.ts");

const AA_TEXT = 4.5;
const AA_LARGE = 3;

const src = readFileSync(TOKENS, "utf8");

/** Extrai um bloco `nome: { ... }` balanceando chaves. */
function block(name) {
  const start = src.indexOf(`${name}: {`);
  if (start === -1) throw new Error(`token ausente: ${name}`);
  let depth = 0;
  let i = src.indexOf("{", start);
  const from = i;
  for (; i < src.length; i += 1) {
    if (src[i] === "{") depth += 1;
    else if (src[i] === "}") {
      depth -= 1;
      if (depth === 0) return src.slice(from, i + 1);
    }
  }
  throw new Error(`bloco não fechado: ${name}`);
}

/** Mapa chave→hex de um bloco raso `{ a: "#111111", ... }`. */
function hexMap(name) {
  const out = {};
  for (const m of block(name).matchAll(/([A-Za-z0-9_]+)\s*:\s*"(#[0-9A-Fa-f]{6})"/g)) {
    out[m[1]] = m[2];
  }
  return out;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const colors = {
  bg: src.match(/\bbg:\s*"(#[0-9A-Fa-f]{6})"/)?.[1],
  cb: src.match(/\bcb:\s*"(#[0-9A-Fa-f]{6})"/)?.[1],
  ce: src.match(/\bce:\s*"(#[0-9A-Fa-f]{6})"/)?.[1],
};
const media = hexMap("media");
const text = hexMap("text");
const score = hexMap("score");

if (!colors.bg || !colors.cb || !colors.ce) throw new Error("superfícies não extraídas");

const checks = [];

function check(group, label, fg, bg, min, advisory = false) {
  checks.push({ group, label, fg, bg, min, advisory, ratio: ratio(fg, bg) });
}

// Superfícies reais de texto: base, card e elevado.
// `elevado` é superfície secundária: o piso de contraste do design system é
// fundo+card (ver contrast-aa.spec.ts). Falha ali vira DÉBITO reportado.
const SURFACES = [
  ["fundo", colors.bg, false],
  ["card", colors.cb, false],
  ["elevado", colors.ce, true],
];

// Texto (corpo ≥ 4.5:1) — muted é o piso do design system.
for (const [sLabel, sHex, advisory] of SURFACES) {
  check("texto", `text.primary sobre ${sLabel}`, text.primary, sHex, AA_TEXT, advisory);
  check("texto", `text.secondary sobre ${sLabel}`, text.secondary, sHex, AA_TEXT, advisory);
  check("texto", `text.muted sobre ${sLabel}`, text.muted, sHex, AA_TEXT, advisory);
}

// Cores canônicas de categoria usadas como rótulo/ícone (D-526).
for (const [name, hex] of Object.entries(media)) {
  for (const [sLabel, sHex, advisory] of SURFACES) {
    check("categoria", `media.${name} sobre ${sLabel}`, hex, sHex, AA_TEXT, advisory);
  }
}

// Faixas de score (número grande + cor informativa) — piso 3:1.
for (const [name, hex] of Object.entries(score)) {
  if (!hex.startsWith("#")) continue;
  for (const [sLabel, sHex, advisory] of SURFACES) {
    check("score", `score.${name} sobre ${sLabel}`, hex, sHex, AA_LARGE, advisory);
  }
}

/**
 * Cegueira do §11 da auditoria de UI/UX: este gate só olhava **pares de token**.
 * Um par literal — `bg-[#E11D48]/15 text-[#E11D48]`, que reprovou AA no DOM em
 * `/media/breaking-bad` (3,7:1) — passava batido aqui.
 *
 * Esta varredura é **estática**, então vale também para `/admin` e `/dashboard`,
 * que ficam fora do axe por falta de sessão (`test:auth`).
 *
 * Regra deliberadamente conservadora: só julga quando o **texto e o fundo aparecem
 * no mesmo className** — evita falso positivo de fundo herdado de um ancestral.
 * Fundo com alfa é composto sobre a superfície de card, que é o caso real do produto.
 */
function hexSobre(frente, alfa, fundo) {
  const a = hexToRgb(frente);
  const b = hexToRgb(fundo);
  const canais = [0, 1, 2].map((i) =>
    Math.round(a[i] * alfa + b[i] * (1 - alfa))
      .toString(16)
      .padStart(2, "0"),
  );
  return `#${canais.join("")}`;
}

function* arquivosTsx(dir) {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) yield* arquivosTsx(caminho);
    else if (caminho.endsWith(".tsx")) yield caminho;
  }
}

const SRC_WEB = join(REPO, "apps", "web", "src");
let literaisJulgados = 0;

/**
 * Quebra um className em utilitários com o seu "estado" (prefixos de variante).
 *
 * Duas correções que a primeira versão exigiu, ambas por falso positivo achado ao
 * rodar: (1) `hover:text-X` não pode ser pareado com o `bg-Y` base — estados
 * diferentes; (2) `after:bg-X` é pseudo-elemento (o sublinhado), não fundo do texto.
 */
function utilitariosDeCor(classe) {
  const out = [];
  for (const token of classe.split(/\s+/)) {
    const m = token.match(
      /^((?:[a-z0-9-]+:)*)(text|bg)-\[#([0-9A-Fa-f]{6})\](?:\/(\d{1,3}))?$/,
    );
    if (!m) continue;
    out.push({
      estado: m[1]
        .split(":")
        .filter(Boolean)
        .sort()
        .join(":"),
      util: m[2],
      hex: `#${m[3]}`,
      alfa: m[4] ? Number(m[4]) / 100 : 1,
    });
  }
  return out;
}

for (const arquivo of arquivosTsx(SRC_WEB)) {
  const conteudo = readFileSync(arquivo, "utf8");
  for (const classe of conteudo.matchAll(/["'`]([^"'`\n]*text-\[#[0-9A-Fa-f]{6}\][^"'`\n]*)["'`]/g)) {
    const cores = utilitariosDeCor(classe[1]);
    const rel = arquivo.slice(REPO.length + 1).replace(/\\/g, "/");
    for (const texto of cores.filter((c) => c.util === "text")) {
      for (const fundo of cores.filter(
        (c) =>
          c.util === "bg" &&
          c.estado === texto.estado &&
          !/\b(after|before)\b/.test(c.estado),
      )) {
        const fundoEfetivo =
          fundo.alfa >= 1 ? fundo.hex : hexSobre(fundo.hex, fundo.alfa, colors.cb);
        literaisJulgados += 1;
        check(
          "literal",
          `${rel}${texto.estado ? ` [${texto.estado}]` : ""}: ${texto.hex} sobre ${fundoEfetivo}${
            fundo.alfa < 1 ? ` (${fundo.hex}/${Math.round(fundo.alfa * 100)})` : ""
          }`,
          texto.hex,
          fundoEfetivo,
          AA_TEXT,
          false,
        );
      }
    }
  }
}

const failures = checks.filter((c) => c.ratio < c.min && !c.advisory);
const debts = checks.filter((c) => c.ratio < c.min && c.advisory);
const strict = process.argv.includes("--strict");

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ checks, failures, debts }, null, 2));
} else {
  const pad = (s, n) => String(s).padEnd(n);
  for (const c of checks) {
    const ok = c.ratio >= c.min ? "OK   " : c.advisory ? "DÉBITO" : "FALHA";
    const line = `${ok} ${pad(c.group, 10)} ${pad(c.label, 46)} ${c.ratio.toFixed(2)}:1 (min ${c.min})`;
    if (c.ratio >= c.min) console.log(line);
    else process.stderr.write(`${line}\n`);
  }
  const okCount = checks.length - failures.length - debts.length;
  console.log(`\n${okCount}/${checks.length} pares aprovados`);
  if (debts.length > 0) {
    console.log(
      `Débito conhecido (superfície elevada, não bloqueante): ${debts
        .map((d) => d.label)
        .join(", ")} — corrigir usando text.secondary sobre ${colors.ce}, ou subir o token.`,
    );
  }
  console.log(
    failures.length === 0
      ? `Contraste AA OK${debts.length > 0 && strict ? " (mas há débito em --strict)" : ""}`
      : `${failures.length} par(es) reprovado(s) — corrigir antes do PR`,
  );
}

const blocking = failures.length > 0 || (strict && debts.length > 0);
process.exit(blocking ? 1 : 0);
