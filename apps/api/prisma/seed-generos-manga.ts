/** seed-generos-manga.ts (T387a, D-361) — enriquece gêneros dos mangás via
 *  AniList GraphQL (gêneros em inglês) → upsert em genero + link MidiaGenero.
 *  Idempotente (link @@id[midia_id,genero_id]); NARRATIVO default. */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function anilistGenres(titulo: string): Promise<string[]> {
  const query = `query ($q: String) { Media(search: $q, type: MANGA) { genres } }`;
  try {
    const r = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables: { q: titulo } }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return [];
    const j = (await r.json()) as { data?: { Media?: { genres?: string[] } } };
    return j.data?.Media?.genres ?? [];
  } catch {
    return [];
  }
}

async function main() {
  const mangas = await prisma.midia.findMany({
    where: { tipo: "MANGA", deleted_at: null },
    select: { id: true, titulo: true, generos: { select: { genero_id: true } } },
  });

  let links = 0;
  for (const m of mangas) {
    if (m.generos.length > 0) continue;
    const genres = await anilistGenres(m.titulo);
    for (const nome of genres) {
      const slug = slugify(nome);
      if (!slug) continue;
      const genero = await prisma.genero.upsert({
        where: { slug },
        update: {},
        create: { nome, slug },
      });
      await prisma.midiaGenero
        .create({
          data: { midia_id: m.id, genero_id: genero.id },
        })
        .catch(() => undefined); // já linkado
      links++;
    }
    await sleep(400);
  }
  console.log(`[generos-manga] mangas=${mangas.length} links=${links}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
