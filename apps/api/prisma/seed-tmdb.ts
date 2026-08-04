// T4.6: Seed do catálogo via TMDB API.
// Busca top 200 filmes + top 200 séries em pt-BR e popula tabela `midia`.
//
// Pré-requisitos:
// - TMDB_API_KEY definida no .env (obter em https://www.themoviedb.org/settings/api).
// - DATABASE_URL apontando para PostgreSQL com migration aplicada.
//
// Uso: cd apps/api && npm run db:seed:tmdb
/* eslint-disable no-console */
import { PrismaClient, type TipoMidia, type ClassificacaoIndicativa } from "@prisma/client";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG_BASE = "https://image.tmdb.org/t/p/w500";
const ITEMS_POR_TIPO = 200;

interface TmdbItem {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string | null;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  runtime?: number;
  episode_run_time?: number[];
  vote_average: number;
  genre_ids?: number[];
}

interface TmdbResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

/**
 * Mapeia `adult: true` do TMDB para classificação DEZOITO.
 * `adult: false` tenta derivar de release_dates (em tarefa futura).
 * Por ora, default L (Livre).
 */
function classificacaoFromTmdb(adult: boolean): ClassificacaoIndicativa {
  return adult ? "DEZOITO" : "L";
}

async function fetchTmdb<T>(
  endpoint: string,
  apiKey: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "pt-BR");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TMDB ${endpoint} falhou: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function fetchTopItems(
  tipo: "movie" | "tv",
  apiKey: string,
  total: number,
): Promise<TmdbItem[]> {
  const items: TmdbItem[] = [];
  let page = 1;
  while (items.length < total && page <= 10) {
    const data = await fetchTmdb<TmdbResponse<TmdbItem>>(`/${tipo}/top_rated`, apiKey, {
      page: String(page),
    });
    if (data.results.length === 0) break;
    for (const item of data.results) {
      // Filtra sem poster ou sem overview.
      if (item.poster_path && item.overview) {
        items.push(item);
      }
      if (items.length >= total) break;
    }
    page++;
  }
  return items.slice(0, total);
}

interface TmdbGenre {
  id: number;
  name: string;
}

interface TmdbGenreList {
  genres: TmdbGenre[];
}

/** Slug simples: minúsculas, sem acentos, espaços → hífen. */
function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Sincroniza a tabela `genero` com os gêneros do TMDB (filmes + séries).
 */
async function syncGeneros(apiKey: string, prisma: PrismaClient): Promise<Map<number, number>> {
  const generos = new Map<number, number>();
  for (const tipo of ["movie", "tv"] as const) {
    const data = await fetchTmdb<TmdbGenreList>(`/genre/${tipo}/list`, apiKey);
    for (const g of data.genres) {
      const row = await prisma.genero.upsert({
        where: { tmdb_id: g.id },
        create: { tmdb_id: g.id, nome: g.name, slug: slugify(g.name) },
        update: { nome: g.name },
      });
      generos.set(g.id, row.id);
    }
  }
  console.log(`[seed:tmdb] ${generos.size} gêneros sincronizados.`);
  return generos;
}

/** Cria os vínculos N:N midia↔genero (batch idempotente). */
async function linkGeneros(
  prisma: PrismaClient,
  midiaId: string,
  genreIds: number[] | undefined,
  generos: Map<number, number>,
): Promise<void> {
  if (!genreIds) return;
  const data = genreIds
    .map((gid) => {
      const generoId = generos.get(gid);
      return generoId ? { midia_id: midiaId, genero_id: generoId } : null;
    })
    .filter((x): x is { midia_id: string; genero_id: number } => x != null);
  if (data.length === 0) return;
  await prisma.midiaGenero.createMany({ data, skipDuplicates: true });
}

async function main(): Promise<void> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === "SUA_CHAVE_AQUI") {
    console.error(
      "[seed:tmdb] TMDB_API_KEY ausente. Obter em https://www.themoviedb.org/settings/api",
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();
  console.log("[seed:tmdb] Conectado ao banco.");

  try {
    // Busca top 200 filmes + top 200 séries.
    console.log(`[seed:tmdb] Buscando top ${ITEMS_POR_TIPO} filmes do TMDB...`);
    const filmes = await fetchTopItems("movie", apiKey, ITEMS_POR_TIPO);
    console.log(`[seed:tmdb] ${filmes.length} filmes obtidos.`);

    console.log(`[seed:tmdb] Buscando top ${ITEMS_POR_TIPO} séries do TMDB...`);
    const series = await fetchTopItems("tv", apiKey, ITEMS_POR_TIPO);
    console.log(`[seed:tmdb] ${series.length} séries obtidas.`);

    // Limpa mídias existentes (apenas do TMDB).
    await prisma.midia.deleteMany({
      where: { OR: [{ fonte: "tmdb" }, { fonte: "tmdb_tv" }] },
    });
    console.log("[seed:tmdb] Mídias TMDB existentes removidas.");

    // Sincroniza gêneros antes de inserir (vínculos N:N em midia_genero).
    const generos = await syncGeneros(apiKey, prisma);

    // Insere filmes.
    let inserted = 0;
    for (const f of filmes) {
      const ano = f.release_date ? Number.parseInt(f.release_date.slice(0, 4), 10) : null;
      const midia = await prisma.midia.upsert({
        where: {
          fonte_fonte_id: { fonte: "tmdb", fonte_id: String(f.id) },
        },
        create: {
          fonte: "tmdb",
          fonte_id: String(f.id),
          tipo: "FILME" as TipoMidia,
          titulo: f.title ?? f.original_title ?? `Filme ${f.id}`,
          titulo_original: f.original_title ?? null,
          sinopse: f.overview,
          ano_lancamento: ano,
          classificacao_indicativa: classificacaoFromTmdb(
            (f as TmdbItem & { adult?: boolean }).adult ?? false,
          ),
          imagem_url: f.poster_path ? `${TMDB_IMG_BASE}${f.poster_path}` : null,
          duracao_minutos: f.runtime ?? null,
        },
        update: {
          titulo: f.title ?? f.original_title ?? `Filme ${f.id}`,
          sinopse: f.overview,
          ano_lancamento: ano,
          imagem_url: f.poster_path ? `${TMDB_IMG_BASE}${f.poster_path}` : null,
        },
      });
      await linkGeneros(prisma, midia.id, f.genre_ids, generos);
      inserted++;
      if (inserted % 20 === 0) {
        console.log(`[seed:tmdb] ${inserted}/${filmes.length} filmes inseridos.`);
      }
    }

    // Insere séries (fonte "tmdb_tv" para distinguir de filmes).
    let insertedSeries = 0;
    for (const s of series) {
      const ano = s.first_air_date ? Number.parseInt(s.first_air_date.slice(0, 4), 10) : null;
      const midia = await prisma.midia.upsert({
        where: {
          fonte_fonte_id: { fonte: "tmdb_tv", fonte_id: String(s.id) },
        },
        create: {
          fonte: "tmdb_tv",
          fonte_id: String(s.id),
          tipo: "SERIE" as TipoMidia,
          titulo: s.name ?? s.original_name ?? `Série ${s.id}`,
          titulo_original: s.original_name ?? null,
          sinopse: s.overview,
          ano_lancamento: ano,
          classificacao_indicativa: classificacaoFromTmdb(
            (s as TmdbItem & { adult?: boolean }).adult ?? false,
          ),
          imagem_url: s.poster_path ? `${TMDB_IMG_BASE}${s.poster_path}` : null,
        },
        update: {
          titulo: s.name ?? s.original_name ?? `Série ${s.id}`,
          sinopse: s.overview,
          ano_lancamento: ano,
          imagem_url: s.poster_path ? `${TMDB_IMG_BASE}${s.poster_path}` : null,
        },
      });
      await linkGeneros(prisma, midia.id, s.genre_ids, generos);
      insertedSeries++;
      if (insertedSeries % 20 === 0) {
        console.log(`[seed:tmdb] ${insertedSeries}/${series.length} séries inseridas.`);
      }
    }

    // Calcula MEDIA Score placeholder para cada mídia (score neutro = 50).
    const midias = await prisma.midia.findMany({ select: { id: true } });
    for (const m of midias) {
      const existing = await prisma.mediaScore.findUnique({ where: { midia_id: m.id } });
      if (!existing) {
        await prisma.mediaScore.create({
          data: {
            midia_id: m.id,
            score: 50,
            num_fontes: 0,
            pesos_usados: { tmdb: 0.4, omdb: 0.3, metacritic: 0.3 },
          },
        });
      }
    }

    console.log(
      `[seed:tmdb] Concluído: ${inserted} filmes + ${insertedSeries} séries + ${midias.length} scores.`,
    );
    console.log(
      "[seed:tmdb] Próximo passo: job diário do MEDIA Score (T4.7) recalcula scores com avaliações reais.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[seed:tmdb] Erro:", err);
  process.exit(1);
});
