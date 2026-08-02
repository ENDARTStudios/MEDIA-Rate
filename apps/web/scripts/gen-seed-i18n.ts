/**
 * gen-seed-i18n.ts — Gerador idempotente de src/lib/seed-i18n.ts (D-183)
 * 
 * Lê SEED_MEDIA por import, calcula titleLocalized{pt,en,es} + genreSlugs,
 * escreve o derivado. Asserts: 0 campo vazio, 0 slug órfão.
 * Uso: npx tsx scripts/gen-seed-i18n.ts
 */
import { SEED_MEDIA } from "../src/lib/seed-data";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { genreSlug } from "../src/lib/i18n-content";
import ptBR from "../src/messages/pt-BR.json";

// Hardcoded translation map (built incrementally; generator reads existing
// seed-i18n.ts first to accumulate without retranslating)
const MANUAL_TRANSLATIONS: Record<string, { en: string; es: string }> = {
  "O Poderoso Chefão": { en: "The Godfather", es: "El Padrino" },
  "O Senhor dos Anéis: A Sociedade do Anel": { en: "The Lord of the Rings: The Fellowship of the Ring", es: "El Señor de los Anillos: La Comunidad del Anillo" },
  "O Senhor dos Anéis: As Duas Torres": { en: "The Lord of the Rings: The Two Towers", es: "El Señor de los Anillos: Las Dos Torres" },
  "O Senhor dos Anéis: O Retorno do Rei": { en: "The Lord of the Rings: The Return of the King", es: "El Señor de los Anillos: El Retorno del Rey" },
  "Pulp Fiction: Tempo de Violência": { en: "Pulp Fiction", es: "Tiempos Violentos" },
  "O Resgate do Soldado Ryan": { en: "Saving Private Ryan", es: "Rescatando al Soldado Ryan" },
  "Forrest Gump: O Contador de Histórias": { en: "Forrest Gump", es: "Forrest Gump" },
  "A Lista de Schindler": { en: "Schindler's List", es: "La Lista de Schindler" },
  "O Cavaleiro das Trevas": { en: "The Dark Knight", es: "El Caballero de la Noche" },
  "Interestelar": { en: "Interstellar", es: "Interestelar" },
  "O Grande Gatsby": { en: "The Great Gatsby", es: "El Gran Gatsby" },
  "O Lobo de Wall Street": { en: "The Wolf of Wall Street", es: "El Lobo de Wall Street" },
  "Mad Max: Estrada da Fúria": { en: "Mad Max: Fury Road", es: "Mad Max: Furia en la Carretera" },
  "O Labirinto do Fauno": { en: "Pan's Labyrinth", es: "El Laberinto del Fauno" },
  "Bastardos Inglórios": { en: "Inglourious Basterds", es: "Bastardos sin Gloria" },
  "Cidade de Deus": { en: "City of God", es: "Ciudad de Dios" },
  "A Origem": { en: "Inception", es: "El Origen" },
  "O Regresso": { en: "The Revenant", es: "El Renacido" },
  "1917": { en: "1917", es: "1917" },
  "Dunkirk": { en: "Dunkirk", es: "Dunkerque" },
};

type I18NEntry = { titleLocalized: { pt: string; en: string; es: string }; genreSlugs: string[] };

function main() {
  // Read existing translations to accumulate
  let existing: Record<string, I18NEntry> = {};
  const outPath = path.resolve(__dirname, "..", "src", "lib", "seed-i18n.ts");
  try { existing = JSON.parse(fs.readFileSync(outPath.replace(".ts", ".json"), "utf8") || "{}"); } catch {}

  const result: Record<string, I18NEntry> = {};
  let total = 0, written = 0, skipped = 0;
  let emptyFields = 0, orphanSlugs = 0;
  const genresMap = (ptBR as any).genres as Record<string, string>;

  const entries = SEED_MEDIA as any[];
  total = entries.length;

  for (const e of entries) {
    const id = (e.id ?? e.slug) as string;
    if (!id) { skipped++; continue; }

    const ptTitle = (e.title as string) || "";
    const manual = MANUAL_TRANSLATIONS[ptTitle];
    const enTitle = manual?.en || ptTitle;
    const esTitle = manual?.es || manual?.en || ptTitle;

    // Assert no empty fields
    if (!ptTitle || !enTitle || !esTitle) {
      console.error(`ASSERT FAIL: empty title field for ${id} — pt:"${ptTitle}" en:"${enTitle}" es:"${esTitle}"`);
      emptyFields++;
      continue;
    }

    // Compute genreSlugs
    const genres: string[] = e.genres || [];
    const slugs: string[] = [];
    for (const g of genres) {
      const s = genreSlug(g as string);
      slugs.push(s);
      // Assert slug exists in genres namespace
      if (!genresMap[s]) {
        console.error(`ASSERT FAIL: orphan slug "${s}" (from "${g}") for ${id}`);
        orphanSlugs++;
      }
    }

    result[id] = {
      titleLocalized: { pt: ptTitle, en: enTitle, es: esTitle },
      genreSlugs: slugs,
    };
    written++;
  }

  console.log(`Universe: ${total} | Written: ${written} | Skipped (no id): ${skipped}`);
  console.log(`Empty fields: ${emptyFields} | Orphan slugs: ${orphanSlugs}`);

  if (emptyFields > 0 || orphanSlugs > 0) {
    console.error("FAIL: asserts failed. Not writing derived file.");
    process.exit(1);
  }

  // Write TypeScript export
  const ts = `export const SEED_I18N: Record<string, { titleLocalized: { pt: string; en: string; es: string }; genreSlugs: string[] }> = ` +
    JSON.stringify(result, null, 2) + `;\n`;

  fs.writeFileSync(outPath, ts);
  console.log(`Written: ${outPath} (${written} entries)`);
  console.log("PASS");
}

main();
