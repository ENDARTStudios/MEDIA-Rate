const fs = require("fs");
const SEED = JSON.parse(fs.readFileSync("src/lib/seed-data.ts","utf8")
  .match(/export const SEED_MEDIA\s*=\s*(\[[\s\S]*?\]);/)?.[1]
  ?.replace(/'/g,'"')
  || "[]");

// For now, seed-i18n is written manually with titleLocalized {pt,en,es}
// The generator validates it exists and is valid
console.log("SEED parsed: " + (SEED.length || 0) + " entries");
