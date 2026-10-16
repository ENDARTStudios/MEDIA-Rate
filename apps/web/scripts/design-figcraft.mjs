#!/usr/bin/env node
/**
 * design:figcraft — leva os tokens do MEDIA Rate para dentro do FigCraft.
 *
 * Por que existe: o design system do produto (`src/lib/design-tokens.ts` + as variáveis
 * CSS de `globals.css`) é a fonte da verdade das cores, tipografia, raios e movimento —
 * e ferramenta de design nenhuma enxergava isso. Resultado prático: toda peça desenhada
 * fora do código começava com paleta inventada (foi o que produziu um conceito com
 * premissas de outro projeto, D-598).
 *
 * O que este script faz (sem rede, sem escrever no código do produto):
 *   1. lê os tokens e gera `docs/02-architecture-design/figcraft/tokens.jsonl` com
 *      coleções de variáveis do FigCraft (Cor / Tipografia / Espaço e raio / Movimento)
 *      e `codeSyntax` apontando para o `var(--…)` real de cada cor;
 *   2. desenha um "Guia de tokens" usando essas variáveis (swatches com fill LIGADO à
 *      variável, escala tipográfica, movimento) e salva o arquivo.
 *
 * Uso:
 *   node apps/web/scripts/design-figcraft.mjs
 *   & 'C:\Program Files\FigCraft\figcraft-cli.exe' run docs\02-architecture-design\figcraft\tokens.jsonl `
 *       --out docs\02-architecture-design\figcraft\tokens.figcraft
 *   & 'C:\Program Files\FigCraft\figcraft-cli.exe' export docs\02-architecture-design\figcraft\tokens.figcraft `
 *       -o docs\02-architecture-design\evidencias\tokens --format png --scale 2
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..", "..", "..");
const TOKENS_TS = join(RAIZ, "apps", "web", "src", "lib", "design-tokens.ts");
const GLOBALS_CSS = join(RAIZ, "apps", "web", "src", "app", "globals.css");
const DESTINO_DIR = join(RAIZ, "docs", "02-architecture-design", "figcraft");

/* ── leitura dos tokens ─────────────────────────────────────────────────────── */

/** Extrai `chave: "valor"` e `pai: { chave: "valor" }` de cada bloco `export const X = {`. */
function blocos(fonte) {
  const saida = {};
  const marcador = /export const (\w+)\s*=\s*\{/g;
  let m;
  while ((m = marcador.exec(fonte)) !== null) {
    const nome = m[1];
    let i = marcador.lastIndex - 1;
    let nivel = 0;
    for (; i < fonte.length; i++) {
      if (fonte[i] === "{") nivel++;
      else if (fonte[i] === "}") {
        nivel--;
        if (nivel === 0) break;
      }
    }
    saida[nome] = fonte.slice(marcador.lastIndex, i);
  }
  return saida;
}

/** Coleta folhas string/número de um bloco, achatando um nível (`score: { 9: "#34D399" }`). */
function folhas(corpo) {
  const out = {};
  let pai = null;
  for (const linha of corpo.split(/\r?\n/)) {
    const abrePai = /^\s{2}(\w+)\s*:\s*\{\s*$/.exec(linha);
    if (abrePai) {
      pai = abrePai[1];
      continue;
    }
    if (/^\s{2}\},?\s*$/.test(linha)) {
      pai = null;
      continue;
    }
    const simples = /^\s*"?([\w-]+)"?\s*:\s*"([^"]+)"/.exec(linha);
    const numerico = /^\s*"?([\w-]+)"?\s*:\s*(-?[\d.]+)\s*,?\s*$/.exec(linha);
    const hex = /^\s*"?([\w-]+)"?\s*:\s*"(#[0-9A-Fa-f]{3,8})"/.exec(linha);
    if (hex) out[pai ? `${pai}.${hex[1]}` : hex[1]] = { tipo: "color", valor: hex[2] };
    else if (simples)
      out[pai ? `${pai}.${simples[1]}` : simples[1]] = { tipo: "string", valor: simples[2] };
    else if (numerico)
      out[pai ? `${pai}.${numerico[1]}` : numerico[1]] = {
        tipo: "number",
        valor: Number(numerico[2]),
      };
  }
  return out;
}

const fonteTs = readFileSync(TOKENS_TS, "utf8");
const b = blocos(fonteTs);
const cores = folhas(b.colors ?? "");
const texto = { ...folhas(b.text ?? ""), ...folhas(b.surface ?? ""), ...folhas(b.score ?? "") };
const tipografia = folhas(b.typography ?? "");
const raios = folhas(b.radii ?? "");
const espacos = folhas(b.spacing ?? "");
const duracao = folhas((b.motion ?? "").split("easing")[0] ?? "");
const categoria = folhas(b.CATEGORY_TOKENS ?? "");

/** Nome de variável CSS real (`--surface-card`), quando existir, para o `codeSyntax`. */
const css = readFileSync(GLOBALS_CSS, "utf8");
const varsCss = new Map();
for (const linha of css.split(/\r?\n/)) {
  const m = /^\s*(--[\w-]+)\s*:\s*(#[0-9A-Fa-f]{3,8})\s*;/.exec(linha);
  if (m) varsCss.set(m[2].toLowerCase(), m[1]);
}

/* ── geração do roteiro do FigCraft ─────────────────────────────────────────── */

const linhas = [];
/* O FigCraft usa namespaces de id DIFERENTES (medido no retorno de cada comando):
   nós = número (a página é 1, o primeiro nó é 2), coleção = "VariableCollectionId:N",
   variável = "VariableId:N". Contadores separados, senão as referências se cruzam. */
let proximoNo = 2;
let proximaColecao = 1;
let proximaVariavel = 1; // só para o relatório; a referência usada é o nome
const emitir = (command, params) => {
  linhas.push(JSON.stringify({ command, params }));
};

const colecao = (nome, modos = ["Escuro"]) => {
  emitir("variable.createCollection", { name: nome, modes: modos });
  return `VariableCollectionId:${proximaColecao++}`;
};
/* `variable.update` e `variable.bind` aceitam o NOME da variável (testado), então a
   referência é o nome — some a necessidade de prever id (o id real é "VariableID:N",
   com D maiúsculo, e errar a caixa quebra o roteiro inteiro). */
const variavel = (collection, name, type, value) => {
  emitir("variable.create", { collection, name, type, value });
  proximaVariavel++;
  return name;
};
const no = () => proximoNo++;
const sintaxe = (variable, web) =>
  emitir("variable.update", { variable, codeSyntax: { WEB: web } });
const ligar = (nodeId, field, variable) =>
  emitir("variable.bind", { ids: [nodeId], field, variable });

const ret = (parent, x, y, w, h, props = {}, name = "ret") => {
  const meu = no();
  emitir("node.create", { type: "rectangle", parent, x, y, width: w, height: h, props, name });
  return meu;
};
const txt = (parent, x, y, w, texto, props = {}, name = "txt") => {
  const meu = no();
  emitir("node.create", { type: "text", parent, x, y, width: w, text: texto, props, name });
  return meu;
};

emitir("file.new", { name: "MEDIA Rate — Tokens" });

/* coleções e variáveis */
const COL_COR = colecao("Cor");
const COL_TIPO = colecao("Tipografia");
const COL_ESPACO = colecao("Espaço e raio");
const COL_MOV = colecao("Movimento");

const varsCor = [];
for (const [nome, { valor, tipo }] of Object.entries({ ...cores, ...texto, ...categoria })) {
  // Só hex vira variável de COR: `rgba(...)`/`transparent` (ex.: surface.overlay) é
  // rejeitado pelo FigCraft no tipo color — medido como "invalid value".
  if (tipo !== "color" || !/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(valor)) continue;
  const v = variavel(COL_COR, nome, "color", valor);
  const cssVar = varsCss.get(valor.toLowerCase());
  if (cssVar) sintaxe(v, `var(${cssVar})`);
  varsCor.push({ nome, valor, id: v });
}
for (const [nome, { valor }] of Object.entries(raios)) {
  // Raio vem como string com unidade ("0.375rem") — vira variável de STRING (fiel ao
  // código); número só quando já é número. Declarar number com unidade é rejeitado.
  variavel(COL_ESPACO, `raio.${nome}`, typeof valor === "number" ? "number" : "string", valor);
}
for (const [nome, { valor }] of Object.entries(espacos)) {
  if (typeof valor === "number") variavel(COL_ESPACO, `espaco.${nome}`, "number", valor);
}
for (const [nome, { valor }] of Object.entries(tipografia)) {
  if (typeof valor === "number") variavel(COL_TIPO, `fonte.${nome}`, "number", valor);
}
for (const [nome, { valor }] of Object.entries(duracao)) {
  if (typeof valor === "number") variavel(COL_MOV, `duracao.${nome}`, "string", `${valor}s`);
}

/* guia desenhado com as variáveis */
const F = no();
emitir("frame.create", {
  x: 0,
  y: 0,
  width: 1280,
  height: 1960 /* altura medida: 52 cores (9 linhas) + tipografia + movimento */,
  name: "00 Guia de tokens",
  props: { fill: "#05050A" },
});

txt(F, 40, 36, 900, "MEDIA Rate — tokens canônicos", { fontSize: 28, fill: "#F5F5F7" }, "titulo");
txt(
  F,
  40,
  74,
  1100,
  "Gerado de apps/web/src/lib/design-tokens.ts + src/app/globals.css. Cada swatch tem o fill LIGADO à variável de cor (codeSyntax = var(--…) real do produto).",
  { fontSize: 12, fill: "#85859F" },
  "sub",
);

txt(F, 40, 116, 400, "COR", { fontSize: 12, fill: "#818CF8" }, "h-cor");
let cx = 40;
let cy = 142;
varsCor.forEach(({ nome, valor, id: vid }, i) => {
  const swatch = ret(
    F,
    cx,
    cy,
    88,
    56,
    { fill: valor, cornerRadius: 8, stroke: "#2A2A3D", strokeWeight: 1, strokeAlign: "inside" },
    `sw-${i}`,
  );
  ligar(swatch, "fill", vid);
  txt(F, cx, cy + 62, 180, nome, { fontSize: 11, fill: "#F5F5F7" }, `nome-${i}`);
  txt(
    F,
    cx,
    cy + 78,
    180,
    `${valor}${varsCss.get(valor.toLowerCase()) ? ` · ${varsCss.get(valor.toLowerCase())}` : ""}`,
    { fontSize: 10, fill: "#85859F" },
    `hex-${i}`,
  );
  cx += 196;
  if ((i + 1) % 6 === 0) {
    cx = 40;
    cy += 104;
  }
});

const yTipo = cy + 128;
txt(F, 40, yTipo, 400, "TIPOGRAFIA (escala real)", { fontSize: 12, fill: "#818CF8" }, "h-tipo");
Object.entries(tipografia)
  .filter(([, v]) => typeof v.valor === "number")
  .slice(0, 8)
  .forEach(([nome, v], i) => {
    txt(
      F,
      40,
      yTipo + 28 + i * 38,
      300,
      `${nome} — ${v.valor}px`,
      { fontSize: 12, fill: "#A0A0B8" },
      `tipo-nome-${i}`,
    );
    txt(
      F,
      360,
      yTipo + 20 + i * 38,
      800,
      "O placar canônico do MEDIA Rate",
      { fontSize: Math.min(v.valor, 40), fill: "#F5F5F7" },
      `tipo-amos-${i}`,
    );
  });

const yMov = yTipo + 28 + 8 * 38 + 40;
txt(F, 40, yMov, 400, "MOVIMENTO (durações)", { fontSize: 12, fill: "#818CF8" }, "h-mov");
Object.entries(duracao)
  .filter(([, v]) => typeof v.valor === "number")
  .forEach(([nome, v], i) => {
    const largura = Math.round(v.valor * 120);
    const barra = ret(
      F,
      300,
      yMov + i * 30,
      Math.max(largura, 6),
      10,
      { fill: "#818CF8", cornerRadius: 5 },
      `mov-${i}`,
    );
    void barra;
    txt(
      F,
      40,
      yMov + i * 30 - 2,
      240,
      `${nome} — ${v.valor}s`,
      { fontSize: 11, fill: "#A0A0B8" },
      `mov-nome-${i}`,
    );
  });

emitir("file.save", { params: undefined });
linhas[linhas.length - 1] = JSON.stringify({
  command: "file.save",
  params: { path: "docs/02-architecture-design/figcraft/tokens.figcraft" },
});

mkdirSync(DESTINO_DIR, { recursive: true });
const destino = join(DESTINO_DIR, "tokens.jsonl");
writeFileSync(destino, linhas.join("\n") + "\n", "utf8");
console.log(
  `design:figcraft — ${linhas.length} comandos · ${varsCor.length} cores, ` +
    `${Object.keys(tipografia).length} tokens de tipografia, ${Object.keys(raios).length} raios, ` +
    `${Object.keys(duracao).length} durações\n  gerado: ${destino.replace(RAIZ + "\\", "")}`,
);
