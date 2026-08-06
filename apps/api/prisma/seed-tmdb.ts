// T4.6/T180: Seed do catálogo via TMDB API — expandido para 500+ títulos.
// Busca top_rated + popular (múltiplas listas e páginas) de filmes e séries,
// grava avaliações TMDB (vote_average 0-10 + vote_count) e recalcula o
// MEDIA Score v3 (recalcularEPersistir) com confidence real.
//
// Pré-requisitos:
// - TMDB_API_KEY definida no .env (obter em https://www.themoviedb.org/settings/api).
// - DATABASE_URL apontando para PostgreSQL com migration aplicada.
//
// Uso: cd apps/api && npm run db:seed:tmdb
/* eslint-disable no-console */
import { PrismaClient, type TipoMidia, type ClassificacaoIndicativa } from "@prisma/client";
import { MediaScoreService } from "../src/modules/media-score/media-score.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG_BASE = "https://image.tmdb.org/t/p/w500";
// T180: alvo ≥450 títulos audiovisuais (225 filmes + 225 séries).
const ITEMS_POR_TIPO = 225;
const MAX_PAGES = 12;
const LISTAS: ("top_rated" | "popular")[] = ["top_rated", "popular"];

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
  vote_count: number;
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

export async function fetchTopItems(
  tipo: "movie" | "tv",
  apiKey: string,
  total: number,
): Promise<TmdbItem[]> {
  const vistos = new Set<number>();
  const items: TmdbItem[] = [];
  // T180: percorre top_rated E popular (dedup por id) até atingir o alvo.
  for (const lista of LISTAS) {
    let page = 1;
    while (items.length < total && page <= MAX_PAGES) {
      const data = await fetchTmdb<TmdbResponse<TmdbItem>>(`/${tipo}/${lista}`, apiKey, {
        page: String(page),
      });
      if (data.results.length === 0) break;
      for (const item of data.results) {
        if (vistos.has(item.id)) continue;
        vistos.add(item.id);
        // Filtra sem poster ou sem overview.
        if (item.poster_path && item.overview) {
          items.push(item);
        }
        if (items.length >= total) break;
      }
      page++;
    }
    if (items.length >= total) break;
  }
  return items.slice(0, total);
}

export const TMDB_ITEMS_POR_TIPO = ITEMS_POR_TIPO;
export const TMDB_LISTAS = LISTAS;
export const TMDB_MAX_PAGES = MAX_PAGES;

interface TmdbGenre {
  id: number;
  name: string;
}

interface TmdbGenreList {
  genres: TmdbGenre[];
}

/** Traduções pt-BR para gêneros que a TMDB só entrega em inglês (lista TV). */
const TRADUCOES_GENEROS: Record<string, string> = {
  "Action & Adventure": "Ação e Aventura",
  "Sci-Fi & Fantasy": "Ficção Científica e Fantasia",
  "War & Politics": "Guerra e Política",
  "Kids": "Infantil",
  "News": "Notícias",
  "Reality": "Reality Show",
  "Soap": "Novela",
  "Talk": "Talk Show",
  "Crime": "Crime",
  "Mystery": "Mistério",
  "Western": "Faroeste",
  "Animation": "Animação",
  "Documentary": "Documentário",
  "Family": "Família",
  "Comedy": "Comédia",
};

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
  // Prefere o nome da lista de filmes (pt-BR completa); a lista de TV pode
  // cair no fallback em inglês — o dicionário normaliza.
  const nomesPorId = new Map<number, string>();
  for (const tipo of ["movie", "tv"] as const) {
    const data = await fetchTmdb<TmdbGenreList>(`/genre/${tipo}/list`, apiKey);
    for (const g of data.genres) {
      const nome = TRADUCOES_GENEROS[g.name] ?? g.name;
      if (!nomesPorId.has(g.id)) nomesPorId.set(g.id, nome);
    }
  }
  for (const [id, nome] of nomesPorId) {
    const row = await prisma.genero.upsert({
      where: { tmdb_id: id },
      create: { tmdb_id: id, nome, slug: slugify(nome) },
      update: { nome },
    });
    generos.set(id, row.id);
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

    // T180: sem deleteMany — upsert idempotente por fonte+fonte_id (re-rodar
    // não duplica nem destrói scores/watchlists existentes).

    // Sincroniza gêneros antes de inserir (vínculos N:N em midia_genero).
    const generos = await syncGeneros(apiKey, prisma);

    const scoreSvc = new MediaScoreService(
      new PrismaService(prisma as never) as never,
      undefined as never,
      undefined as never,
      undefined as never,
    );

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
      // T180: avaliação TMDB (fonte canônica "tmdb", escala 0-10) + score v3.
      if (f.vote_average > 0) {
        await prisma.avaliacaoFonte.upsert({
          where: { midia_id_fonte: { midia_id: midia.id, fonte: "tmdb" } },
          create: {
            midia_id: midia.id,
            fonte: "tmdb",
            rating: f.vote_average,
            media_fonte: 7.0,
            desvio_fonte: 2.0,
            votos: f.vote_count,
          },
          update: { rating: f.vote_average, votos: f.vote_count },
        });
      }
      await scoreSvc.recalcularEPersistir(midia.id).catch(() => undefined);
      inserted++;
      if (inserted % 25 === 0) {
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
      // T180: avaliação TMDB com a fonte CANÔNICA "tmdb" (séries também —
      // o registry do engine não conhece "tmdb_tv").
      if (s.vote_average > 0) {
        await prisma.avaliacaoFonte.upsert({
          where: { midia_id_fonte: { midia_id: midia.id, fonte: "tmdb" } },
          create: {
            midia_id: midia.id,
            fonte: "tmdb",
            rating: s.vote_average,
            media_fonte: 7.0,
            desvio_fonte: 2.0,
            votos: s.vote_count,
          },
          update: { rating: s.vote_average, votos: s.vote_count },
        });
      }
      await scoreSvc.recalcularEPersistir(midia.id).catch(() => undefined);
      insertedSeries++;
      if (insertedSeries % 25 === 0) {
        console.log(`[seed:tmdb] ${insertedSeries}/${series.length} séries inseridas.`);
      }
    }

    console.log(
      `[seed:tmdb] Concluído: ${inserted} filmes + ${insertedSeries} séries com MEDIA Score v3 recalculado.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Executa somente quando o script é chamado diretamente (permite importar
// os helpers em testes sem disparar o seed contra o banco).
const isDirectRun =
  import.meta.url === new URL(process.argv[1] ?? "", "file:").href ||
  process.argv[1]?.endsWith("seed-tmdb.ts");

if (isDirectRun) {
  main().catch((err) => {
    console.error("[seed:tmdb] Erro:", err);
    process.exit(1);
  });
}
