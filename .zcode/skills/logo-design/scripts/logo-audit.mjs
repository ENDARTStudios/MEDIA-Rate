#!/usr/bin/env node
/**
 * logo-audit.mjs — auditoria determinística de um SVG de logo do MEDIA Rate.
 *
 * Reimplementa, no nosso vocabulário, a ideia do `svg_audit.py` da skill
 * externa logo-design (MIT, kaankiziltug): um master de logo é geometria pura,
 * uma cor por vez, sem dependências de fonte/raster/efeito, com folga de
 * viewBox, eixo centrado e nenhum detalhe que fecha a 16 px.
 *
 * Uso:
 *   node .zcode/skills/logo-design/scripts/logo-audit.mjs <arquivo.svg> [...]
 *   node .zcode/skills/logo-design/scripts/logo-audit.mjs --json <arquivo.svg>
 *
 * Regras: FAIL quebra a entrega (exit 1); WARN é julgamento (revisar à mão).
 * Não substitui o teste visual: depois do audit, renderize o PNG e OLHE.
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const args = process.argv.slice(2);
const json = args.includes("--json");
const files = args.filter((a) => !a.startsWith("--"));

if (files.length === 0) {
  console.error("uso: logo-audit.mjs [--json] <logo.svg> [...]");
  process.exit(2);
}

const TINY_RATIO = 1 / 32; // menor vão legível a 16 px (regra de bolso da skill)
const MIN_PADDING = 0.02; // 2% de folga no viewBox
const MAX_PADDING = 0.2; // 20% já é sobra
const ASPECT_MIN = 0.8;
const ASPECT_MAX = 1.25;
const MAX_COLORS = 3;
const MAX_ANCHORS = 60;
const ANGLE_TOL = 1; // graus de tolerância para "ângulo inteiro"
const WHOLE_ANGLES = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180];

/** Coleta os elementos de geometria, sem parser XML completo. */
function geometry(svg) {
  const shapes = [];
  for (const m of svg.matchAll(/<polygon\b[^>]*\bpoints="([^"]+)"/g)) {
    const nums = m[1].trim().split(/[\s,]+/).map(Number);
    const pts = [];
    for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
    if (pts.length >= 3) shapes.push({ kind: "polygon", points: pts });
  }
  for (const m of svg.matchAll(/<rect\b[^>]*?\bx="([-\d.]+)"[^>]*?\by="([-\d.]+)"[^>]*?\bwidth="([-\d.]+)"[^>]*?\bheight="([-\d.]+)"/g)) {
    const [x, y, w, h] = m.slice(1, 5).map(Number);
    shapes.push({ kind: "rect", points: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]] });
  }
  for (const m of svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)) {
    const d = m[1];
    if (/[a-z]/.test(d.replace(/[zZ]/g, ""))) {
      shapes.push({ kind: "path-relativo", d }); // não auditado a fundo
      continue;
    }
    const pairs = [...d.matchAll(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g)].map((p) => [Number(p[1]), Number(p[2])]);
    if (pairs.length >= 2) shapes.push({ kind: "path", points: pairs, d });
  }
  return shapes;
}

const bbox = (shapes) => {
  const pts = shapes.filter((s) => s.points).flatMap((s) => s.points);
  if (pts.length === 0) return null;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
};

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Distância ponto–segmento. */
function pointSeg(p, a, b) {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const wx = p[0] - a[0];
  const wy = p[1] - a[1];
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2));
  return dist(p, [a[0] + t * vx, a[1] + t * vy]);
}

const segments = (pts, closed = true) => {
  const segs = [];
  for (let i = 0; i < pts.length - 1; i += 1) segs.push([pts[i], pts[i + 1]]);
  if (closed) segs.push([pts[pts.length - 1], pts[0]]);
  return segs;
};

/** Menor distância entre duas formas (0 = se tocam/sobrepõem). */
function shapeGap(a, b) {
  let min = Infinity;
  for (const [p, q] of segments(a)) for (const [r, s] of segments(b)) {
    min = Math.min(min, pointSeg(p, r, s), pointSeg(q, r, s), pointSeg(r, p, q), pointSeg(s, p, q));
  }
  return min;
}

function audit(file) {
  const svg = readFileSync(file, "utf8");
  const out = [];
  const add = (level, code, msg) => out.push({ level, code, msg });

  const vb = svg.match(/<svg\b[^>]*\bviewBox="([^"]+)"/);
  let vbBox = null;
  if (!vb) add("FAIL", "viewBox", "sem viewBox — o logo não escala");
  else {
    const [x, y, w, h] = vb[1].trim().split(/[\s,]+/).map(Number);
    vbBox = { x, y, w, h };
    if (!(w > 0 && h > 0)) add("FAIL", "viewBox", `viewBox inválido (${vb[1]})`);
    const ratio = w / h;
    if (ratio < 0.5 || ratio > 2) add("WARN", "viewBox-proporcao", `viewBox ${w}×${h} muito alongado`);
  }

  // dependências proibidas num master
  const forbidden = [
    [/<text\b/, "text", "<text> vivo: fonte não embutida muda de máquina para máquina"],
    [/font-family/i, "font-family", "font-family no arquivo: contorne a tipografia"],
    [/<image\b/, "image", "raster embutido: não é vetor"],
    [/<filter\b/, "filter", "filtro/efeito: renderiza diferente em cada saída"],
    [/currentColor/, "currentColor", "currentColor não resolvido: cor indefinida fora do CSS"],
    [/url\(#/, "referencia-id", "referência url(#…) a def/efeito: confira se o alvo existe e é suportado"],
  ];
  for (const [re, code, msg] of forbidden) if (re.test(svg)) add("FAIL", code, msg);
  for (const [re, code, msg] of [
    [/<mask\b/, "mask", "mask no master: prefira geometria (fill-rule/evenodd)"],
    [/<clipPath\b/, "clipPath", "clipPath no master: prefira geometria"],
    [/<(linear|radial)Gradient\b/, "gradiente", "gradiente: mantenha um master de cor chapada ao lado"],
  ]) if (re.test(svg)) add("WARN", code, msg);
  if (!/<title\b/.test(svg)) add("WARN", "title", "sem <title>: logo sem nome acessível");

  // cores chapadas
  const colors = new Set();
  for (const m of svg.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{3,8})"/g)) colors.add(m[1].toLowerCase());
  if (colors.size > MAX_COLORS) add("WARN", "cores", `${colors.size} cores (máx. sugerido ${MAX_COLORS}): ${[...colors].join(", ")}`);

  // strokes não expandidos
  for (const m of svg.matchAll(/stroke-width="([\d.]+)"/g)) {
    if (Number(m[1]) > 0) {
      add("WARN", "stroke", `stroke-width ${m[1]}: expanda para contorno antes de entregar o master`);
      break;
    }
  }

  // geometria
  const shapes = geometry(svg);
  if (shapes.length === 0) add("FAIL", "geometria", "nenhuma forma geométrica reconhecida");
  if (shapes.some((s) => s.kind === "path-relativo")) add("WARN", "path-relativo", "há path com comandos relativos: bbox/gap não auditados nesse trecho");

  // precisão decimal exagerada
  const longDecimal = [...svg.matchAll(/-?\d+\.(\d{3,})/g)];
  if (longDecimal.length > 0) add("WARN", "precisao", `${longDecimal.length} coordenada(s) com mais de 2 casas decimais`);

  // âncoras demais
  const anchorCount = shapes.reduce((n, s) => n + (s.points ? s.points.length : 0), 0);
  if (anchorCount > MAX_ANCHORS) add("WARN", "complexidade", `${anchorCount} âncoras (máx. sugerido ${MAX_ANCHORS}): simplifique`);

  const bb = bbox(shapes);
  if (bb && vbBox) {
    const w = bb.x1 - bb.x0;
    const h = bb.y1 - bb.y0;
    const padL = bb.x0 - vbBox.x;
    const padR = vbBox.x + vbBox.w - bb.x1;
    const padT = bb.y0 - vbBox.y;
    const padB = vbBox.y + vbBox.h - bb.y1;
    const padMin = Math.min(padL, padR, padT, padB);
    const padRef = Math.min(vbBox.w, vbBox.h);
    if (padMin < padRef * MIN_PADDING) add("WARN", "folga", `folga mínima ${padMin.toFixed(1)} u (< ${(MIN_PADDING * 100).toFixed(0)}% do canvas)`);
    if (padMin > padRef * MAX_PADDING) add("WARN", "folga", `folga mínima ${padMin.toFixed(1)} u (> ${(MAX_PADDING * 100).toFixed(0)}%): viewBox grande demais`);
    const aspect = w / h;
    if (aspect < ASPECT_MIN || aspect > ASPECT_MAX) add("WARN", "proporcao", `bbox ${w.toFixed(0)}×${h.toFixed(0)} (${aspect.toFixed(2)}:1) fora de 0,8–1,25:1`);
    const cx = (bb.x0 + bb.x1) / 2 - (vbBox.x + vbBox.w / 2);
    const cy = (bb.y0 + bb.y1) / 2 - (vbBox.y + vbBox.h / 2);
    if (Math.abs(cx) > vbBox.w * 0.02 || Math.abs(cy) > vbBox.h * 0.02) {
      add("WARN", "centro", `bbox fora do centro em (${cx.toFixed(1)}, ${cy.toFixed(1)}) u: confira o centro óptico`);
    }

    // ângulos "quase" (só polígonos)
    let nearMiss = null;
    outer: for (const s of shapes.filter((x) => x.kind === "polygon")) {
      const pts = s.points;
      for (let i = 0; i < pts.length; i += 1) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
        const norm = ((ang % 180) + 180) % 180;
        const near = WHOLE_ANGLES.some((t) => Math.abs(((t % 180) + 180) % 180 - norm) <= ANGLE_TOL);
        if (!near) {
          nearMiss = norm;
          break outer;
        }
      }
    }
    if (nearMiss !== null) add("WARN", "angulo", `aresta a ${nearMiss.toFixed(1)}° não é ângulo inteiro (0/15/30/45/60/90…)`);

    // vão entre formas fechadas: precisa sobreviver a 16 px
    const closed = shapes.filter((x) => x.points && (x.kind === "polygon" || x.kind === "rect" || /[zZ]/.test(x.d || "")));
    if (closed.length >= 2 && closed.length <= 8) {
      let minGap = Infinity;
      for (let i = 0; i < closed.length; i += 1)
        for (let j = i + 1; j < closed.length; j += 1) minGap = Math.min(minGap, shapeGap(closed[i].points, closed[j].points));
      if (minGap < w * TINY_RATIO) add("FAIL", "vao", `vão de ${minGap.toFixed(1)} u entre formas (< 1/32 da largura): fecha a 16 px`);
    }
  }

  return { file: basename(file), out };
}

const reports = files.map(audit);
if (json) {
  console.log(JSON.stringify(reports, null, 2));
} else {
  let failed = 0;
  for (const r of reports) {
    const fails = r.out.filter((x) => x.level === "FAIL").length;
    const warns = r.out.filter((x) => x.level === "WARN").length;
    const icon = fails > 0 ? "✗" : warns > 0 ? "!" : "✓";
    console.log(`\n${icon} ${r.file}  —  ${fails} FAIL · ${warns} WARN`);
    for (const x of r.out) console.log(`   ${x.level === "FAIL" ? "FAIL" : "warn"}  ${x.code}: ${x.msg}`);
    if (fails > 0) failed += 1;
  }
  console.log(failed > 0 ? `\n${failed} arquivo(s) reprovado(s).` : "\nAuditoria estrutural ok — falta o teste visual (renderize o PNG e OLHE).");
  process.exitCode = failed > 0 ? 1 : 0;
}
