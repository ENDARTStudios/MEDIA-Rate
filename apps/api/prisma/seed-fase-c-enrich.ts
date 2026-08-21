/**
 * seed-fase-c-enrich.ts (T383, F13) — enriquece as 123 mídias da Fase C com:
 *  - slug legível (slugify do título)
 *  - capa (imagem_url) das fontes gratuitas: OpenLibrary (livros) e Jikan (mangás)
 *  - sinopse + título original (en) das mesmas fontes
 *
 * Idempotente e best-effort: só sobrescreve campo VAZIO; falha de rede numa
 * mídia não interrompe as demais. Sem segredo em log.
 */
import { PrismaClient } from "@prisma/client";
import { slugify } from "./seed-lib.js";

const prisma = new PrismaClient();

async function buscarOpenLibrary(titulo: string) {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(titulo)}&limit=1`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      docs?: { cover_i?: number; title?: string; author_name?: string[] }[];
    };
    const d = j.docs?.[0];
    if (!d) return null;
    return {
      capa: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
      tituloEn: d.title ?? null,
    };
  } catch {
    return null;
  }
}

async function buscarJikan(titulo: string) {
  const url = `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(titulo)}&limit=1`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      data?: {
        images?: { jpg?: { image_url?: string } };
        title_english?: string | null;
        synopsis?: string | null;
      }[];
    };
    const d = j.data?.[0];
    if (!d) return null;
    return {
      capa: d.images?.jpg?.image_url ?? null,
      tituloEn: d.title_english ?? null,
      sinopse: d.synopsis ?? null,
    };
  } catch {
    return null;
  }
}

async function main() {
  const midias = await prisma.midia.findMany({
    where: { tipo: { in: ["LIVRO", "COMIC", "MANGA"] }, deleted_at: null },
    select: { id: true, titulo: true, tipo: true, fonte: true },
  });

  let slugOk = 0;
  let capaOk = 0;
  let sinopseOk = 0;
  let tituloOk = 0;

  for (const m of midias) {
    const data: { slug?: string; imagem_url?: string; sinopse?: string; titulo_original?: string } =
      {};

    // Slug sempre (determinístico).
    data.slug = slugify(m.titulo);
    slugOk++;

    const fonte = m.fonte.toLowerCase();
    let enriquecido: {
      capa: string | null;
      tituloEn: string | null;
      sinopse?: string | null;
    } | null = null;

    if (fonte === "openlibrary") {
      enriquecido = await buscarOpenLibrary(m.titulo);
    } else if (fonte === "jikan") {
      enriquecido = await buscarJikan(m.titulo);
    }

    if (enriquecido?.capa) {
      data.imagem_url = enriquecido.capa;
      capaOk++;
    }
    if (enriquecido?.tituloEn && enriquecido.tituloEn !== m.titulo) {
      data.titulo_original = enriquecido.tituloEn;
      tituloOk++;
    }
    if (enriquecido?.sinopse) {
      data.sinopse = enriquecido.sinopse.slice(0, 2000);
      sinopseOk++;
    }

    if (Object.keys(data).length > 0) {
      await prisma.midia.update({ where: { id: m.id }, data });
    }
  }

  console.log(
    `[enrich] total=${midias.length} slug=${slugOk} capa=${capaOk} sinopse=${sinopseOk} titulo_en=${tituloOk}`,
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
