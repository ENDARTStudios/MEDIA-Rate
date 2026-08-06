/**
 * check-encoding-bom.ts (T196 / D-210 reforçada) — guard de CI contra
 * corrupção de encoding/BOM em arquivos críticos.
 *
 * Falha se QUALQUER arquivo monitorado tiver:
 * - BOM UTF-8 (EF BB BF) ou UTF-16 (FF FE / FE FF) no início;
 * - sequências de mojibake (Ã§, Ã£, â€, etc.) — resultado clássico de
 *   regravação com encoding errado (ex.: PowerShell Set-Content).
 *
 * Uso: node scripts/check-encoding-bom.ts  (exit 0 = limpo).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const MOJIBAKE_RE = /Ã§|Ã£|Ã©|Ãª|Ã­|Ã³|Ã¡|Ãµ|Ã±|Ãº|Ã¼|Ã¶|Ã¨|Ã¢|Ã¤|â€|Ãˆ|Ã‰|ÃŠ|Ã‹/;

const ARQUIVOS = [
  "apps/web/src/messages/pt-BR.json",
  "apps/web/src/messages/en-US.json",
  "apps/web/src/messages/es-ES.json",
  "apps/web/package.json",
  "apps/api/package.json",
  "package.json",
  "apps/api/prisma/schema.prisma",
];

let falhas = 0;

for (const rel of ARQUIVOS) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) {
    console.error(`[guard] arquivo ausente: ${rel}`);
    falhas++;
    continue;
  }
  const buf = fs.readFileSync(p);
  const prim = [buf[0], buf[1], buf[2]];
  const temBom =
    (prim[0] === 0xef && prim[1] === 0xbb && prim[2] === 0xbf) ||
    (prim[0] === 0xff && prim[1] === 0xfe) ||
    (prim[0] === 0xfe && prim[1] === 0xff);

  const texto = buf.toString("utf8");
  const mojibake = MOJIBAKE_RE.test(texto);

  if (temBom || mojibake) {
    console.error(
      `[guard] FALHA ${rel}:${temBom ? " BOM presente" : ""}${mojibake ? " mojibake presente" : ""}`,
    );
    falhas++;
  } else {
    console.log(`[guard] ok ${rel}`);
  }
}

if (falhas > 0) {
  console.error(`\n[guard] ${falhas} arquivo(s) com problema de encoding/BOM.`);
  process.exit(1);
}
console.log("\n[guard] todos os arquivos críticos limpos.");
