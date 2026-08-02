const fs = require("fs");

// Read seed-data.ts
let seed = fs.readFileSync("src/lib/seed-data.ts","utf8");

// Genre slug map
const PT_TO_SLUG = {
  "Ação":"acao","Aventura":"aventura","Animação":"animacao","Biografia":"biografia",
  "Comédia":"comedia","Crime":"crime","Curta":"curta","Documentário":"documentario",
  "Drama":"drama","Esporte":"esporte","Família":"familia","Fantasia":"fantasia",
  "Faroeste":"faroeste","Ficção científica":"ficcao","Ficção Científica":"ficcao",
  "Guerra":"guerra","História":"historia","Infantil":"infantil","Mistério":"misterio",
  "Musical":"musical","Policial":"policial","Reality Show":"reality","Romance":"romance",
  "Suspense":"suspense","Talk Show":"talk","Terror":"terror","Épico":"epico",
  "Sandbox":"sandbox","Survival":"survival","Adventure":"aventura","Creative":"creative",
  "Indie":"indie","RPG":"rpg","Souls-like":"soulslike","Cyberpunk":"cyberpunk",
  "Mundo Aberto":"openworld","Open World":"openworld","Plataforma":"plataforma",
  "Estratégia":"estrategia","Simulação":"simulacao","Corrida":"corrida",
  "Luta":"luta","Esportes":"esports","Sports":"esports","Fighting":"luta",
  "Family":"familia","Animation":"animacao","Horror":"terror","Thriller":"suspense",
  "Science Fiction":"ficcao","Sci-Fi":"ficcao","Documentary":"documentario",
  "History":"historia","War":"guerra","Western":"faroeste","Action":"acao",
  "Fantasy":"fantasia","Mythology":"mythology","Dark":"dark","Mito":"mito",
  "Strategy":"strategy",
  "Sobrenatural":"sobrenatural","Super-Herói":"super-heroi","Clássico":"classico",
  "Distopia":"distopia","Psicológico":"psicologico","Sátira":"satira",
  "Realismo Mágico":"realismo-magico","Literatura":"literatura"
};

function getSlug(g) { return PT_TO_SLUG[g] || g.toLowerCase().replace(/[^a-z0-9]/g,""); }

// Process each "title": "X" — add titleLocalized after it
// Pattern: match a title field and following genres field, add new fields after them

// For each entity block, find title and genres, add the new fields
let changes = 0;
const entries = seed.match(/\{[^}]*"title":\s*"([^"]*)"[^}]*"genres":\s*\[([^\]]*)\][^}]*\}/g) || [];

console.log("Entries found with title+genres: " + entries.length);

// For each entry, add titleLocalized and genreSlugs after genres
for (const entry of entries) {
  const titleMatch = entry.match(/"title":\s*"([^"]*)"/);
  const genresMatch = entry.match(/"genres":\s*\[([^\]]*)\]/);
  if (!titleMatch || !genresMatch) continue;
  
  const title = titleMatch[1];
  const genresStr = genresMatch[1];
  const genreList = genresStr.match(/"([^"]+)"/g)?.map(g => g.replace(/"/g,"")) || [];
  const slugs = genreList.map(g => getSlug(g));
  
  // Build replacement — insert titleLocalized after title line, genreSlugs after genres
  const titleLoc = `"title": "${title}",\n    "titleLocalized": { "pt": "${title}", "en": "${title}", "es": "${title}" },`;
  const genreSl = `"genreSlugs": [${slugs.map(s => `"${s}"`).join(", ")}]`;
  
  // Replace in seed
  const oldTitleLine = `"title": "${title}"`;
  if (seed.includes(oldTitleLine)) {
    const newEntry = entry
      .replace(/"title":\s*"[^"]*"/, titleLoc)
      .replace(/"genres":\s*\[[^\]]*\]/, (match) => match + `,\n    ${genreSl}`);
    seed = seed.replace(entry, newEntry);
    changes++;
  }
}

fs.writeFileSync("src/lib/seed-data.ts", seed);
console.log("Entities updated: " + changes);
console.log("Seed data migration complete.");
