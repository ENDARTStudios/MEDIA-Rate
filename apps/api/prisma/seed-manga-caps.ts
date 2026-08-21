/** seed-manga-caps.ts (T383b) — capas+sinopses dos mangás via Jikan com
 *  delay/retry (a 1ª passada estourou o rate limit do Jikan). */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function jikan(titulo: string) {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      const s = await fetch(
        `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(titulo)}&limit=1`,
        { signal: AbortSignal.timeout(10000) },
      );
      if (s.status === 429) {
        await sleep(2500 * (tentativa + 1));
        continue;
      }
      if (!s.ok) return null;
      const sj = (await s.json()) as {
        data?: {
          mal_id?: number;
          images?: { jpg?: { image_url?: string } };
          title_english?: string | null;
        }[];
      };
      const r = sj.data?.[0];
      if (!r) return null;
      const out = {
        capa: r.images?.jpg?.image_url ?? null,
        tituloEn: r.title_english ?? null,
        sinopse: null as string | null,
      };
      if (r.mal_id) {
        await sleep(450);
        const d = await fetch(`https://api.jikan.moe/v4/manga/${r.mal_id}/full`, {
          signal: AbortSignal.timeout(10000),
        });
        if (d.ok) {
          const dj = (await d.json()) as { data?: { synopsis?: string | null } };
          out.sinopse = dj.data?.synopsis ?? null;
        }
      }
      return out;
    } catch {
      return null;
    }
  }
  return null;
}

async function main() {
  const mangas = await prisma.midia.findMany({
    where: { tipo: "MANGA", deleted_at: null },
    select: { id: true, titulo: true, imagem_url: true, sinopse: true, titulo_original: true },
  });

  let capaOk = 0;
  let sinopseOk = 0;
  let tituloOk = 0;

  for (const m of mangas) {
    if (m.imagem_url && m.sinopse && m.titulo_original) {
      await sleep(200);
      continue;
    }
    const e = await jikan(m.titulo);
    const data: { imagem_url?: string; sinopse?: string; titulo_original?: string } = {};
    if (!m.imagem_url && e?.capa) {
      data.imagem_url = e.capa;
      capaOk++;
    }
    if (!m.sinopse && e?.sinopse) {
      data.sinopse = e.sinopse.slice(0, 2000);
      sinopseOk++;
    }
    if (!m.titulo_original && e?.tituloEn && e.tituloEn !== m.titulo) {
      data.titulo_original = e.tituloEn;
      tituloOk++;
    }
    if (Object.keys(data).length > 0) {
      await prisma.midia.update({ where: { id: m.id }, data });
    }
    await sleep(500);
  }

  console.log(
    `[manga-caps] total=${mangas.length} capa=${capaOk} sinopse=${sinopseOk} titulo_en=${tituloOk}`,
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
