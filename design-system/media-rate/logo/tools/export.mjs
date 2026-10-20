import path from "node:path";
import { fileURLToPath } from "node:url";
/**
 * Exports the MEDIA Rate logo asset set from the saved VectorCraft document.
 * Run: node export.mjs
 */
import fs from "node:fs";
import { VC } from "./vc.mjs";
import { C } from "./lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = ROOT + "\\src\\media-rate-logo.vectorcraft";
const OUT_PNG = ROOT + "\\exports\\png";
const OUT_SVG = ROOT + "\\exports\\svg";
const OUT_PDF = ROOT + "\\exports\\pdf";

for (const d of [OUT_PNG, OUT_SVG, OUT_PDF]) fs.mkdirSync(d, { recursive: true });

const vc = new VC();
await vc.connect();

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
const opened = await vc.exec("document.open", { path: SRC });
await vc.exec("document.activate", { index: opened.index });
{
  const cur = await vc.exec("document.inspect", { depth: 0 });
  if (!/media-rate-logo/i.test(cur.title)) throw new Error(`wrong document: ${cur.title}`);
}

const log = [];

/* 1 · presentation PNGs (artboard exports, background included) */
const boards = [
  [0, "01-primary"],
  [1, "02-stacked"],
  [2, "03-symbol"],
  [3, "04-icon"],
  [4, "05-mono"],
  [5, "06-light"],
  [6, "07-header"],
  [7, "08-brand-sheet"],
  [8, "09-mono-ink"],
];
for (const [i, name] of boards) {
  const r = await vc.exec("document.export", {
    path: `${OUT_PNG}\\${name}@2x.png`,
    format: "png",
    artboard: i,
    scale: 2,
  });
  log.push(`png ${name} ${r.bytes}b`);
}

/* 2 · brand sheet PDF */
{
  const r = await vc.exec("document.export", {
    path: `${OUT_PDF}\\media-rate-brand-sheet.pdf`,
    format: "pdf",
    artboards: [7],
  });
  log.push(`pdf ${r.bytes}b`);
}

/* 3 · hide the background layer for transparent assets */
const tree = await vc.exec("document.inspect", { depth: 2 });
function findLayer(nodes, name) {
  for (const n of nodes || []) {
    if (n.kind === "Layer" && n.name === name) return n;
    const hit = findLayer(n.children, name);
    if (hit) return hit;
  }
  return null;
}
const bgLayer = findLayer(tree.layers, "Fundo");
if (!bgLayer) throw new Error("background layer not found");
await vc.exec("layer.setProps", { ids: [bgLayer.id], visible: false });

const findId = async (name) => {
  const r = await vc.exec("document.find", { name });
  if (!r.matches?.length) throw new Error(`not found: ${name}`);
  return r.matches[0].id;
};
const boundsOf = async (id) => (await vc.exec("document.inspect", { ids: [id] })).nodes[0].bounds;

async function exportSvg(name, file) {
  const id = await findId(name);
  await vc.exec("select.set", { ids: [id] });
  const r = await vc.exec("document.export", {
    path: `${OUT_SVG}\\${file}`,
    format: "svg",
    selectedOnly: true,
    useArtboards: false,
    decimals: 3,
  });
  log.push(`svg ${file} ${r.bytes}b`);
  return r;
}
async function exportPngRect(name, file, scale) {
  const id = await findId(name);
  const b = await boundsOf(id);
  const r = await vc.exec("document.export", {
    path: `${OUT_PNG}\\${file}`,
    format: "png",
    rect: [b.x, b.y, b.width, b.height],
    scale,
    background: "transparent",
  });
  log.push(`png ${file} ${r.bytes}b`);
  return r;
}

const ASSETS = [
  ["Logo primary", "media-rate-logo-primary.svg"],
  ["Logo stacked", "media-rate-logo-stacked.svg"],
  ["Simbolo", "media-rate-symbol.svg"],
  ["Icone do app", "media-rate-icon.svg"],
  ["Logo mono", "media-rate-logo-mono-white.svg"],
  ["Logo claro", "media-rate-logo-light.svg"],
  ["Logo mono ink", "media-rate-logo-mono-ink.svg"],
];
for (const [name, file] of ASSETS) await exportSvg(name, file);

/* 4 · transparent PNGs */
// primary lockup (white type: dark backgrounds)
for (const [suffix, scale] of [
  ["@2x", 2],
  ["@3x", 3],
  ["@1x", 1],
]) {
  await exportPngRect("Logo primary", `media-rate-logo-primary${suffix}.png`, scale);
}
// versions for light backgrounds and one-colour use
await exportPngRect("Logo claro", "media-rate-logo-light@2x.png", 2);
await exportPngRect("Logo mono ink", "media-rate-logo-mono-ink@2x.png", 2);
await exportPngRect("Logo mono", "media-rate-logo-mono-white@2x.png", 2);
await exportPngRect("Logo stacked", "media-rate-logo-stacked@2x.png", 2);
// symbol
for (const px of [128, 256, 512, 1024]) {
  const b = await boundsOf(await findId("Simbolo"));
  const scale = px / b.width;
  await exportPngRect("Simbolo", `media-rate-symbol-${px}.png`, scale);
}
// icon tile + favicons
for (const px of [512, 384, 192, 180]) {
  const b = await boundsOf(await findId("Icone do app"));
  await exportPngRect("Icone do app", `media-rate-icon-${px}.png`, px / b.width);
}
for (const px of [48, 32, 16]) {
  const b = await boundsOf(await findId("Icone do app"));
  await exportPngRect("Icone do app", `favicon-${px}.png`, px / b.width);
}

/* 5 · restore the background layer */
await vc.exec("layer.setProps", { ids: [bgLayer.id], visible: true });
await vc.exec("select.none", {});
await vc.exec("file.close", { index: opened.index });

fs.writeFileSync(ROOT + "\\exports\\manifest.txt", log.join("\n") + "\n", "utf8");
console.log(log.join("\n"));
console.log(`\n${log.length} files`);
vc.close();
