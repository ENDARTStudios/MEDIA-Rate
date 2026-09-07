/* eslint-disable no-console */
// T031 — backfill idempotente da ladder de variantes no storage próprio.
//
// Uso (local/Operador, NUNCA em CI):
//   npx tsx apps/api/scripts/backfill-variants.ts --dry-run
//   npx tsx apps/api/scripts/backfill-variants.ts
//
// Zero fetch remoto: lê apenas uploads/media/ (originais UUID.ext;
// pula *-wNNN.webp e qualquer nome fora do padrão do UploadService).
import { readdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { gerarVariantes, nomeVariante, VARIANT_WIDTHS } from "../src/modules/upload/variants.js";

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "media");
const ORIGINAL_RE = /^[a-f0-9-]{36}\.(jpg|png|gif|webp)$/;

const dryRun = process.argv.includes("--dry-run");

let dirs = 0;
let originais = 0;
let prontas = 0;
let geradas = 0;
const falhas: string[] = [];

const midias = await readdir(UPLOADS_DIR).catch(() => [] as string[]);
for (const midiaId of midias) {
  const dir = path.join(UPLOADS_DIR, midiaId);
  let arquivos: string[];
  try {
    arquivos = await readdir(dir);
  } catch {
    continue;
  }
  dirs++;
  for (const arq of arquivos) {
    if (!ORIGINAL_RE.test(arq)) continue;
    originais++;
    const faltam = VARIANT_WIDTHS.filter((w) => !arquivos.includes(nomeVariante(arq, w)));
    if (faltam.length === 0) {
      prontas++;
      continue;
    }
    console.log(`${dryRun ? "[dry-run] " : ""}${midiaId}/${arq}: faltam [${faltam.join(",")}]`);
    if (dryRun) continue;
    try {
      const ladder = await gerarVariantes(await readFile(path.join(dir, arq)));
      for (const w of faltam) {
        const buf = ladder.get(w);
        if (buf) {
          await writeFile(path.join(dir, nomeVariante(arq, w)), buf);
          geradas++;
        }
      }
    } catch (e) {
      falhas.push(`${midiaId}/${arq}: ${(e as Error)?.message ?? e}`);
    }
  }
}

console.log(
  `dirs=${dirs} originais=${originais} prontas=${prontas} variantes_geradas=${geradas} falhas=${falhas.length}`,
);
if (falhas.length > 0) {
  console.log(falhas.join("\n"));
  process.exitCode = 1;
}
