#!/usr/bin/env node
/* global console */
// BOT 2 — auditor de rotas + componente alvo (D-660)
//
// Mudou de v1 para v2 por um erro de escopo medido: o v1 media `page.tsx`, mas em
// varias rotas o conteudo vive no componente importado. Ex.: /catalog tem 151
// linhas na pagina e o corpo em CatalogPageClient. Medir so a pagina inflava
// "zero token / sem h1" e migrar a pagina nao mudava nada visivel.
//
// Regras de resolucao (nao repita o que ja quebrou):
//   - spec NUNCA entra em regex de caminho. Resolve-se com path.resolve(dirname(pagina), spec)
//     para imports relativos e com join(SRC, spec) para o alias "@/".
//   - o filtro "isto e componente?" e String.includes("/components/") — comparacao
//     de substring, nao regex de caminho.
//   - nada e escrito: o bot so le. A arvore tem de sair limpa (`git diff`) apos rodar.
//
// Uso:
//   node scripts/bots/audit-routes.mjs                # pagina + componentes diretos
//   node scripts/bots/audit-routes.mjs --depth=2      # segue imports de componentes
//   node scripts/bots/audit-routes.mjs --all          # inclui /admin e /dashboard
//   node scripts/bots/audit-routes.mjs --json         # saida maquina-legivel
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve, relative, sep } from "node:path";

const RAIZ = process.cwd();
const WEB = join(RAIZ, "apps/web");
const SRC = join(WEB, "src");
const APP = join(SRC, "app");

const argv = process.argv.slice(2);
const flag = (nome) => argv.find((a) => a === `--${nome}` || a.startsWith(`--${nome}=`));
const valorDe = (nome, padrao) => {
  const f = flag(nome);
  if (!f || !f.includes("=")) return padrao;
  const n = Number(f.split("=")[1]);
  return Number.isFinite(n) && n >= 0 ? n : padrao;
};
const DEPTH = valorDe("depth", 1);
const INCLUIR_PRIVADAS = Boolean(flag("all"));
const JSON_OUT = Boolean(flag("json"));

// ---------- metricas de um arquivo ----------
const RX = {
  tokens: /surface-card|surface-border|fg-primary|fg-secondary|text-fg-|font-heading|bg-surface/g,
  hexCru: /#[0-9A-Fa-f]{6}\b/g,
  r2xl: /rounded-2xl/g,
  h1: /<h1\b/g,
  h2: /<h2\b/g,
  client: /^["']use client["']/m,
  i18n: /useTranslations|getTranslations/,
};

const RX_JSX = /<[A-Za-z]/;
const RX_REDIRECT = /permanentRedirect\(|redirect\(/;
const RX_BLOCO = /\/\*[\s\S]*?\*\//g;
// `//` so vira comentario quando abre a linha ou vem depois de espaco: assim
// `https://...` dentro de string nao e truncado.
const RX_LINHA = /(^|\s)\/\/[^\n]*/g;

/**
 * Medir comentario e medir a tela errada: `page-shell.tsx` diz "sem rounded-2xl"
 * na docstring e o v2 contava isso como anti-padrao D-065 na rota /discover; o
 * mesmo vale para o "<h1>" citado em prosa. Os numeros saem do codigo, nao da
 * conversa sobre o codigo.
 */
const semComentarios = (c) =>
  c
    .replace(RX_BLOCO, "")
    .replace(RX_LINHA, (m, prefixo) => prefixo)
    .replace(/\{\s*\}/g, "");

const medirArquivo = (abs) => {
  const bruto = readFileSync(abs, "utf8");
  const c = semComentarios(bruto);
  const conta = (re) => (c.match(re) ?? []).length;
  return {
    abs,
    tokens: conta(RX.tokens),
    hexCru: conta(RX.hexCru),
    r2xl: conta(RX.r2xl),
    h1: conta(RX.h1),
    h2: conta(RX.h2),
    client: RX.client.test(bruto),
    i18n: RX.i18n.test(c),
    // Rota que so redireciona nao renderiza nada: "sem token / sem h1" ali nao e
    // divida, e sim a mesma inflacao de escopo que motivou o v2.
    veu: RX_JSX.test(c) || !RX_REDIRECT.test(bruto),
    linhas: bruto.split("\n").length - (bruto.endsWith("\n") ? 1 : 0),
  };
};

// ---------- resolucao de imports (sem regex de caminho) ----------
const asPosix = (p) => p.split(sep).join("/");
const ehComponente = (abs) => asPosix(abs).includes("/components/");

const EXTENSOES = [".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts"];

const materializar = (base) => {
  for (const cand of [base, ...EXTENSOES.map((e) => base + e)]) {
    if (existsSync(cand) && statSync(cand).isFile()) return cand;
  }
  return null;
};

const resolverSpec = (deAbs, spec) => {
  if (spec.startsWith("@/")) return materializar(join(SRC, spec.slice(2)));
  if (spec.startsWith("./") || spec.startsWith("../")) {
    return materializar(resolve(dirname(deAbs), spec));
  }
  return null; // pacote externo / next / react — nao interessa
};

const RX_IMPORT = /(?:from\s*|import\(\s*)["']([^"']+)["']/g;

const importsDe = (abs) => {
  const c = readFileSync(abs, "utf8");
  const specs = new Set();
  let m;
  while ((m = RX_IMPORT.exec(c)) !== null) specs.add(m[1]);
  RX_IMPORT.lastIndex = 0;
  return [...specs];
};

// ---------- descoberta de rotas ----------
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
    const semLocale = rel
      .split("/")
      .filter((p) => p !== "[locale]")
      .join("/");
    const privada = /^(admin|dashboard)(\/|$)/.test(semLocale);
    if (privada && !INCLUIR_PRIVADAS) continue;
    rotas.push({ rota: "/" + semLocale.replace(/^\/+/, ""), abs, privada });
  }
};
andar(APP);

// ---------- cadeia pagina -> componentes ----------
const cadeiaDe = (pageAbs) => {
  const visitados = new Set([pageAbs]);
  const componentes = [];
  const naoResolvidos = [];
  let fronteira = [{ abs: pageAbs, nivel: 0 }];

  while (fronteira.length) {
    const proxima = [];
    for (const { abs, nivel } of fronteira) {
      for (const spec of importsDe(abs)) {
        const alvo = resolverSpec(abs, spec);
        if (!alvo) {
          const relativo = spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("@/");
          if (relativo && nivel === 0) naoResolvidos.push(spec);
          continue;
        }
        if (visitados.has(alvo)) continue;
        visitados.add(alvo);
        if (!ehComponente(alvo)) continue; // lib/, stores/ etc. nao renderizam sozinhos
        componentes.push({ abs: alvo, nivel: nivel + 1 });
        if (nivel + 1 < DEPTH) proxima.push({ abs: alvo, nivel: nivel + 1 });
      }
    }
    fronteira = proxima;
  }
  return { componentes, naoResolvidos };
};

// ---------- medicao ----------
const dados = rotas.map(({ rota, abs, privada }) => {
  const pagina = medirArquivo(abs);
  const { componentes, naoResolvidos } = cadeiaDe(abs);
  const medidas = componentes.map((c) => ({ ...medirArquivo(c.abs), nivel: c.nivel }));
  const soma = (k) => medidas.reduce((s, m) => s + m[k], 0);
  const total = {
    tokens: pagina.tokens + soma("tokens"),
    hexCru: pagina.hexCru + soma("hexCru"),
    r2xl: pagina.r2xl + soma("r2xl"),
    h1: pagina.h1 + soma("h1"),
    h2: pagina.h2 + soma("h2"),
    linhas: pagina.linhas + soma("linhas"),
  };
  const sinalizacoes = [];
  if (!pagina.veu) sinalizacoes.push("redirect");
  if (pagina.veu) {
    if (total.tokens === 0) sinalizacoes.push("SEM TOKEN");
    if (total.h1 === 0) sinalizacoes.push("SEM H1");
    if (total.r2xl > 0) sinalizacoes.push("D-065");
  }
  const i18n = pagina.i18n || medidas.some((m) => m.i18n);
  const client = pagina.client || medidas.some((m) => m.client);
  return {
    rota,
    privada,
    total,
    pagina,
    componentes: medidas.map((m) => ({ ...m, rel: asPosix(relative(WEB, m.abs)) })),
    naoResolvidos,
    i18n,
    client,
    sinalizacoes,
  };
});

// ordem: pior adesao primeiro (menos tokens, mais hex cru), depois rota
dados.sort((a, b) => a.total.tokens - b.total.tokens || b.total.hexCru - a.total.hexCru);

if (JSON_OUT) {
  console.log(
    JSON.stringify(
      {
        depth: DEPTH,
        rotas: dados.map((d) => ({
          rota: d.rota,
          linhas: d.total.linhas,
          tokens: d.total.tokens,
          hexCru: d.total.hexCru,
          r2xl: d.total.r2xl,
          h1: d.total.h1,
          h2: d.total.h2,
          client: d.client,
          i18n: d.i18n,
          sinalizacoes: d.sinalizacoes,
          pagina: { linhas: d.pagina.linhas, tokens: d.pagina.tokens, veu: d.pagina.veu },
          componentes: d.componentes.map((c) => ({
            arquivo: c.rel,
            nivel: c.nivel,
            linhas: c.linhas,
            tokens: c.tokens,
            hexCru: c.hexCru,
            r2xl: c.r2xl,
            h1: c.h1,
            client: c.client,
            i18n: c.i18n,
          })),
          naoResolvidos: d.naoResolvidos,
        })),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

// ---------- relatorio ----------
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

console.log(
  `\n  ${dados.length} rotas publicas medidas — PAGINA + COMPONENTES (profundidade ${DEPTH})`,
);
console.log(`  ordenadas por adesao ao conceito (pior primeiro)\n`);
console.log(
  `  ${pad("rota", 32)} ${padL("lin", 5)} ${padL("pág", 5)} ${padL("comp", 5)} ${padL("token", 6)} ${padL("hex", 5)} ${padL("r2xl", 5)} ${padL("h1", 4)} ${pad("client", 7)} ${pad("i18n", 5)} sinal`,
);
console.log(`  ${"-".repeat(96)}`);
for (const d of dados)
  console.log(
    `  ${pad(d.rota, 32)} ${padL(d.total.linhas, 5)} ${padL(d.pagina.linhas, 5)} ${padL(d.componentes.length, 5)} ${padL(d.total.tokens, 6)} ${padL(d.total.hexCru, 5)} ${padL(d.total.r2xl, 5)} ${padL(d.total.h1, 4)} ${pad(d.client ? "sim" : "nao", 7)} ${pad(d.i18n ? "sim" : "nao", 5)} ${d.sinalizacoes.join("+") || "-"}`,
  );

const comComponente = dados.filter((d) => d.componentes.length > 0);
const comVeu = dados.filter((d) => d.pagina.veu);
const redireciona = dados.filter((d) => !d.pagina.veu);
const semToken = comVeu.filter((d) => d.total.tokens === 0);
const semH1 = comVeu.filter((d) => d.total.h1 === 0);
const comR2xl = comVeu.filter((d) => d.total.r2xl > 0);

console.log(
  `\n  ZERO token do conceito (${semToken.length}): ${semToken.map((d) => d.rota).join(", ") || "-"}`,
);
console.log(
  `  SEM <h1> apos medir componentes (${semH1.length}): ${semH1.map((d) => d.rota).join(", ") || "-"}`,
);
console.log(
  `  COM rounded-2xl, anti-padrao D-065 (${comR2xl.length}): ${comR2xl.map((d) => d.rota).join(", ") || "-"}`,
);
console.log(`  hex cru total: ${comVeu.reduce((s, d) => s + d.total.hexCru, 0)} ocorrencia(s)`);
if (redireciona.length)
  console.log(
    `  SO REDIRECIONAM, fora das contas (${redireciona.length}): ${redireciona.map((d) => d.rota).join(", ")}`,
  );

// Componentes deduplicados: esta e a lista real de trabalho.
const porComponente = new Map();
for (const d of dados)
  for (const c of d.componentes) {
    const atual = porComponente.get(c.abs) ?? { ...c, rotas: new Set() };
    atual.rotas.add(d.rota);
    porComponente.set(c.abs, atual);
  }
const componentes = [...porComponente.values()].sort(
  (a, b) => a.tokens - b.tokens || b.linhas - a.linhas,
);
console.log(
  `\n  ${componentes.length} COMPONENTES alcancados por ${comComponente.length}/${dados.length} rotas`,
);
console.log(`  ordenados por adesao ao conceito (pior primeiro) — esta e a fila de migracao\n`);
console.log(
  `  ${pad("componente", 52)} ${padL("lin", 5)} ${padL("token", 6)} ${padL("hex", 5)} ${padL("r2xl", 5)} ${padL("h1", 4)} ${pad("client", 7)} sinal`,
);
console.log(`  ${"-".repeat(98)}`);
for (const c of componentes)
  console.log(
    `  ${pad(c.rel, 52)} ${padL(c.linhas, 5)} ${padL(c.tokens, 6)} ${padL(c.hexCru, 5)} ${padL(c.r2xl, 5)} ${padL(c.h1, 4)} ${pad(c.client ? "sim" : "nao", 7)} ${[...c.rotas].join(",")}`,
  );

const naoResolvidos = dados.flatMap((d) => d.naoResolvidos.map((s) => `${d.rota} -> ${s}`));
if (naoResolvidos.length) {
  console.log(`\n  imports relativos NAO resolvidos (${naoResolvidos.length}) — conferir a mao:`);
  for (const n of naoResolvidos) console.log(`    ${n}`);
}

console.log("");
