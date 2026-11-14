#!/usr/bin/env node
/**
 * logo-render.mjs — renderiza um SVG de logo em PNG nos tamanhos de teste.
 *
 * Usa o `vectorcraft-cli convert` (ArtCraft) para rasterizar e confere as
 * dimensões do PNG lendo o cabeçalho IHDR — sem dependências. É o passo que
 * fecha o ciclo obrigatório da skill: depois do audit estático, renderizar e
 * OLHAR o PNG (tool de imagem), principalmente nos 16/24/32 px.
 *
 * Uso:
 *   node .zcode/skills/logo-design/scripts/logo-render.mjs <logo.svg> [--sizes 16,24,32,64,512]
 *        [--out <dir>]
 *
 * Saída padrão: <dir do svg>/renders/<nome>-<size>.png
 * Exit 1 se um PNG não for gerado ou vier com dimensão errada.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith("--"));
if (!file) {
  console.error("uso: logo-render.mjs <logo.svg> [--sizes 16,24,32,64,512] [--out DIR]");
  process.exit(2);
}
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const sizes = String(flag("sizes", "16,24,32,64,512"))
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n) && n > 0);
const outDir = resolve(flag("out", join(dirname(resolve(file)), "renders")));

function findCli() {
  for (const c of [process.env.VECTORCRAFT_CLI, "C:\\Program Files\\VectorCraft\\vectorcraft-cli.exe"]) {
    if (c && existsSync(c)) return c;
  }
  return "vectorcraft-cli"; // PATH
}

/** viewBox → largura em unidades; o scale do convert é "pixels por ponto". */
function viewBoxWidth(svgPath) {
  const svg = readFileSync(svgPath, "utf8");
  const m = svg.match(/<svg\b[^>]*\bviewBox="([^"]+)"/);
  if (!m) throw new Error(`${svgPath}: sem viewBox — não dá para calcular o scale`);
  return Number(m[1].trim().split(/[\s,]+/)[2]);
}

/** Dimensões de um PNG pelo IHDR (bytes 16..24, big-endian). */
function pngSize(pngPath) {
  const b = readFileSync(pngPath);
  if (b.length < 24 || b.toString("ascii", 1, 4) !== "PNG") throw new Error(`${pngPath}: não é PNG`);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

const cli = findCli();
const vbWidth = viewBoxWidth(resolve(file));
mkdirSync(outDir, { recursive: true });

let failed = 0;
console.log(`vectorcraft-cli: ${cli}`);
console.log(`viewBox: ${vbWidth} u · saída: ${outDir}\n`);
for (const size of sizes) {
  const base = file.replace(/^.*[\\/]/, "").replace(/\.svg$/i, "");
  const png = join(outDir, `${base}-${size}.png`);
  const scale = size / vbWidth;
  const r = spawnSync(cli, ["convert", resolve(file), png, "--scale", String(scale)], {
    stdio: "inherit",
    encoding: "utf8",
  });
  if (r.status !== 0 || !existsSync(png)) {
    console.log(`  ✗ ${size} px — conversão falhou (status ${r.status})`);
    failed += 1;
    continue;
  }
  const { width, height } = pngSize(png);
  const ok = width === size && height === size;
  console.log(`  ${ok ? "✓" : "✗"} ${String(size).padStart(4)} px → ${width}×${height} (${statSync(png).size} B)`);
  if (!ok) failed += 1;
}
console.log(failed ? `\n${failed} render(es) com problema.` : "\nRenders ok — agora OLHE os PNGs (16 e 32 px primeiro).");
process.exitCode = failed ? 1 : 0;

