import nodePath from "node:path";
import { fileURLToPath } from "node:url";
/**
 * MEDIA Rate — logo system
 * Builds the identity document in VectorCraft Desktop (control channel, port 7979)
 * and exports the asset set. Run: node build.mjs
 */
import { VC } from "./vc.mjs";
import { C, triangleD } from "./lib.mjs";
import fs from "node:fs";

const ROOT = nodePath.resolve(nodePath.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PNG = ROOT + "\\exports\\png";
const OUT_SVG = ROOT + "\\exports\\svg";
const OUT_SRC = ROOT + "\\src";

const vc = new VC();
await vc.connect();

/* ------------------------------------------------------------------ geometry */

const f = (v) => Number(v.toFixed(2));

function roundedPolyD(pts, rho) {
  const n = pts.length;
  const nodes = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = pts[i];
    const [px, py] = pts[(i - 1 + n) % n];
    const [nx, ny] = pts[(i + 1) % n];
    const v1 = [px - x, py - y],
      v2 = [nx - x, ny - y];
    const l1 = Math.hypot(...v1),
      l2 = Math.hypot(...v2);
    const t = Math.min(rho, l1 * 0.45, l2 * 0.45);
    nodes.push({
      v: [x, y],
      a: [x + (v1[0] / l1) * t, y + (v1[1] / l1) * t],
      b: [x + (v2[0] / l2) * t, y + (v2[1] / l2) * t],
    });
  }
  let d = `M${f(nodes[0].a[0])} ${f(nodes[0].a[1])}`;
  for (let i = 0; i < n; i++) {
    const { b, v } = nodes[i];
    const next = nodes[(i + 1) % n];
    d += `Q${f(v[0])} ${f(v[1])} ${f(b[0])} ${f(b[1])}L${f(next.a[0])} ${f(next.a[1])}`;
  }
  return d + "Z";
}
const diamondPts = (cx, cy, r) => [
  [cx, cy - r],
  [cx + r, cy],
  [cx, cy + r],
  [cx - r, cy],
];

/* -------------------------------------------------------------- primitives */

async function path(
  d,
  {
    fill = null,
    stroke = null,
    weight = 1,
    cap = "round",
    join = "round",
    dash = null,
    closed = true,
  } = {},
) {
  const r = await vc.exec("path.create", { d, closed });
  if (fill) await vc.exec("paint.setFill", { ids: [r.id], color: fill });
  else await vc.exec("paint.setFill", { ids: [r.id], none: true });
  if (stroke) {
    await vc.exec("paint.setStroke", { ids: [r.id], color: stroke });
    await vc.exec("stroke.set", { ids: [r.id], weight, cap, join, dash });
  } else {
    await vc.exec("paint.setStroke", { ids: [r.id], none: true });
  }
  return r.id;
}

async function box(
  x,
  y,
  w,
  h,
  { fill = null, stroke = null, weight = 1, radius = 0, dash = null } = {},
) {
  const r = await vc.exec("shape.rectangle", { x, y, width: w, height: h, radius });
  if (fill) await vc.exec("paint.setFill", { ids: [r.id], color: fill });
  else await vc.exec("paint.setFill", { ids: [r.id], none: true });
  if (stroke) {
    await vc.exec("paint.setStroke", { ids: [r.id], color: stroke });
    await vc.exec("stroke.set", { ids: [r.id], weight, dash });
  } else {
    await vc.exec("paint.setStroke", { ids: [r.id], none: true });
  }
  return r.id;
}

async function text(
  str,
  x,
  y,
  {
    size = 14,
    font = "Inter",
    style = "Regular",
    color = C.white,
    tracking = 0,
    justify = "left",
  } = {},
) {
  const t = await vc.exec("text.create", { x, y, text: str, size, font, style, color, justify });
  if (tracking) await vc.exec("text.setStyle", { ids: [t.id], tracking });
  return t.id;
}

/* ------------------------------------------------------------------- marks */

const MARK = { radius: 0.14, play: 1.2 }; // corner radius (of r) and play scale

async function symbol(cx, cy, S, { field = C.indigo, play = C.rose } = {}) {
  const r = S / 2;
  const lozenge = await path(roundedPolyD(diamondPts(cx, cy, r), r * MARK.radius), { fill: field });
  const k = MARK.play;
  const tri = await path(triangleD(cx, cy, 0, S * 0.255 * k, S * -0.095 * k, S * 0.16 * k), {
    fill: play,
  });
  return (await vc.exec("object.group", { ids: [lozenge, tri] })).id;
}

/** One-colour symbol: the play is knocked out of the lozenge (transparent). */
async function symbolMono(cx, cy, S, color) {
  const r = S / 2;
  const k = MARK.play;
  const lozenge = await path(roundedPolyD(diamondPts(cx, cy, r), r * MARK.radius), { fill: color });
  const tri = await path(triangleD(cx, cy, 0, S * 0.255 * k, S * -0.095 * k, S * 0.16 * k), {
    fill: color,
  });
  await vc.exec("select.set", { ids: [lozenge, tri] });
  const res = await vc.exec("object.pathfinder.minusFront", {});
  return res.ids[0];
}

async function ink(id) {
  const insp = await vc.exec("document.inspect", { ids: [id] });
  return insp.nodes[0].bounds;
}
async function moveBy(id, dx, dy) {
  if (dx || dy) await vc.exec("object.move", { ids: [id], dx, dy });
}
async function group(ids) {
  return (await vc.exec("object.group", { ids })).id;
}

async function outlined(str, { size, style, tracking, color, baseline = 0 }) {
  const t = await vc.exec("text.create", {
    x: 0,
    y: baseline,
    text: str,
    size,
    font: "Space Grotesk",
    style,
    color,
  });
  await vc.exec("text.setStyle", { ids: [t.id], tracking });
  await vc.exec("tool.select", { tool: "selection" });
  await vc.exec("select.set", { ids: [t.id] });
  const out = await vc.exec("type.createOutlines", {});
  return group(out.ids);
}

/* --------------------------------------------------------------- lockups */

const CAP_RATIO = 0.7;

async function lockupOneLine({
  left = 0,
  baseline = 0,
  capH = 96,
  field = C.indigo,
  play = C.rose,
  textColor = C.white,
  mono = false,
} = {}) {
  const size = capH / CAP_RATIO;
  const media = await outlined("MEDIA", { size, style: "Bold", tracking: -20, color: textColor });
  const mediaB = await ink(media);
  const rate = await outlined("RATE", { size, style: "Light", tracking: 90, color: textColor });
  const rateB = await ink(rate);

  const markS = capH * 1.42;
  const markGap = capH * 0.44;
  const wordGap = capH * 0.72;
  const top = baseline - capH;

  await moveBy(media, left + markS + markGap - mediaB.x, top - mediaB.y);
  await moveBy(rate, left + markS + markGap + mediaB.width + wordGap - rateB.x, top - rateB.y);
  const mark = mono
    ? await symbolMono(left + markS / 2, baseline - capH / 2, markS, textColor)
    : await symbol(left + markS / 2, baseline - capH / 2, markS, { field, play });
  return { id: await group([mark, media, rate]) };
}

async function lockupStacked({
  left = 0,
  baseline = 0,
  capH = 96,
  field = C.indigo,
  play = C.rose,
  textColor = C.white,
} = {}) {
  const size = capH / CAP_RATIO;
  const rateSize = size * 0.4;
  const media = await outlined("MEDIA", { size, style: "Bold", tracking: -20, color: textColor });
  const mediaB = await ink(media);
  const rate = await outlined("RATE", {
    size: rateSize,
    style: "Light",
    tracking: 150,
    color: textColor,
  });
  const rateB = await ink(rate);

  const rateCap = rateSize * CAP_RATIO;
  const lineGap = capH * 0.24;
  const blockH = capH + lineGap + rateCap;
  const markS = blockH * 0.96;
  const markGap = blockH * 0.3;
  const blockTop = baseline - capH;

  await moveBy(media, left + markS + markGap - mediaB.x, blockTop - mediaB.y);
  await moveBy(rate, left + markS + markGap - rateB.x, blockTop + capH + lineGap - rateB.y);
  const mark = await symbol(left + markS / 2, blockTop + blockH / 2, markS, { field, play });
  return { id: await group([mark, media, rate]) };
}

async function centerOn(id, cx, cy) {
  const b = await ink(id);
  await moveBy(id, cx - (b.x + b.width / 2), cy - (b.y + b.height / 2));
  return ink(id);
}

/* --------------------------------------------------------------- document */

const ART = [
  { name: "01 primary", w: 1240, h: 380, bg: C.night },
  { name: "02 stacked", w: 760, h: 640, bg: C.night },
  { name: "03 symbol", w: 460, h: 460, bg: C.night },
  { name: "04 icon", w: 460, h: 460, bg: C.night },
  { name: "05 mono", w: 1240, h: 380, bg: C.night },
  { name: "06 light", w: 1240, h: 380, bg: "#F7F8FB" },
  { name: "07 header", w: 1360, h: 160, bg: C.night },
  { name: "08 sheet", w: 1700, h: 1500, bg: C.night },
  { name: "09 mono ink", w: 1240, h: 380, bg: "#F7F8FB" },
  { name: "10 og", w: 1200, h: 630, bg: C.night },
];
const GAP = 120;
let cursorX = 0;
for (const a of ART) {
  a.x = cursorX;
  a.y = 0;
  cursorX += a.w + GAP;
}
const A = (i) => ART[i];

/** Close every open document in this (isolated) instance so each run starts clean. */
async function resetDocs() {
  for (let i = 0; i < 8; i++) {
    const r = await vc.exec("file.closeAll", {});
    if (!r || r.pending !== "saveChanges") return;
    await vc.request("ui.dialog.set", { field: "discard", value: true });
    await vc.request("ui.dialog.confirm", {});
  }
}
await resetDocs();
const made = await vc.exec("file.new", {
  name: "MEDIA Rate — logo",
  width: ART[0].w,
  height: ART[0].h,
  units: "Points",
  colorMode: "rgb",
  backgroundContents: "transparent",
  artboards: ART.length,
  artboardLayout: { layout: "row", spacing: GAP },
});
const docIndex = made.index;
await vc.exec("tool.select", { tool: "selection" });
{
  const cur = await vc.exec("document.inspect", { depth: 0 });
  if (cur.title !== "MEDIA Rate — logo") {
    throw new Error(`wrong active document: "${cur.title}" (expected "MEDIA Rate — logo")`);
  }
}
for (let i = 0; i < ART.length; i++) {
  await vc.exec("artboard.setProps", {
    index: i,
    name: ART[i].name,
    x: ART[i].x,
    y: ART[i].y,
    width: ART[i].w,
    height: ART[i].h,
    moveArt: true,
  });
}
const boards = (await vc.exec("document.inspect", { depth: 0 })).artboards;
console.log("artboards:", JSON.stringify(boards.map((b) => [b.name, b.x, b.y, b.width, b.height])));

await vc.exec("select.none", {});
await vc.exec("paint.setStroke", { none: true });
await vc.exec("paint.setFill", { color: C.white });

const layerOf = async (name) => (await vc.exec("layer.new", { name })).id;

await layerOf("Fundo");
const bgIds = [];
for (const a of ART) bgIds.push(await box(a.x, a.y, a.w, a.h, { fill: a.bg }));

/* ----------------------------------------------------------- 01 · primary */
{
  await layerOf("01 primary");
  const a = A(0);
  const lk = await lockupOneLine({ left: 0, baseline: 260, capH: 104 });
  const b = await centerOn(lk.id, a.x + a.w / 2, a.y + a.h / 2);
  await vc.exec("object.setProps", { ids: [lk.id], name: "Logo primary" });
  console.log("01 bounds:", JSON.stringify(b));
}

/* ----------------------------------------------------------- 02 · stacked */
{
  await layerOf("02 stacked");
  const a = A(1);
  const lk = await lockupStacked({ left: 0, baseline: 300, capH: 118 });
  const b = await centerOn(lk.id, a.x + a.w / 2, a.y + a.h / 2);
  await vc.exec("object.setProps", { ids: [lk.id], name: "Logo stacked" });
  console.log("02 bounds:", JSON.stringify(b));
}

/* -------------------------------------------------------------- 03 · icon */
await layerOf("03 symbol");
let iconTile, iconSymbol;
{
  const a = A(2);
  const sg = await symbol(a.x + a.w / 2, a.y + a.h / 2, 300);
  await vc.exec("object.setProps", { ids: [sg], name: "Simbolo" });
}
{
  const a = A(3);
  const T = 320;
  const x = a.x + (a.w - T) / 2,
    y = a.y + (a.h - T) / 2;
  iconTile = await box(x, y, T, T, {
    fill: "#111120",
    radius: T * 0.225,
    stroke: "#26263C",
    weight: 1.5,
  });
  iconSymbol = await symbol(x + T / 2, y + T / 2, T * 0.58);
  const iconG = await group([iconTile, iconSymbol]);
  await vc.exec("object.setProps", { ids: [iconG], name: "Icone do app" });
}

/* --------------------------------------------------------------- 05 · mono */
{
  await layerOf("05 mono");
  const a = A(4);
  const lk = await lockupOneLine({
    left: 0,
    baseline: 260,
    capH: 104,
    textColor: C.white,
    mono: true,
  });
  await centerOn(lk.id, a.x + a.w / 2, a.y + a.h / 2);
  await vc.exec("object.setProps", { ids: [lk.id], name: "Logo mono" });
}

/* -------------------------------------------------------------- 06 · light */
{
  await layerOf("06 light");
  const a = A(5);
  const lk = await lockupOneLine({ left: 0, baseline: 260, capH: 104, textColor: C.ink });
  await centerOn(lk.id, a.x + a.w / 2, a.y + a.h / 2);
  await vc.exec("object.setProps", { ids: [lk.id], name: "Logo claro" });
}

/* ------------------------------------------------------------- 07 · header */
{
  await layerOf("07 header");
  const a = A(6);
  await lockupOneLine({ left: a.x + 48, baseline: a.y + 96, capH: 30 });
  await box(a.x, a.y + a.h - 1, a.w, 1, { fill: "#1B1B2C" });

  const nav = ["Catálogo", "Rankings", "Watchlist", "Sobre"];
  let nx = a.x + 660;
  for (const item of nav) {
    await text(item, nx, a.y + 91, {
      size: 15,
      font: "Inter",
      style: "Medium",
      color: "#A0A0B8",
      tracking: 10,
    });
    nx += 120;
  }
  await box(a.x + a.w - 172, a.y + 58, 124, 44, { fill: C.rose, radius: 10 });
  await text("Avaliar", a.x + a.w - 110, a.y + 86, {
    size: 15,
    font: "Inter",
    style: "SemiBold",
    color: C.white,
    justify: "center",
    tracking: 10,
  });
}

/* ------------------------------------------------------------- 08 · sheet */
{
  await layerOf("08 sheet");
  const a = A(7);
  const X = (v) => a.x + v;
  const Y = (v) => a.y + v;
  const MUT = "#A0A0B8",
    DIM = "#6E6E88",
    LINE = "#1E1E30",
    CARD = "#0A0A12";

  // header
  await text("IDENTIDADE VISUAL · 2026", X(80), Y(96), {
    size: 11.5,
    style: "Medium",
    color: DIM,
    tracking: 320,
  });
  await text("MEDIA RATE", X(80), Y(176), {
    size: 46,
    font: "Space Grotesk",
    style: "Bold",
    color: C.white,
    tracking: -10,
  });
  await text("sistema de logo", X(1620), Y(96), {
    size: 11.5,
    style: "Medium",
    color: DIM,
    tracking: 320,
    justify: "right",
  });
  await text("símbolo · lockups · cores · tipografia", X(1620), Y(150), {
    size: 13,
    color: MUT,
    justify: "right",
    tracking: 10,
  });
  await box(X(80), Y(210), 1540, 1, { fill: LINE });

  // hero
  const hero = await lockupOneLine({ left: 0, baseline: 0, capH: 66 });
  await centerOn(hero.id, X(850), Y(340));
  await text("O selo do que você assiste.", X(850), Y(452), {
    size: 17,
    style: "Medium",
    color: "#BEBECF",
    justify: "center",
    tracking: 20,
  });
  await box(X(80), Y(500), 1540, 1, { fill: LINE });

  // cards
  const cardW = 370,
    cardH = 250,
    cardY = 520;
  const cardX = [80, 470, 860, 1250];
  for (const cx of cardX)
    await box(X(cx), Y(cardY), cardW, cardH, { fill: CARD, stroke: LINE, weight: 1, radius: 16 });
  const cardTitle = (i, t) =>
    text(t, X(cardX[i] + 24), Y(cardY + 40), {
      size: 13,
      style: "SemiBold",
      color: C.white,
      tracking: 10,
    });
  const cardNote = (i, t) =>
    text(t, X(cardX[i] + 24), Y(cardY + cardH - 22), { size: 10.5, color: DIM, tracking: 20 });

  // 1 · symbol
  await cardTitle(0, "Símbolo");
  await symbol(X(cardX[0] + cardW / 2), Y(cardY + 128), 104);
  await cardNote(0, "losango · play · duas cores");

  // 2 · construction
  await cardTitle(1, "Construção");
  {
    const cx = X(cardX[1] + cardW / 2),
      cy = Y(cardY + 128),
      R = 50;
    await box(cx - R, cy - R, R * 2, R * 2, { stroke: "#3A3A55", weight: 0.8, dash: [4, 4] });
    const dia = await path(roundedPolyD(diamondPts(cx, cy, R), 0), {
      stroke: "#3A3A55",
      weight: 0.8,
      dash: [4, 4],
    });
    const circ = await vc.exec("shape.ellipse", {
      x: cx - R,
      y: cy - R,
      width: R * 2,
      height: R * 2,
    });
    await vc.exec("paint.setFill", { ids: [circ.id], none: true });
    await vc.exec("paint.setStroke", { ids: [circ.id], color: "#3A3A55" });
    await vc.exec("stroke.set", { ids: [circ.id], weight: 0.8, dash: [4, 4] });
    await symbol(cx, cy, 100);
    await cardNote(1, "canto 14% · play 1,2× · grade 64");
  }

  // 3 · protection
  await cardTitle(2, "Área de proteção");
  {
    const cx = X(cardX[2] + cardW / 2),
      cy = Y(cardY + 128),
      S = 84,
      m = S / 2;
    await box(cx - S / 2 - m, cy - S / 2 - m, S + m * 2, S + m * 2, {
      stroke: "#3A3A55",
      weight: 0.8,
      dash: [4, 4],
    });
    await symbol(cx, cy, S);
  }
  await cardNote(2, "margem mínima = ½ do símbolo");

  // 4 · minimum sizes
  await cardTitle(3, "Tamanhos mínimos");
  {
    const base = Y(cardY + 176);
    const sizes = [48, 32, 24, 16];
    let sx = X(cardX[3] + 30);
    for (const s of sizes) {
      await symbol(sx + s / 2, base - s / 2, s, {
        field: s >= 24 ? C.indigo : C.indigo,
        play: C.rose,
      });
      await text(String(s), sx + s / 2, base + 22, { size: 9.5, color: DIM, justify: "center" });
      sx += s + 34;
    }
  }
  await cardNote(3, "16 px é o mínimo digital");

  // colors + type
  await text("CORES", X(80), Y(846), { size: 11.5, style: "Medium", color: DIM, tracking: 320 });
  const chips = [
    { name: "Night", hex: C.night, border: "#34344F", note: "fundo" },
    { name: "Indigo", hex: C.indigo, border: null, note: "símbolo" },
    { name: "Rose", hex: C.rose, border: null, note: "score" },
    { name: "White", hex: C.white, border: null, note: "tipografia" },
  ];
  let chipX = 80;
  for (const chip of chips) {
    await box(X(chipX), Y(872), 128, 128, {
      fill: chip.hex,
      radius: 14,
      stroke: chip.border,
      weight: 1,
    });
    await text(chip.name, X(chipX), Y(1032), { size: 13, style: "SemiBold", color: C.white });
    await text(chip.hex.toUpperCase(), X(chipX), Y(1052), {
      size: 10.5,
      font: "JetBrains Mono",
      color: MUT,
    });
    chipX += 148;
  }
  await text("O indigo carrega o selo; o rose marca a nota.", X(80), Y(1100), {
    size: 12,
    color: MUT,
    tracking: 10,
  });
  await text("Sobre fundo claro, o símbolo mantém as duas cores", X(80), Y(1120), {
    size: 12,
    color: MUT,
    tracking: 10,
  });
  await text("e a tipografia passa a tinta (#0F172A).", X(80), Y(1140), {
    size: 12,
    color: MUT,
    tracking: 10,
  });

  await text("TIPOGRAFIA", X(900), Y(846), {
    size: 11.5,
    style: "Medium",
    color: DIM,
    tracking: 320,
  });
  {
    const media = await outlined("MEDIA", {
      size: 48,
      style: "Bold",
      tracking: -20,
      color: C.white,
    });
    const mb = await ink(media);
    await moveBy(media, X(900) - mb.x, Y(940) - (mb.y + mb.height));
    await text("Space Grotesk · Bold 700 · tracking −20", X(900), Y(962), {
      size: 10.5,
      font: "JetBrains Mono",
      color: DIM,
    });

    const rate = await outlined("RATE", {
      size: 34,
      style: "Light",
      tracking: 170,
      color: C.white,
    });
    const rb = await ink(rate);
    await moveBy(rate, X(900) - rb.x, Y(1010) - (rb.y + rb.height));
    await text("Space Grotesk · Light 300 · tracking +90", X(900), Y(1032), {
      size: 10.5,
      font: "JetBrains Mono",
      color: DIM,
    });

    await text("MEDIA em peso 700, RATE em 300 com entreletra", X(900), Y(1080), {
      size: 12,
      color: MUT,
      tracking: 10,
    });
    await text("ampla: o contraste de peso separa o assunto da ação.", X(900), Y(1100), {
      size: 12,
      color: MUT,
      tracking: 10,
    });
  }

  // versions
  await box(X(80), Y(1170), 1540, 1, { fill: LINE });
  await text("VERSÕES", X(80), Y(1208), { size: 11.5, style: "Medium", color: DIM, tracking: 320 });
  {
    const py = 1230,
      ph = 180,
      pw = 370;
    const pxs = [80, 470, 860, 1250];
    const labels = ["lockup vertical", "mono positivo", "fundo claro", "ícone do app"];
    for (let i = 0; i < 4; i++) {
      const light = i === 2;
      await box(X(pxs[i]), Y(py), pw, ph, {
        fill: light ? "#F7F8FB" : CARD,
        stroke: light ? null : LINE,
        weight: 1,
        radius: 16,
      });
      const cxp = X(pxs[i] + pw / 2),
        cyp = Y(py + ph / 2);
      if (i === 0)
        await centerOn((await lockupStacked({ left: 0, baseline: 0, capH: 32 })).id, cxp, cyp);
      if (i === 1)
        await centerOn(
          (await lockupOneLine({ left: 0, baseline: 0, capH: 28, textColor: C.white, mono: true }))
            .id,
          cxp,
          cyp,
        );
      if (i === 2)
        await centerOn(
          (await lockupOneLine({ left: 0, baseline: 0, capH: 28, textColor: C.ink })).id,
          cxp,
          cyp,
        );
      if (i === 3) {
        const T = 88;
        await box(cxp - T / 2, cyp - T / 2, T, T, {
          fill: "#111120",
          radius: T * 0.225,
          stroke: "#26263C",
          weight: 1.2,
        });
        await symbol(cxp, cyp, T * 0.58);
      }
      await text(labels[i], X(pxs[i] + 24), Y(py + ph + 24), {
        size: 10.5,
        color: DIM,
        tracking: 20,
      });
    }
  }

  await box(X(80), Y(1462), 1540, 1, { fill: LINE });
  await text("MEDIA Rate · identidade visual v1.0", X(80), Y(1488), {
    size: 11,
    color: DIM,
    tracking: 20,
  });
  await text("construído no VectorCraft · 2026", X(1620), Y(1488), {
    size: 11,
    color: DIM,
    tracking: 20,
    justify: "right",
  });
}

/* ---------------------------------------------------------- 09 · mono ink */
{
  await layerOf("09 mono ink");
  const a = A(8);
  const lk = await lockupOneLine({
    left: 0,
    baseline: 260,
    capH: 104,
    textColor: C.ink,
    mono: true,
  });
  await centerOn(lk.id, a.x + a.w / 2, a.y + a.h / 2);
  await vc.exec("object.setProps", { ids: [lk.id], name: "Logo mono ink" });
}

/* ------------------------------------------------------------------ 10 · og */
{
  await layerOf("10 og");
  const a = A(9);
  const lk = await lockupOneLine({ left: 0, baseline: 0, capH: 54 });
  await centerOn(lk.id, a.x + a.w / 2, a.y + 258);
  await vc.exec("object.setProps", { ids: [lk.id], name: "Logo og" });

  await text("Descubra seu próximo título favorito com o MEDIA Score™", a.x + a.w / 2, a.y + 378, {
    size: 28,
    font: "Inter",
    style: "Medium",
    color: "#BEBECF",
    justify: "center",
  });
  await text("FILMES · SÉRIES · GAMES · LIVROS", a.x + a.w / 2, a.y + 446, {
    size: 12,
    font: "JetBrains Mono",
    color: "#6E6E88",
    justify: "center",
    tracking: 260,
  });

  await box(a.x + 80, a.y + 534, a.w - 160, 1, { fill: "#1E1E30" });
  await text("mediarate.app", a.x + 80, a.y + 578, {
    size: 13,
    font: "JetBrains Mono",
    color: "#6E6E88",
  });
  await text("MEDIA Rate · 2026", a.x + a.w - 80, a.y + 578, {
    size: 13,
    font: "JetBrains Mono",
    color: "#6E6E88",
    justify: "right",
  });
}

await vc.exec("select.none", {});
{
  const cur = await vc.exec("document.inspect", { depth: 0 });
  if (cur.title !== "MEDIA Rate — logo") throw new Error(`active document changed: ${cur.title}`);
}
await vc.exec("document.save", { path: OUT_SRC + "\\media-rate-logo.vectorcraft" });
console.log("saved →", OUT_SRC + "\\media-rate-logo.vectorcraft");
await vc.exec("file.close", {});
vc.close();
