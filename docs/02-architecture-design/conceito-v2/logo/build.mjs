#!/usr/bin/env node
/**
 * build.mjs — selo v2 "corte" (variação de marca do MEDIA Rate).
 *
 * Fonte única da geometria: as duas metades do losango são calculadas aqui, em
 * unidades da malha de 256, e emitidas como comandos do VectorCraft. O SVG e o
 * PNG saem do mesmo documento — nada é desenhado à mão no arquivo final.
 *
 * Uso (da raiz do repo, Windows):
 *   node docs/02-architecture-design/conceito-v2/logo/build.mjs
 *   node docs/02-architecture-design/conceito-v2/logo/build.mjs --only final,construcao
 *
 * Requer `vectorcraft-cli` (VectorCraft Desktop). Procura em:
 *   $env:VECTORCRAFT_CLI, PATH, C:\Program Files\VectorCraft\vectorcraft-cli.exe
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = dirname(fileURLToPath(import.meta.url));

// ── tokens do conceito v2 (docs/02-architecture-design/conceito-v2/00-FUNDAMENTOS.md)
const TOKENS = {
  mesa0: "#08080C",
  papel0: "#F4F1EA",
  papelTinta: "#14141C",
  tinta1: "#F2F0EB",
  tinta2: "#A8A49C",
  tinta3: "#6E6A64",
  acento: "#E8543F",
};

// ── geometria ────────────────────────────────────────────────────────────────
// Canvas de montagem 256 × 256. Losango |x−CX| + |y−CY| = D (45° exatos).
// O corte é horizontal; as duas metades deslizam em sentidos opostos.
const CX = 128;
const CY = 128;
const D = 96; // meia-diagonal → losango 192 × 192

const halfWidthAt = (y) => D - Math.abs(y - CY); // meia-largura do losango na altura y

/**
 * As duas metades do selo, em unidades de 256 (y para baixo).
 *
 * O corte é uma reta que passa pelo centro num ângulo `angle` (0 = horizontal).
 *   · `gap`   — abertura perpendicular ao corte (afasta as metades);
 *   · `shift` — deslizamento de cada metade AO LONGO do corte (efeito emenda).
 * As duas metades são deslocadas por `gap/2 · normal ± shift · direção`.
 */
function pieces({ gap = 16, shift = 16, angle = 0 } = {}) {
  const a = (angle * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const nx = -dy; // normal (para cima quando angle = 0)
  const ny = dx;
  // interseção da reta y = tan(angle)·x com |x| + |y| = D (coordenadas centradas)
  const m = Math.tan(a);
  const ix = D / (1 + Math.abs(m));
  const right = [ix, m * ix];
  const left = [-ix, -m * ix];
  const top = [0, -D]; // ápice superior
  const bottom = [0, D];

  const move = (pts, sx, sy) => pts.map(([x, y]) => [x + sx, y + sy]);
  const upper = [top, right, left];
  const lower = [left, right, bottom];
  return center([
    move(upper, -nx * (gap / 2) - dx * shift, -ny * (gap / 2) - dy * shift),
    move(lower, nx * (gap / 2) + dx * shift, ny * (gap / 2) + dy * shift),
  ]);
}

/** Centraliza o conjunto no canvas (o corte inclinado muda a bbox). */
function center(groups) {
  const xs = groups.flat().map(([x]) => x);
  const ys = groups.flat().map(([, y]) => y);
  const dx = CX - (Math.min(...xs) + Math.max(...xs)) / 2;
  const dy = CY - (Math.min(...ys) + Math.max(...ys)) / 2;
  return groups.map((pts) => pts.map(([x, y]) => [x + dx, y + dy]));
}

const round = (n) => Math.round(n * 1000) / 1000;
const poly = (pts) => `M${pts.map(([x, y]) => `${round(x)} ${round(y)}`).join(" L")} Z`;

/** Escala/translada (e espelha) conjuntos de polígonos, em coordenadas de 256. */
function place(groups, { scale = 1, dx = 0, dy = 0 } = {}) {
  return groups.map((pts) => pts.map(([x, y]) => [round(x * scale + dx), round(y * scale + dy)]));
}

// ── comandos VectorCraft ────────────────────────────────────────────────────
const selectNone = { command: "select.none", params: {} };

const newDoc = (width, height, title) => ({
  command: "file.new",
  params: { width, height, units: "Pixels", colorMode: "rgb", name: title, title },
});

const artboardBg = (color) => ({ command: "artboard.setProps", params: { index: 0, color } });

/** Ajusta a tinta PADRÃO dos próximos objetos criados (nada selecionado). */
function defaults({ fill = null, stroke = null, weight = 1, dash = null, cap = "butt" } = {}) {
  const cmds = [selectNone];
  cmds.push(fill ? { command: "paint.setFill", params: { color: fill } } : { command: "paint.setFill", params: { none: true } });
  cmds.push(stroke ? { command: "paint.setStroke", params: { color: stroke } } : { command: "paint.setStroke", params: { none: true } });
  if (stroke) cmds.push({ command: "stroke.set", params: { weight, cap, join: "miter", ...(dash ? { dash } : {}) } });
  return cmds;
}

const path = (d, closed = true) => ({ command: "path.create", params: { d, closed } });

const text = (x, y, str, { size = 12, color = TOKENS.tinta2, style = "Regular" } = {}) => ({
  command: "text.create",
  params: { x, y, text: str, size, font: "Space Grotesk", style, color },
});

const rect = (x, y, w, h, radius = 0) => ({ command: "shape.rectangle", params: { x, y, width: w, height: h, radius } });

const exportSvg = (file) => ({ command: "document.export", params: { path: file, format: "svg", svg: { outlineText: true } } });
const exportPng = (file, { scale = 1, background = "transparent" } = {}) => ({
  command: "document.export",
  params: { path: file, format: "png", scale, background },
});

const FILES = {
  final: join(OUT, "selo-corte-v2.svg"),
  finalPng: join(OUT, "selo-corte-v2.png"),
  mono: join(OUT, "selo-corte-v2-mono-tinta.svg"),
  monoPng: join(OUT, "selo-corte-v2-mono-tinta.png"),
  reverso: join(OUT, "selo-corte-v2-reverso.svg"),
  reversoPng: join(OUT, "selo-corte-v2-reverso.png"),
  construcao: join(OUT, "selo-corte-v2-construcao.svg"),
  construcaoPng: join(OUT, "selo-corte-v2-construcao.png"),
  teste: join(OUT, "selo-corte-v2-teste.svg"),
  testePng: join(OUT, "selo-corte-v2-teste.png"),
  exploracao: join(OUT, "exploracao-selo.svg"),
  exploracaoPng: join(OUT, "exploracao-selo.png"),
};

// ── artefatos ───────────────────────────────────────────────────────────────
const VARIANTS = [
  { id: "A", gap: 16, shift: 16, angle: 0, note: "corte 0° · vão 16 · emenda 16" },
  { id: "B", gap: 16, shift: 16, angle: 15, note: "corte 15° · vão 16 · emenda 16" },
  { id: "C", gap: 16, shift: 24, angle: 15, note: "corte 15° · vão 16 · emenda 24" },
  { id: "D", gap: 16, shift: 0, angle: 15, note: "corte 15° · vão 16 · sem emenda" },
  { id: "E", gap: 12, shift: 20, angle: 25, note: "corte 25° · vão 12 · emenda 20" },
];
const CHOSEN = VARIANTS[0];

/** Prato de exploração: 5 geometrias, em tamanho grande e em 64/32/16 px reais. */
function buildExploracao() {
  const W = 5 * 280;
  const H = 470;
  const cmds = [newDoc(W, H, "MEDIA Rate — selo v2 · exploração"), artboardBg(TOKENS.mesa0)];
  VARIANTS.forEach((v, i) => {
    const cx = 140 + i * 280;
    for (const pts of place(pieces(v), { dx: cx - 128, dy: 150 - 128 })) cmds.push(path(poly(pts)));
  });
  cmds.push(...defaults({ fill: TOKENS.tinta1 }));
  VARIANTS.forEach((v, i) => {
    const cx = 140 + i * 280;
    for (const [s, x, y] of [
      [64, cx - 92, 300],
      [32, cx - 4, 316],
      [16, cx + 60, 324],
    ]) for (const pts of place(pieces(v), { scale: s / 256, dx: x, dy: y })) cmds.push(path(poly(pts)));
  });
  cmds.push(...defaults({ fill: TOKENS.tinta2 }));
  VARIANTS.forEach((v, i) => {
    const cx = 140 + i * 280;
    cmds.push(text(cx - 118, 430, `${v.id} — ${v.note}`, { size: 12 }));
  });
  cmds.push(
    text(24, 458, "MEDIA Rate · selo v2 · exploração monocolor — 64/32/16 px reais", { size: 11, color: TOKENS.tinta3 }),
    exportSvg(FILES.exploracao),
    exportPng(FILES.exploracaoPng),
  );
  return { cmds };
}

/** Marca final, uma cor, sem fundo (master). */
function buildMark(color, svgFile, pngFile, { thin = 0 } = {}) {
  const g = thin
    ? pieces(CHOSEN).map((pts) => pts.map(([x, y]) => [CX + (x - CX) * thin, CY + (y - CY) * thin]))
    : pieces(CHOSEN);
  const cmds = [
    newDoc(256, 256, "MEDIA Rate — selo v2 (corte)"),
    ...defaults({ fill: color }),
    ...place(g).map((pts) => path(poly(pts))),
    exportSvg(svgFile),
    exportPng(pngFile, { scale: 2 }),
  ];
  return { cmds };
}

/** Grade de construção 640 × 640: geometria ×2 sobre malha de 8 u (16 px). */
function buildConstrucao() {
  const W = 640;
  const S = 2;
  const ox = W / 2 - CX * S;
  const oy = W / 2 - CY * S;
  const X = (x) => round(x * S + ox);
  const Y = (y) => round(y * S + oy);
  const g = pieces(CHOSEN);

  const cmds = [newDoc(W, W, "MEDIA Rate — selo v2 · grade de construção"), artboardBg(TOKENS.papel0)];

  // 1) malha de 8 u (16 px) — atrás da marca
  cmds.push(...defaults({ stroke: TOKENS.tinta2, weight: 0.5 }));
  const gx0 = X(CX - D) - 32;
  const gx1 = X(CX + D) + 32;
  const gy0 = Y(CY - D) - 32;
  const gy1 = Y(CY + D) + 32;
  const grid = [];
  for (let x = gx0; x <= gx1; x += 16) grid.push(`M${x} ${gy0} L${x} ${gy1}`);
  for (let y = gy0; y <= gy1; y += 16) grid.push(`M${gx0} ${y} L${gx1} ${y}`);
  cmds.push(path(grid.join(" "), false));

  // 2) eixos (centro geométrico) — só dentro do quadro de construção
  cmds.push(...defaults({ stroke: TOKENS.tinta3, weight: 1, dash: [6, 6] }));
  cmds.push(path(`M${X(CX)} ${gy0} L${X(CX)} ${gy1} M${gx0} ${Y(CY)} L${gx1} ${Y(CY)}`, false));

  // 3) losango-base (guia de 45°, 192 × 192)
  cmds.push(...defaults({ stroke: TOKENS.acento, weight: 1, dash: [8, 6] }));
  cmds.push(
    path(
      poly([
        [X(CX), Y(CY - D)],
        [X(CX + D), Y(CY)],
        [X(CX), Y(CY + D)],
        [X(CX - D), Y(CY)],
      ]),
      false,
    ),
  );

  // 4) a marca sólida, por cima das guias
  cmds.push(...defaults({ fill: TOKENS.papelTinta }));
  for (const pts of place(g, { scale: S, dx: ox, dy: oy })) cmds.push(path(poly(pts)));

  // 5) arestas do corte (as bases das duas metades)
  cmds.push(...defaults({ stroke: TOKENS.acento, weight: 0.75, dash: [2, 5] }));
  const edge = (a, b) => `M${X(a[0])} ${Y(a[1])} L${X(b[0])} ${Y(b[1])}`;
  cmds.push(path(`${edge(g[0][1], g[0][2])} ${edge(g[1][0], g[1][1])}`, false));

  // 6) vértices como pontos de construção
  cmds.push(...defaults({ fill: TOKENS.acento }));
  for (const [x, y] of g.flat()) {
    cmds.push(
      path(
        poly([
          [X(x) - 3, Y(y) - 3],
          [X(x) + 3, Y(y) - 3],
          [X(x) + 3, Y(y) + 3],
          [X(x) - 3, Y(y) + 3],
        ]),
      ),
    );
  }

  // 7) rótulos (viram contorno no export: svg.outlineText)
  cmds.push(...defaults({ fill: TOKENS.papelTinta }));
  cmds.push(text(24, 44, "SELO V2 · GRADE DE CONSTRUÇÃO", { size: 15, style: "Bold" }));
  cmds.push(...defaults({ fill: TOKENS.tinta3 }));
  cmds.push(text(24, 62, "malha 8 u · losango-base de 45° (192 × 192) · 1 u = 2 px neste quadro", { size: 11 }));
  cmds.push(text(24, 84, "as metades saem do losango-base: 8 u para fora (vão de 16 u) e 16 u em sentidos opostos (emenda)", { size: 10 }));
  cmds.push(text(24, W - 72, "corte 0° (horizontal) · vão de 16 u = 8 u para cada lado", { size: 10 }));
  cmds.push(text(24, W - 48, "emenda ±16 u ao longo do corte · bbox 224 × 208 · centro (128,128)", { size: 10 }));
  cmds.push(text(24, W - 20, "MEDIA Rate · conceito v2 · demonstração da skill logo-design", { size: 10, color: TOKENS.tinta3 }));

  cmds.push(exportSvg(FILES.construcao), exportPng(FILES.construcaoPng, { scale: 2 }));
  return { cmds };
}

/** Folha de teste: tamanhos reais, uma cor, positivo/reverso, mono. */
function buildTeste() {
  const W = 1240;
  const H = 540;
  const cmds = [newDoc(W, H, "MEDIA Rate — selo v2 · folha de teste"), artboardBg(TOKENS.mesa0)];

  // linha 1: tamanhos reais em branco-sobre-mesa (reverso)
  cmds.push(...defaults({ fill: TOKENS.tinta1 }));
  const rowY = 190;
  let x = 60;
  const sizes = [16, 24, 32, 48, 64, 96, 128];
  for (const s of sizes) {
    for (const pts of place(pieces(CHOSEN), { scale: s / 256, dx: x, dy: rowY - s / 2 })) cmds.push(path(poly(pts)));
    x += s + 44;
  }

  // linha 2: contraste — tinta sobre papel, acento sobre mesa, acento sobre papel
  const tileY = 300;
  const tiles = [
    { x: 60, bg: TOKENS.papel0, mark: TOKENS.papelTinta, label: "mono tinta sobre papel" },
    { x: 300, bg: null, mark: TOKENS.acento, label: "acento sobre mesa (sem fundo)" },
    { x: 540, bg: TOKENS.papel0, mark: TOKENS.acento, label: "acento sobre papel" },
  ];
  for (const t of tiles) {
    if (t.bg) {
      cmds.push(...defaults({ fill: t.bg }));
      cmds.push(rect(t.x, tileY, 148, 148, 6));
    }
    cmds.push(...defaults({ fill: t.mark }));
    for (const pts of place(pieces(CHOSEN), { scale: 128 / 256, dx: t.x + 10, dy: tileY + 10 })) cmds.push(path(poly(pts)));
  }

  // rótulos
  cmds.push(...defaults({ fill: TOKENS.tinta3 }));
  x = 60;
  for (const s of sizes) {
    cmds.push(text(x - 4, 266, `${s} px`, { size: 11 }));
    x += s + 44;
  }
  for (const t of tiles) cmds.push(text(t.x, tileY + 176, t.label, { size: 11 }));

  cmds.push(...defaults({ fill: TOKENS.tinta1 }));
  cmds.push(text(24, 44, "SELO V2 · FOLHA DE TESTE", { size: 15, style: "Bold" }));
  cmds.push(...defaults({ fill: TOKENS.tinta3 }));
  cmds.push(text(24, 62, "tamanhos reais · uma cor · reversed · teste de 16 px", { size: 11 }));
  cmds.push(text(24, H - 18, "MEDIA Rate · conceito v2 · demonstração da skill logo-design", { size: 10 }));

  cmds.push(exportSvg(FILES.teste), exportPng(FILES.testePng));
  return { cmds };
}

// ── runner ──────────────────────────────────────────────────────────────────
const BUILD_DIR = join(OUT, ".build");

function findCli() {
  const candidates = [process.env.VECTORCRAFT_CLI, "C:\\Program Files\\VectorCraft\\vectorcraft-cli.exe"];
  for (const c of candidates) if (c && existsSync(c)) return c;
  return "vectorcraft-cli"; // resolvido pelo PATH
}

function runArtifact(name, { cmds }) {
  mkdirSync(BUILD_DIR, { recursive: true });
  const jsonl = join(BUILD_DIR, `${name}.jsonl`);
  writeFileSync(jsonl, cmds.map((c) => JSON.stringify(c)).join("\n") + "\n", "utf8");
  const r = spawnSync(findCli(), ["run", "--commands", jsonl], { stdio: "inherit", encoding: "utf8" });
  if (r.status !== 0) throw new Error(`vectorcraft-cli falhou em ${name} (status ${r.status})`);
}

const artifacts = {
  exploracao: buildExploracao,
  final: () => buildMark(TOKENS.acento, FILES.final, FILES.finalPng),
  mono: () => buildMark(TOKENS.papelTinta, FILES.mono, FILES.monoPng),
  reverso: () => buildMark(TOKENS.tinta1, FILES.reverso, FILES.reversoPng, { thin: 0.97 }),
  construcao: buildConstrucao,
  teste: buildTeste,
};

const arg = process.argv.indexOf("--only");
const only = arg !== -1 ? process.argv[arg + 1].split(",") : Object.keys(artifacts);
for (const name of only) {
  if (!artifacts[name]) throw new Error(`artefato desconhecido: ${name}`);
  console.log(`\n▶ ${name}`);
  runArtifact(name, artifacts[name]());
}
console.log("\nOK — artefatos em", OUT);
