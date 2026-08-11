/* eslint-disable no-console */
// T288 — seed de temporadas/episódios reais (TMDB) para séries, com notas
// normalizadas 0-10. STANDALONE em prisma/ (D-275). Escopo: top 50 séries por
// MEDIA Score (documentado em D-284), idempotente por upsert, ausência
// graciosa sem TMDB_API_KEY. Uso: npm run db:seed:temporadas

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DELAY_MS = 300;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const TOP_SERIES = 50;
const MAX_SEASONS = 8;

interface TmdbSeasonResumo {
  season_number?: number;
  name?: string;
  air_date?: string | null;
  poster_path?: string | null;
}

interface TmdbEpisodio {
  episode_number?: number;
  name?: string;
  air_date?: string | null;
  vote_average?: number;
}

async function main(): Promise<void> {
  const key = process.env.TMDB_API_KEY ?? "";
  if (!key) {
    console.log("[seed:temporadas] TMDB_API_KEY ausente — ausência graciosa");
    await prisma.$disconnect();
    return;
  }

  const series = await prisma.midia.findMany({
    where: { tipo: "SERIE", fonte: "tmdb", deleted_at: null },
    orderBy: { score: "desc" },
    take: TOP_SERIES,
    select: { id: true, fonte_id: true, titulo: true },
  });

  let temporadas = 0;
  let episodios = 0;
  let semDados = 0;

  for (const s of series) {
    try {
      const base = `https://api.themoviedb.org/3/tv/${s.fonte_id}`;
      const res = await fetch(`${base}?api_key=${key}&language=pt-BR`);
      if (!res.ok) {
        semDados++;
        await delay(DELAY_MS);
        continue;
      }
      const dados = (await res.json()) as {
        seasons?: TmdbSeasonResumo[];
        number_of_seasons?: number;
      };
      const seasons = (dados.seasons ?? [])
        .filter((s2) => s2.season_number != null && s2.season_number > 0)
        .sort((a, b) => (a.season_number ?? 0) - (b.season_number ?? 0))
        .slice(0, MAX_SEASONS);

      for (const sea of seasons) {
        const epRes = await fetch(
          `${base}/season/${sea.season_number}?api_key=${key}&language=pt-BR`,
        );
        await delay(DELAY_MS);
        if (!epRes.ok) continue;
        const epDados = (await epRes.json()) as { episodes?: TmdbEpisodio[] };
        const epis = (epDados.episodes ?? [])
          .filter((e) => e.episode_number != null)
          .sort((a, b) => (a.episode_number ?? 0) - (b.episode_number ?? 0));

        const temporada = await prisma.temporada.upsert({
          where: { midia_id_numero: { midia_id: s.id, numero: sea.season_number } },
          create: {
            midia_id: s.id,
            numero: sea.season_number,
            titulo: sea.name ?? null,
            ano: sea.air_date ? new Date(sea.air_date).getUTCFullYear() : null,
            poster_url: sea.poster_path
              ? `https://image.tmdb.org/t/p/w300${sea.poster_path}`
              : null,
          },
          update: {},
        });
        temporadas++;

        for (const e of epis) {
          await prisma.episodio.upsert({
            where: {
              temporada_id_numero: { temporada_id: temporada.id, numero: e.episode_number },
            },
            create: {
              temporada_id: temporada.id,
              numero: e.episode_number,
              titulo: e.name ?? `Episódio ${e.episode_number}`,
              data_exibicao: e.air_date ? new Date(e.air_date) : null,
              nota_publico: e.vote_average != null ? Math.round(e.vote_average * 10) / 10 : null,
            },
            update: {},
          });
          episodios++;
        }
      }
    } catch {
      semDados++;
    }
    await delay(DELAY_MS);
  }

  console.log(
    `[seed:temporadas] series=${series.length} temporadas=${temporadas} episodios=${episodios} sem_dados=${semDados}`,
  );
  await prisma.$disconnect();
}

const isDirectRun =
  import.meta.url === new URL(process.argv[1] ?? "", "file:").href ||
  process.argv[1]?.endsWith("seed-temporadas.ts");

if (isDirectRun) {
  main().catch((err) => {
    console.error("[seed:temporadas] erro fatal:", String(err).slice(0, 300));
    process.exit(1);
  });
}
