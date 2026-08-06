import fs from "node:fs";

const c = fs.readFileSync("apps/api/src/modules/media-score/adapters/jikan.adapter.ts", "utf8");
const m = c.match(/Ã§|Ã£|Ã©|Ãª|Ã­|Ã³|Ã¡|Ãµ|Ã±|Ãº|Ã¼|Ã¶|â€/g);
console.log("jikan mojibake real:", m ? m.length : 0);

const reg = fs.readFileSync("apps/api/src/modules/media-score/source-registry.ts", "utf8");
for (const id of ["openlibrary", "googlebooks", "comicvine", "jikan", "anilist"]) {
  const i = reg.indexOf(`id: "${id}"`);
  const chunk = reg.slice(i, i + 300);
  const cl = (chunk.match(/classificacao: "(critica|publico)"/) || [])[1];
  const esc = (chunk.match(/escala: "([^"]+)"/) || [])[1];
  const midias = (chunk.match(/midias: \[([^\]]*)\]/) || [])[1]?.trim();
  console.log(`${id}: classificacao=${cl} escala=${esc} midias=${midias}`);
}
