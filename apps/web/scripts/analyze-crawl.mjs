import { readFileSync, existsSync } from "fs";

const dir = "apps/web/.seo-crawl/crawl-2026-07-27T19-02-48-328Z";

function parseCsv(path) {
  if (!existsSync(path)) return [];
  const content = readFileSync(path, "utf-8").trim();
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const row = {};
    const vals = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || line.split(",");
    headers.forEach((h, i) => { row[h] = (vals[i] || "").trim().replace(/^"|"$/g, ""); });
    return row;
  });
}

const internal = parseCsv(dir + "/internal_all.csv");
const codes = {};
internal.forEach((r) => { const c = r["Status Code"] || r.Status || ""; codes[c] = (codes[c] || 0) + 1; });
console.log("=== RESPONSE CODES ===");
Object.entries(codes).sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([k, v]) => console.log("  " + k + ": " + v));

const directives = parseCsv(dir + "/directives_all.csv");
const indexability = {};
const metaRobotVals = {};
const canonicalCount = directives.filter((r) => r["Canonical Link Element 1"]).length;
directives.forEach((r) => {
  const idx = r.Indexability || "";
  indexability[idx] = (indexability[idx] || 0) + 1;
  const mr = r["Meta Robots 1"] || "";
  if (mr) metaRobotVals[mr] = (metaRobotVals[mr] || 0) + 1;
});
console.log("\n=== INDEXABILITY ===");
Object.entries(indexability).forEach(([k, v]) => console.log("  " + k + ": " + v));
console.log("\nMeta Robots values:");
Object.entries(metaRobotVals).forEach(([k, v]) => console.log("  " + k + ": " + v));
console.log("Canonical URLs: " + canonicalCount);

const titles = parseCsv(dir + "/page_titles_all.csv");
const titleMap = {};
titles.forEach((r) => { const t = (r["Title 1"] || r.Title || "").trim(); if (t) titleMap[t] = (titleMap[t] || 0) + 1; });
const dups = Object.entries(titleMap).filter(([, v]) => v > 1);
const missing = titles.filter((r) => !(r["Title 1"] || r.Title));
console.log("\n=== PAGE TITLES ===");
console.log("  Total: " + titles.length + " | Missing: " + missing.length + " | Duplicates: " + dups.length);

const metaDesc = parseCsv(dir + "/meta_description_all.csv");
const missingDesc = metaDesc.filter((r) => !(r["Meta Description 1"] || r["Meta Description"]));
console.log("\n=== META DESCRIPTIONS ===");
console.log("  Total: " + metaDesc.length + " | Missing: " + missingDesc.length);

const hreflang = parseCsv(dir + "/hreflang_all.csv");
console.log("\n=== HREFLANG ===");
console.log("  Entries: " + hreflang.length);

const images = parseCsv(dir + "/images_all.csv");
console.log("\n=== IMAGES ===");
console.log("  Total: " + images.length);
const noAlt = images.filter((r) => !(r["Alt Text"] || r.Alt));
console.log("  No alt text: " + noAlt.length);
const noSize = images.filter((r) => !(r.Width || r["Image Width"]));
console.log("  No explicit size: " + noSize.length);
