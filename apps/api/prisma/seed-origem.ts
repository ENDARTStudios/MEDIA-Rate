/**
 * Seed de origem da produção (Addendum 2 §5) — preenche `midia.pais_origem`
 * a partir do `origin_country` do TMDB (discover de séries), sem apagar
 * mídias. Filmes não têm country no discover — ficam null (⚠️ na UI).
 *
 * Uso: DATABASE_URL=... TMDB_API_KEY=... npx tsx prisma/seed-origem.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG_BASE = "https://image.tmdb.org/t/p/w500";

interface TmdbItem {
  id: number;
  origin_country?: string[];
}

async function fetchTmdb<T>(path: string): Promise<T> {
  const res = await fetch(`${TMDB_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_API_KEY ?? ""}`,
      accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`);
  return (await res.json()) as T;
}

async function main(): Promise<void> {
  let atualizadas = 0;
  for (let pagina = 1; pagina <= 10; pagina++) {
    const data = await fetchTmdb<{ results: TmdbItem[] }>(
      `/discover/tv?sort_by=popularity.desc&with_original_language=en|ja|ko|es|pt|fr|de&page=${pagina}`,
    );
    for (const item of data.results) {
      const pais = item.origin_country?.[0];
      if (!pais) continue;
      const r = await prisma.midia.updateMany({
        where: { fonte: "tmdb_tv", fonte_id: String(item.id), pais_origem: null },
        data: { pais_origem: pais },
      });
      atualizadas += r.count;
    }
    if (data.results.length === 0) break;
  }
  console.log(`[seed:origem] ${atualizadas} séries com país de origem preenchido.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
