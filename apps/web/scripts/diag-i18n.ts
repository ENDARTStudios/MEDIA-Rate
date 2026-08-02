/**
 * diag-i18n.ts — M3 diagnóstico: canonicalKey mismatch vs bundling vs CDN
 * Uso: npx tsx scripts/diag-i18n.ts
 */
import { titleForLocale, genreSlug } from "../src/lib/i18n-content";
import { SEED_I18N } from "../src/lib/seed-i18n";
import { getMediaBySlug } from "../src/lib/api";

console.log("=== DIAG M3 ===");
console.log("Object.keys(SEED_I18N).length:", Object.keys(SEED_I18N).length);
console.log("SEED_I18N has 'a-odisseia':", "a-odisseia" in SEED_I18N);
console.log("SEED_I18N has '1108427':", "1108427" in SEED_I18N);

async function main() {
const media = await getMediaBySlug("a-odisseia");
if (media) {
  console.log("\n--- getMediaBySlug('a-odisseia') ---");
  console.log("media.id:", media.id);
  console.log("media.slug:", media.slug);
  console.log("media.title:", media.title);
  console.log("slug ?? id:", (media.slug ?? media.id));
  console.log("id ?? slug:", (media.id ?? media.slug));
  console.log("titleForLocale(en-US):", titleForLocale(media, "en-US"));
  console.log("titleForLocale(es-ES):", titleForLocale(media, "es-ES"));
  console.log("titleForLocale(pt-BR):", titleForLocale(media, "pt-BR"));
  const d = SEED_I18N["a-odisseia"];
  console.log("SEED_I18N['a-odisseia']:", d ? "FOUND" : "NOT FOUND");
  console.log("  titleLocalized:", d?.titleLocalized);
  console.log("  en:", d?.titleLocalized?.en);
  console.log("  pt:", d?.titleLocalized?.pt);
}

const media2 = await getMediaBySlug("1108427");
if (media2) {
  console.log("\n--- getMediaBySlug('1108427') ---");
  console.log("media2.id:", media2.id);
  console.log("media2.slug:", media2.slug);
  console.log("titleForLocale(en-US):", titleForLocale(media2, "en-US"));
}

console.log("\n=== GENRE SLUG TEST ===");
console.log("genreSlug('Ação'):", genreSlug("Ação"));
console.log("genreSlug('Drama'):", genreSlug("Drama"));
}
main();
