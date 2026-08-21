/**
 * seed-fase-c-enrich2.ts (T383b, F13) — segunda passada de dados:
 *  - LIVROS: Google Books (capa + sinopse + título EN/ES)
 *  - HQs: ComicVine (capa + descrição)
 *  - MANGÁS: Jikan /manga/{id}/full (sinopse; capa já veio na 1ª passada)
 *
 * Idempotente (update só de campo vazio) e best-effort (falha de rede não
 * interrompe). Chaves lidas de env (GOOGLE_BOOKS_API_KEY, COMICVINE_API_KEY) —
 * nunca em log.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function buscarGoogleBooks(titulo: string) {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  if (!key) return null;
  const q = `intitle:${encodeURIComponent(titulo)}`;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1&key=${key}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      items?: {
        volumeInfo?: { imageLinks?: { thumbnail?: string }; description?: string; title?: string };
      }[];
    };
    const v = j.items?.[0]?.volumeInfo;
    if (!v) return null;
    return {
      capa: v.imageLinks?.thumbnail?.replace("http://", "https://") ?? null,
      sinopse: v.description ?? null,
      tituloEn: v.title ?? null,
    };
  } catch {
    return null;
  }
}

async function buscarComicVine(titulo: string) {
  const key = process.env.COMICVINE_API_KEY;
  if (!key) return null;
  const url = `https://comicvine.gamespot.com/api/search/?api_key=${key}&query=${encodeURIComponent(titulo)}&resources=volume&format=json&limit=1`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      results?: { image?: { medium_url?: string }; description?: string | null; name?: string }[];
    };
    const r = j.results?.[0];
    if (!r) return null;
    return {
      capa: r.image?.medium_url ?? null,
      sinopse: r.description ?? null,
      tituloEn: r.name ?? null,
    };
  } catch {
    return null;
  }
}

async function buscarJikanDetail(titulo: string) {
  try {
    const s = await fetch(
      `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(titulo)}&limit=1`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!s.ok) return null;
    const sj = (await s.json()) as { data?: { mal_id?: number }[] };
    const id = sj.data?.[0]?.mal_id;
    if (!id) return null;
    await delay(350);
    const d = await fetch(`https://api.jikan.moe/v4/manga/${id}/full`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!d.ok) return null;
    const dj = (await d.json()) as {
      data?: { synopsis?: string | null; title_english?: string | null };
    };
    return {
      sinopse: dj.data?.synopsis ?? null,
      tituloEn: dj.data?.title_english ?? null,
    };
  } catch {
    return null;
  }
}

async function main() {
  const midias = await prisma.midia.findMany({
    where: { tipo: { in: ["LIVRO", "COMIC", "MANGA"] }, deleted_at: null },
    select: {
      id: true,
      titulo: true,
      tipo: true,
      fonte: true,
      imagem_url: true,
      sinopse: true,
      titulo_original: true,
    },
  });

  let capaOk = 0;
  let sinopseOk = 0;
  let tituloOk = 0;

  for (const m of midias) {
    const data: { imagem_url?: string; sinopse?: string; titulo_original?: string } = {};
    const fonte = m.fonte.toLowerCase();

    let e: { capa: string | null; sinopse: string | null; tituloEn: string | null } | null = null;
    if (fonte === "openlibrary") {
      e = await buscarGoogleBooks(m.titulo);
      await delay(400);
    } else if (fonte === "comicvine") {
      e = await buscarComicVine(m.titulo);
      await delay(400);
    } else if (fonte === "jikan" && !m.sinopse) {
      // Mangá: só sinopse/título (capa já veio na 1ª passada).
      e = await buscarJikanDetail(m.titulo);
      await delay(400);
    }

    if (e) {
      if (!m.imagem_url && e.capa) {
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
    }

    if (Object.keys(data).length > 0) {
      await prisma.midia.update({ where: { id: m.id }, data });
    }
  }

  console.log(
    `[enrich2] total=${midias.length} capa=${capaOk} sinopse=${sinopseOk} titulo_en=${tituloOk}`,
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
