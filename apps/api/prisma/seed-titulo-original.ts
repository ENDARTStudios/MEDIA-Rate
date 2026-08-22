/** seed-titulo-original.ts (T393, D-366) — backfill de titulo_original/EN
 *  para itens sem ele, usando as fontes já funcionais:
 *   livros = Google Books volumeInfo.title; HQs = ComicVine name;
 *   mangás = AniList title.english/romaji. Idempotente (só campo vazio). */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function gbooks(q: string) {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  if (!key) return null;
  try {
    const u = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(q)}&maxResults=1&key=${key}`;
    const r = await fetch(u, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    const j = (await r.json()) as { items?: { volumeInfo?: { title?: string } }[] };
    return j.items?.[0]?.volumeInfo?.title ?? null;
  } catch {
    return null;
  }
}

async function comicvine(q: string) {
  const key = process.env.COMICVINE_API_KEY;
  if (!key) return null;
  try {
    const u = `https://comicvine.gamespot.com/api/search/?api_key=${key}&query=${encodeURIComponent(q)}&resources=volume&format=json&limit=1`;
    const r = await fetch(u, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    const j = (await r.json()) as { results?: { name?: string }[] };
    return j.results?.[0]?.name ?? null;
  } catch {
    return null;
  }
}

async function anilist(q: string) {
  const query = `query ($q: String) { Media(search: $q, type: MANGA) { title { english romaji } } }`;
  try {
    const r = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables: { q } }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as {
      data?: { Media?: { title?: { english?: string | null; romaji?: string } } };
    };
    return j.data?.Media?.title?.english ?? j.data?.Media?.title?.romaji ?? null;
  } catch {
    return null;
  }
}

async function main() {
  const alvos = await prisma.midia.findMany({
    where: { tipo: { in: ["LIVRO", "COMIC", "MANGA"] }, titulo_original: null, deleted_at: null },
    select: { id: true, titulo: true, tipo: true },
  });

  let ok = 0;
  for (const m of alvos) {
    let en: string | null = null;
    if (m.tipo === "LIVRO") en = await gbooks(m.titulo);
    else if (m.tipo === "COMIC") en = await comicvine(m.titulo);
    else en = await anilist(m.titulo);

    if (en && en !== m.titulo) {
      await prisma.midia.update({ where: { id: m.id }, data: { titulo_original: en } });
      ok++;
    }
    await sleep(300);
  }
  console.log(`[titulo-original] alvos=${alvos.length} preenchidos=${ok}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
