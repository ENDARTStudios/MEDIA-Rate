/** seed-localizacao.ts (T400, D-369) — backfill IDEMPOTENTE de
 *  titulo_en/titulo_es/sinopse_en/sinopse_es por fonte (só preenche vazio):
 *   filmes/séries = TMDB (title/overview EN+ES via fonte_id);
 *   games = IGDB (título/sinopse já em EN no catálogo — sem fetch);
 *   mangás = AniList (title.english + description EN);
 *   livros = Google Books (title + description EN);
 *   HQs = ComicVine (name + description EN).
 *  ES é best-effort (só TMDB tem ES estável). Reporta contagens por tipo. */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TMDB_BASE = "https://api.themoviedb.org/3";

async function tmdbPorId(id: string, tipo: string, lang: string) {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;
  try {
    const ep = tipo === "FILME" ? "movie" : "tv";
    const u = `${TMDB_BASE}/${ep}/${encodeURIComponent(id)}?api_key=${key}&language=${lang}`;
    const r = await fetch(u, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    const j = (await r.json()) as { title?: string; name?: string; overview?: string | null };
    return { title: j.title ?? j.name ?? null, overview: j.overview ?? null };
  } catch {
    return null;
  }
}

async function anilist(q: string) {
  const query = `query ($q: String) { Media(search: $q, type: MANGA) { title { english romaji } description } }`;
  try {
    const r = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables: { q } }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as {
      data?: {
        Media?: {
          title?: { english?: string | null; romaji?: string };
          description?: string | null;
        };
      };
    };
    const m = j.data?.Media;
    return {
      title: m?.title?.english ?? m?.title?.romaji ?? null,
      overview: m?.description ?? null,
    };
  } catch {
    return null;
  }
}

async function gbooks(q: string) {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  if (!key) return null;
  try {
    const u = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(q)}&maxResults=1&key=${key}`;
    const r = await fetch(u, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    const j = (await r.json()) as {
      items?: { volumeInfo?: { title?: string; description?: string } }[];
    };
    const vi = j.items?.[0]?.volumeInfo;
    return { title: vi?.title ?? null, overview: vi?.description ?? null };
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
    const j = (await r.json()) as { results?: { name?: string; description?: string }[] };
    const res = j.results?.[0];
    return { title: res?.name ?? null, overview: res?.description ?? null };
  } catch {
    return null;
  }
}

async function main() {
  const alvos = await prisma.midia.findMany({
    where: {
      deleted_at: null,
      OR: [
        { titulo_en: null },
        { sinopse_en: null },
        { tipo: { in: ["FILME", "SERIE"] }, titulo_es: null },
      ],
    },
    select: {
      id: true,
      titulo: true,
      titulo_original: true,
      sinopse: true,
      tipo: true,
      fonte: true,
      fonte_id: true,
    },
  });

  const contagens: Record<
    string,
    { en_titulo: number; en_sinopse: number; es_titulo: number; es_sinopse: number }
  > = {};
  for (const m of alvos) {
    contagens[m.tipo] ??= { en_titulo: 0, en_sinopse: 0, es_titulo: 0, es_sinopse: 0 };
    let en: { title: string | null; overview: string | null } | null = null;
    let es: { title: string | null; overview: string | null } | null = null;

    if (m.tipo === "FILME" || m.tipo === "SERIE") {
      if (m.fonte === "tmdb") {
        en = await tmdbPorId(m.fonte_id, m.tipo, "en-US");
        es = await tmdbPorId(m.fonte_id, m.tipo, "es-ES");
      }
    } else if (m.tipo === "MANGA") {
      en = await anilist(m.titulo);
    } else if (m.tipo === "LIVRO") {
      en = await gbooks(m.titulo);
    } else if (m.tipo === "COMIC") {
      en = await comicvine(m.titulo);
    }
    // GAME: título/sinopse já em EN (IGDB) — sem fetch.

    const data: Record<string, string | null> = {};
    if (m.tipo === "GAME") {
      // IGDB é EN-nativo: copia o que já veio da fonte.
      if (!m.titulo_en) data.titulo_en = m.titulo_original ?? m.titulo;
      if (!m.sinopse_en) data.sinopse_en = m.sinopse;
    } else {
      if (!m.titulo_en && en?.title && en.title !== m.titulo) {
        data.titulo_en = en.title;
        contagens[m.tipo].en_titulo++;
      }
      if (!m.sinopse_en && en?.overview) {
        data.sinopse_en = en.overview.slice(0, 5000);
        contagens[m.tipo].en_sinopse++;
      }
      if (es?.title && !m.titulo_es) {
        data.titulo_es = es.title;
        contagens[m.tipo].es_titulo++;
      }
      if (es?.overview && !m.sinopse_es) {
        data.sinopse_es = es.overview.slice(0, 5000);
        contagens[m.tipo].es_sinopse++;
      }
    }

    if (Object.keys(data).length > 0) {
      await prisma.midia.update({ where: { id: m.id }, data });
    }
    await sleep(200);
  }

  console.log(`[localizacao] alvos=${alvos.length}`);
  for (const [tipo, c] of Object.entries(contagens)) {
    console.log(
      `  ${tipo}: en_titulo=${c.en_titulo} en_sinopse=${c.en_sinopse} es_titulo=${c.es_titulo} es_sinopse=${c.es_sinopse}`,
    );
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
