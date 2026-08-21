/**
 * seed-t383-residual.ts (D-352) — fecha os 2 residuais do T383b:
 *  - LIVROS: sinopse via GET /volumes/{id} do Google Books (busca não traz description).
 *  - MANGÁS: capa+sinopse+título EN via AniList GraphQL (Jikan 504 → pivot).
 *
 * Idempotente (update só de campo vazio), best-effort. Sem segredo em log.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function googleBooksDetail(titulo: string) {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  if (!key) return null;
  try {
    const s = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(titulo)}&maxResults=1&key=${key}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!s.ok) return null;
    const sj = (await s.json()) as { items?: { id?: string }[] };
    const id = sj.items?.[0]?.id;
    if (!id) return null;
    await sleep(350);
    const d = await fetch(`https://www.googleapis.com/books/v1/volumes/${id}?key=${key}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!d.ok) return null;
    const dj = (await d.json()) as { volumeInfo?: { description?: string } };
    return { sinopse: dj.volumeInfo?.description ?? null };
  } catch {
    return null;
  }
}

async function anilistManga(titulo: string) {
  const query = `query ($q: String) { Media(search: $q, type: MANGA) { coverImage { extraLarge } description title { romaji english } } }`;
  try {
    const r = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables: { q: titulo } }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as {
      data?: {
        Media?: {
          coverImage?: { extraLarge?: string };
          description?: string | null;
          title?: { romaji?: string; english?: string | null };
        };
      };
    };
    const m = j.data?.Media;
    if (!m) return null;
    return {
      capa: m.coverImage?.extraLarge ?? null,
      sinopse: m.description ? stripHtml(m.description) : null,
      tituloEn: m.title?.english ?? m.title?.romaji ?? null,
    };
  } catch {
    return null;
  }
}

async function main() {
  const midias = await prisma.midia.findMany({
    where: { tipo: { in: ["LIVRO", "MANGA"] }, deleted_at: null },
    select: {
      id: true,
      titulo: true,
      tipo: true,
      imagem_url: true,
      sinopse: true,
      titulo_original: true,
    },
  });

  let capaOk = 0;
  let sinopseOk = 0;
  let tituloOk = 0;

  for (const m of midias) {
    const e = m.tipo === "LIVRO" ? await googleBooksDetail(m.titulo) : await anilistManga(m.titulo);
    if (e) {
      const data: { imagem_url?: string; sinopse?: string; titulo_original?: string } = {};
      if (!m.imagem_url && "capa" in e && e.capa) {
        data.imagem_url = e.capa;
        capaOk++;
      }
      if (!m.sinopse && e.sinopse) {
        data.sinopse = e.sinopse.slice(0, 2000);
        sinopseOk++;
      }
      if (!m.titulo_original && e.tituloEn && e.tituloEn !== m.titulo) {
        data.titulo_original = e.tituloEn;
        tituloOk++;
      }
      if (Object.keys(data).length > 0) {
        await prisma.midia.update({ where: { id: m.id }, data });
      }
    }
    await sleep(500);
  }

  console.log(
    `[t383-residual] total=${midias.length} capa=${capaOk} sinopse=${sinopseOk} titulo_en=${tituloOk}`,
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
