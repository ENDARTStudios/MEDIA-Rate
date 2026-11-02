/* eslint-disable @typescript-eslint/no-explicit-any -- payloads externos
   (TMDB/IGDB/AniList/OpenLibrary/ComicVine) chegam sem tipo publicado; cada
   um é validado nos mappers PUROS abaixo antes de qualquer escrita. */
import { estatisticas } from "../media-score/adapters/fonte-adapter.interface.js";
import { fetchJson, postJson, UA_BROWSER } from "../media-score/adapters/http.utils.js";

/**
 * T-DADOS-63 — descoberta em escala por mídia (o "bot" de cada tipo).
 *
 * Cada adaptador devolve UMA página de títulos da fonte canônica do tipo, com
 * o ponto de retomada opaco (`proximo`). O motor (`catalogo-ingestao.service`)
 * persiste o cursor, deduplica por (fonte, fonte_id) e grava nota quando a
 * própria listagem da fonte já a traz — sem request por título.
 *
 * Regra de ouro: nada é inventado. Fonte sem nota na listagem → `nota: null`
 * (lacuna honesta, visível no status), nunca estimativa.
 */

export type TipoIngestao = "FILME" | "SERIE" | "GAME" | "LIVRO" | "COMIC" | "MANGA";

/** Escala estatística da fonte (mesma tabela usada pelos adapters de score). */
export type EscalaFonte = "0-10" | "0-100" | "0-5" | "0-4" | "ratio";

export interface NotaDescoberta {
  /** Id canônico no source-registry ('tmdb', 'igdb', 'igdb_publico', 'anilist'). */
  fonte: string;
  escala: EscalaFonte;
  /** Rating BRUTO na escala da fonte (nunca normalizado aqui). */
  rating: number;
  votos: number;
  url?: string;
}

export interface ItemDescoberta {
  /** Valor gravado em `midia.fonte` ('tmdb', 'tmdb_tv', 'igdb', 'jikan'…). */
  fonte: string;
  fonteId: string;
  titulo: string;
  tituloOriginal?: string | null;
  sinopse?: string | null;
  ano?: number | null;
  /**
   * País de origem (ISO 3166-1 alfa-2). Só é preenchido quando a LISTAGEM da
   * fonte já traz o dado — hoje o `/discover/tv` do TMDB traz
   * `origin_country[0]`. Sem isso na listagem fica `null` (o drain preenche).
   */
  paisOrigem?: string | null;
  imagemUrl?: string | null;
  nota?: NotaDescoberta | null;
}

export interface PaginaDescoberta {
  itens: ItemDescoberta[];
  /** `null` = fonte esgotada para este tipo. */
  proximo: Record<string, unknown> | null;
  /** Total reportado pela fonte (quando existe) — só informativo. */
  totalFonte?: number | null;
}

export interface FonteDescoberta {
  tipo: TipoIngestao;
  /** Chave do cursor no banco (com `tipo`). */
  fonte: string;
  rotulo: string;
  /** Variáveis de ambiente obrigatórias para a fonte funcionar. */
  env: readonly string[];
  /** Pausa mínima entre chamadas (throttle político da fonte). */
  pausaMs: number;
  /** Teto de páginas por tique (respeita cota por hora de fontes apertadas). */
  paginasPorTick: number;
  ativo(): boolean;
  proximaPagina(cursor: Record<string, unknown> | null): Promise<PaginaDescoberta>;
}

/** Fator linear rating bruto → escala interna 0–100 (mesma tabela do registro). */
export function fatorDaEscala(escala: EscalaFonte): number {
  switch (escala) {
    case "0-10":
      return 10;
    case "0-100":
      return 1;
    case "0-5":
      return 20;
    case "0-4":
      return 25;
    case "ratio":
      return 100;
    default:
      return 1;
  }
}

/** Normaliza um rating bruto para 0–100; `null` quando fora de faixa útil. */
export function normalizarScore(ratingBruto: number, escala: EscalaFonte): number | null {
  if (!Number.isFinite(ratingBruto) || ratingBruto <= 0) return null;
  const v = ratingBruto * fatorDaEscala(escala);
  if (!Number.isFinite(v)) return null;
  return Math.min(100, Math.max(0, Math.round(v * 10) / 10));
}

/** Classificação da fonte de nota (mesma semântica do source-registry). */
const CLASSIFICACAO_NOTA: Record<string, "critica" | "publico"> = {
  tmdb: "publico",
  igdb: "critica",
  igdb_publico: "publico",
  anilist: "publico",
};

export function classificacaoNota(fonte: string): "critica" | "publico" | null {
  return CLASSIFICACAO_NOTA[fonte] ?? null;
}

/** Slug canônico (mesma regra do slug-service: minúsculo, sem acento, dashes). */
export function slugifyCatalogo(titulo: string): string {
  return String(titulo ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 240);
}

/** Sufixo de slug por tipo (convenção T398/T251). */
export function sufixoSlug(tipo: TipoIngestao): string {
  switch (tipo) {
    case "FILME":
      return "filme";
    case "SERIE":
      return "serie";
    case "GAME":
      return "game";
    case "LIVRO":
      return "livro";
    case "COMIC":
      return "quadrinho";
    case "MANGA":
      return "manga";
    default:
      return "midia";
  }
}

/** Texto de sinopse: remove HTML e espaços repetidos (AniList manda <br>). */
export function limparTexto(texto: unknown): string | null {
  if (typeof texto !== "string") return null;
  const limpo = texto
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    // Tag no meio da frase deixa espaço antes da pontuação ("fantasia .").
    .replace(/\s+([.,;:!?)\]])/g, "$1")
    .trim();
  return limpo ? limpo : null;
}

function inteiro(valor: unknown): number | null {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function lerNumero(cursor: Record<string, unknown> | null, chave: string, padrao: number): number {
  const n = Number(cursor?.[chave]);
  return Number.isFinite(n) ? n : padrao;
}

/** Pausa entre chamadas (sem importar timers globais explicitamente). */
export function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => {
    import("node:timers").then(({ setTimeout: t }) => t(resolve, ms));
  });
}

// ===========================================================================
// TMDB — FILME (discover/movie) e SERIE (discover/tv)
// ===========================================================================

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w780";
/** TMDB aceita página até 500; por ano basta um teto próprio. */
const PAGINAS_POR_ANO_TMDB = 50;
const ANO_MIN_TMDB = 1900;

/**
 * Puro (testado): país de origem direto da listagem. Só o `/discover/tv`
 * expõe `origin_country`; o `/discover/movie` não tem o campo, então filme
 * continua `null` e o país vem do job de continuidade (mesma regra do
 * backfill: `origin_country[0]`).
 */
export function paisOrigemTmdb(r: any, tipo: "FILME" | "SERIE"): string | null {
  if (tipo !== "SERIE") return null;
  const codigo = Array.isArray(r?.origin_country) ? String(r.origin_country[0] ?? "").trim() : "";
  return /^[A-Z]{2}$/.test(codigo) ? codigo : null;
}

export function mapearTmdbItem(r: any, tipo: "FILME" | "SERIE"): ItemDescoberta | null {
  const id = inteiro(r?.id);
  const titulo = String(r?.title ?? r?.name ?? "").trim();
  if (!id || !titulo) return null;
  const data = String(r?.release_date ?? r?.first_air_date ?? "");
  const ano = Number.parseInt(data.slice(0, 4), 10);
  const rating = Number(r?.vote_average ?? 0);
  const votos = Number(r?.vote_count ?? 0);
  const endpoint = tipo === "FILME" ? "movie" : "tv";
  return {
    fonte: tipo === "FILME" ? "tmdb" : "tmdb_tv",
    fonteId: String(id),
    titulo,
    tituloOriginal: r?.original_title ?? r?.original_name ?? null,
    sinopse: limparTexto(r?.overview),
    ano: Number.isFinite(ano) ? ano : null,
    paisOrigem: paisOrigemTmdb(r, tipo),
    imagemUrl: typeof r?.poster_path === "string" ? `${TMDB_IMG}${r.poster_path}` : null,
    nota:
      rating > 0 && votos > 0
        ? {
            fonte: "tmdb",
            escala: "0-10",
            rating,
            votos,
            url: `https://www.themoviedb.org/${endpoint}/${id}`,
          }
        : null,
  };
}

/** Puro (testado): avanço do cursor {ano, pagina} com teto por ano. */
export function avancarCursorTmdb(
  ano: number,
  pagina: number,
  totalPaginas: number,
): Record<string, unknown> | null {
  const paginas = Math.min(Number.isFinite(totalPaginas) ? totalPaginas : 0, PAGINAS_POR_ANO_TMDB);
  if (pagina < paginas) return { ano, pagina: pagina + 1 };
  const proximoAno = ano - 1;
  return proximoAno >= ANO_MIN_TMDB ? { ano: proximoAno, pagina: 1 } : null;
}

function tmdbDescoberta(tipo: "FILME" | "SERIE"): FonteDescoberta {
  return {
    tipo,
    fonte: tipo === "FILME" ? "tmdb" : "tmdb_tv",
    rotulo: `TMDB ${tipo}`,
    env: ["TMDB_API_KEY"],
    pausaMs: 220,
    // 50 páginas × 20 = 1.000 títulos/tique (~11 s de requisições a 220 ms).
    // O TMDB não impõe limite publicado desde 2019; segue educado e cabe nos
    // 5 min de orçamento do tique.
    paginasPorTick: 50,
    ativo: () => Boolean(process.env.TMDB_API_KEY),
    async proximaPagina(cursor) {
      const ano = lerNumero(cursor, "ano", new Date().getUTCFullYear());
      const pagina = lerNumero(cursor, "pagina", 1);
      if (ano < ANO_MIN_TMDB) return { itens: [], proximo: null };
      const endpoint = tipo === "FILME" ? "movie" : "tv";
      const campoData = tipo === "FILME" ? "primary_release_date" : "first_air_date";
      const chave = encodeURIComponent(process.env.TMDB_API_KEY ?? "");
      const url =
        `${TMDB_BASE}/discover/${endpoint}?api_key=${chave}&language=pt-BR` +
        `&include_adult=false&sort_by=popularity.desc&vote_count.gte=5` +
        `&${campoData}.gte=${ano}-01-01&${campoData}.lte=${ano}-12-31&page=${pagina}`;
      const dados = await fetchJson<any>(url, {
        headers: { "User-Agent": UA_BROWSER, "Accept": "application/json" },
        timeoutMs: 20000,
      });
      const itens = (Array.isArray(dados?.results) ? dados.results : [])
        .map((r: any) => mapearTmdbItem(r, tipo))
        .filter((i: ItemDescoberta | null): i is ItemDescoberta => i !== null);
      return {
        itens,
        proximo: avancarCursorTmdb(ano, pagina, Number(dados?.total_pages ?? 0)),
        totalFonte: Number.isFinite(Number(dados?.total_results))
          ? Number(dados.total_results)
          : null,
      };
    },
  };
}

// ===========================================================================
// IGDB — GAME (cursor por id, imune ao teto de offset)
// ===========================================================================

const IGDB_URL = "https://api.igdb.com/v4/games";
const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const LIMITE_IGDB = 500;
const IGDB_CAMPOS =
  "id, name, summary, url, first_release_date, rating, rating_count, " +
  "aggregated_rating, aggregated_rating_count, total_rating_count, " +
  "cover.image_id";

let igdbToken: { token: string; expiraEm: number } | null = null;

async function obterTokenIgdb(): Promise<string> {
  if (igdbToken && Date.now() < igdbToken.expiraEm) return igdbToken.token;
  const corpo = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID ?? "",
    client_secret: process.env.TWITCH_CLIENT_SECRET ?? "",
    grant_type: "client_credentials",
  }).toString();
  const resposta = await postJson<{ access_token?: string; expires_in?: number }>(
    TWITCH_TOKEN_URL,
    corpo,
    {
      headers: {
        "accept": "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      timeoutMs: 20000,
    },
  );
  if (!resposta.access_token) throw new Error("IGDB: token Twitch vazio.");
  igdbToken = {
    token: resposta.access_token,
    expiraEm: Date.now() + ((resposta.expires_in ?? 3600) - 60) * 1000,
  };
  return igdbToken.token;
}

/** Zera o cache de token (testes/rotação de credencial). */
export function resetarTokenIgdb(): void {
  igdbToken = null;
}

export function mapearIgdbItem(g: any): ItemDescoberta | null {
  const id = inteiro(g?.id);
  const titulo = String(g?.name ?? "").trim();
  if (!id || !titulo) return null;
  const critica = Number(g?.aggregated_rating ?? 0);
  const criticaVotos = Number(g?.aggregated_rating_count ?? 0);
  const publico = Number(g?.rating ?? 0);
  const publicoVotos = Number(g?.rating_count ?? 0);
  // Preferência: crítica (agregada) → público. Nunca inventar a que falta.
  const nota: NotaDescoberta | null =
    critica > 0 && criticaVotos > 0
      ? {
          fonte: "igdb",
          escala: "0-100",
          rating: critica,
          votos: criticaVotos,
          url: typeof g?.url === "string" ? g.url : undefined,
        }
      : publico > 0 && publicoVotos > 0
        ? {
            fonte: "igdb_publico",
            escala: "0-100",
            rating: publico,
            votos: publicoVotos,
            url: typeof g?.url === "string" ? g.url : undefined,
          }
        : null;
  const lancamento = Number(g?.first_release_date ?? 0);
  const ano =
    Number.isFinite(lancamento) && lancamento > 0
      ? new Date(lancamento * 1000).getUTCFullYear()
      : null;
  return {
    fonte: "igdb",
    fonteId: String(id),
    titulo,
    sinopse: limparTexto(g?.summary),
    ano,
    imagemUrl:
      typeof g?.cover?.image_id === "string"
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`
        : null,
    nota,
  };
}

function igdbDescoberta(): FonteDescoberta {
  return {
    tipo: "GAME",
    fonte: "igdb",
    rotulo: "IGDB",
    env: ["TWITCH_CLIENT_ID", "TWITCH_CLIENT_SECRET"],
    pausaMs: 320,
    paginasPorTick: 10,
    ativo: () => Boolean(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET),
    async proximaPagina(cursor) {
      const ultimoId = lerNumero(cursor, "ultimoId", 0);
      const token = await obterTokenIgdb();
      // `sort id` + `where id > cursor` pagina SEM teto de offset (o IGDB limita
      // offset; por id o cursor é estável e nunca repete).
      const corpo =
        `fields ${IGDB_CAMPOS}; ` +
        (ultimoId > 0 ? `where id > ${ultimoId}; ` : "") +
        `sort id asc; limit ${LIMITE_IGDB};`;
      const linhas = await postJson<any[]>(IGDB_URL, corpo, {
        headers: {
          "client-id": process.env.TWITCH_CLIENT_ID ?? "",
          "authorization": `Bearer ${token}`,
          "accept": "application/json",
          "content-type": "text/plain",
        },
        timeoutMs: 20000,
      });
      const itens = (Array.isArray(linhas) ? linhas : [])
        .map(mapearIgdbItem)
        .filter((i): i is ItemDescoberta => i !== null);
      const ultimo =
        Array.isArray(linhas) && linhas.length ? inteiro(linhas[linhas.length - 1]?.id) : null;
      return {
        itens,
        proximo:
          Array.isArray(linhas) && linhas.length >= LIMITE_IGDB && ultimo
            ? { ultimoId: ultimo }
            : null,
      };
    },
  };
}

// ===========================================================================
// AniList → MAL ids (MANGA)
// ===========================================================================

const ANILIST_URL = "https://graphql.anilist.co";
const ANILIST_POR_PAGINA = 50;
const ANILIST_QUERY = `query ($page: Int) {
  Page(page: $page, perPage: ${ANILIST_POR_PAGINA}) {
    pageInfo { hasNextPage }
    media(type: MANGA, sort: POPULARITY_DESC, isAdult: false) {
      id
      idMal
      meanScore
      popularity
      siteUrl
      description
      startDate { year }
      title { romaji english native }
      coverImage { large }
    }
  }
}`;

/**
 * O id gravado é o do MAL (`idMal`): assim o título novo herda TODO o
 * enriquecimento já existente para `fonte='jikan'` (autores, sinopse, revista).
 * Entrada sem `idMal` é descartada — sem id canônico não há identidade (D3e).
 */
export function mapearAnilistItem(m: any): ItemDescoberta | null {
  const idMal = inteiro(m?.idMal);
  const titulo = String(m?.title?.romaji ?? m?.title?.english ?? m?.title?.native ?? "").trim();
  if (!idMal || !titulo) return null;
  const mean = Number(m?.meanScore ?? 0);
  const popularidade = Number(m?.popularity ?? 0);
  return {
    fonte: "jikan",
    fonteId: String(idMal),
    titulo,
    tituloOriginal: typeof m?.title?.native === "string" ? m.title.native : null,
    sinopse: limparTexto(m?.description),
    ano: Number.isInteger(Number(m?.startDate?.year)) ? Number(m.startDate.year) : null,
    imagemUrl: typeof m?.coverImage?.large === "string" ? m.coverImage.large : null,
    nota:
      mean > 0
        ? {
            fonte: "anilist",
            escala: "0-100",
            rating: mean,
            votos: Number.isFinite(popularidade) ? popularidade : 0,
            url: typeof m?.siteUrl === "string" ? m.siteUrl : undefined,
          }
        : null,
  };
}

function anilistDescoberta(): FonteDescoberta {
  return {
    tipo: "MANGA",
    fonte: "jikan",
    rotulo: "AniList (ids MAL)",
    env: [],
    pausaMs: 800,
    // AniList tem limite de ~90 req/min: 16 páginas × 50 = 800/tique, com folga.
    paginasPorTick: 16,
    ativo: () => true,
    async proximaPagina(cursor) {
      const page = lerNumero(cursor, "pagina", 1);
      const dados = await postJson<any>(
        ANILIST_URL,
        JSON.stringify({ query: ANILIST_QUERY, variables: { page } }),
        {
          headers: {
            "User-Agent": UA_BROWSER,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          timeoutMs: 20000,
        },
      );
      const medias = dados?.data?.Page?.media;
      const itens = (Array.isArray(medias) ? medias : [])
        .map(mapearAnilistItem)
        .filter((i): i is ItemDescoberta => i !== null);
      const temProxima = Boolean(dados?.data?.Page?.pageInfo?.hasNextPage);
      return { itens, proximo: temProxima ? { pagina: page + 1 } : null };
    },
  };
}

// ===========================================================================
// OpenLibrary — LIVRO (busca por assunto, paginada)
// ===========================================================================

const OPENLIBRARY_SEARCH = "https://openlibrary.org/search.json";
/** Assuntos usados como partições (25k em um único assunto não pagina). */
export const ASSUNTOS_LIVRO: readonly string[] = [
  "fiction",
  "fantasy",
  "science_fiction",
  "mystery",
  "romance",
  "horror",
  "thriller",
  "biography",
  "history",
  "poetry",
  "philosophy",
  "psychology",
  "science",
  "business",
  "juvenile_fiction",
  "young_adult_fiction",
  "comics_and_graphic_novels",
  "literature",
];
const OPENLIBRARY_PAGINAS_ASSUNTO = 100;
const OPENLIBRARY_LIMITE = 100;

export function mapearOpenLibraryItem(d: any): ItemDescoberta | null {
  const chave = String(d?.key ?? "");
  const id = chave.startsWith("/works/") ? chave.slice("/works/".length) : "";
  const titulo = String(d?.title ?? "").trim();
  if (!/^OL[0-9]+W$/.test(id) || !titulo) return null;
  const ano = Number.parseInt(String(d?.first_publish_year ?? ""), 10);
  return {
    fonte: "openlibrary",
    fonteId: id,
    titulo,
    ano: Number.isFinite(ano) ? ano : null,
    // Sem nota na listagem do OpenLibrary: a nota de livro vem do Google Books
    // no job de avaliação (cota diária) — aqui seria invenção.
    imagemUrl:
      Number.isInteger(Number(d?.cover_i)) && Number(d.cover_i) > 0
        ? `https://covers.openlibrary.org/b/id/${Number(d.cover_i)}-L.jpg`
        : null,
    nota: null,
  };
}

function openLibraryDescoberta(): FonteDescoberta {
  return {
    tipo: "LIVRO",
    fonte: "openlibrary",
    rotulo: "OpenLibrary",
    env: [],
    pausaMs: 300,
    paginasPorTick: 10,
    ativo: () => true,
    async proximaPagina(cursor) {
      let assunto = lerNumero(cursor, "assunto", 0);
      let pagina = lerNumero(cursor, "pagina", 1);
      if (assunto < 0 || assunto >= ASSUNTOS_LIVRO.length) return { itens: [], proximo: null };
      const url =
        `${OPENLIBRARY_SEARCH}?q=${encodeURIComponent(`subject:${ASSUNTOS_LIVRO[assunto]}`)}` +
        `&limit=${OPENLIBRARY_LIMITE}&page=${pagina}` +
        `&fields=${encodeURIComponent("key,title,first_publish_year,cover_i,edition_count")}`;
      const dados = await fetchJson<any>(url, {
        headers: { "User-Agent": UA_BROWSER, "Accept": "application/json" },
        timeoutMs: 20000,
      });
      const docs = dados?.docs;
      const itens = (Array.isArray(docs) ? docs : [])
        .map(mapearOpenLibraryItem)
        .filter((i): i is ItemDescoberta => i !== null);
      // Página vazia ou no teto do assunto → próximo assunto.
      let proximo: Record<string, unknown> | null;
      if (
        Array.isArray(docs) &&
        docs.length >= OPENLIBRARY_LIMITE &&
        pagina < OPENLIBRARY_PAGINAS_ASSUNTO
      ) {
        proximo = { assunto, pagina: pagina + 1 };
      } else {
        assunto += 1;
        pagina = 1;
        proximo = assunto < ASSUNTOS_LIVRO.length ? { assunto, pagina: 1 } : null;
      }
      return {
        itens,
        proximo,
        totalFonte: Number.isFinite(Number(dados?.numFound)) ? Number(dados.numFound) : null,
      };
    },
  };
}

// ===========================================================================
// ComicVine — COMIC (volumes, paginação por offset)
// ===========================================================================

const COMICVINE_BASE = "https://comicvine.gamespot.com/api";
const COMICVINE_LIMITE = 100;
const COMICVINE_CAMPOS = "id,name,deck,start_year,image,site_detail_url,publisher";

export function mapearComicVineItem(v: any): ItemDescoberta | null {
  const id = inteiro(v?.id);
  const titulo = String(v?.name ?? "").trim();
  if (!id || !titulo) return null;
  const ano = Number.parseInt(String(v?.start_year ?? ""), 10);
  const imagem =
    typeof v?.image?.original_url === "string"
      ? v.image.original_url
      : typeof v?.image?.medium_url === "string"
        ? v.image.medium_url
        : null;
  return {
    fonte: "comicvine",
    fonteId: String(id),
    titulo,
    sinopse: limparTexto(v?.deck),
    ano: Number.isFinite(ano) ? ano : null,
    imagemUrl: imagem,
    // ComicVine não publica nota de público: a nota de COMIC precisa de outra
    // fonte (decisão do Operador) — inventar aqui violaria a regra do projeto.
    nota: null,
  };
}

function comicVineDescoberta(): FonteDescoberta {
  return {
    tipo: "COMIC",
    fonte: "comicvine",
    rotulo: "ComicVine",
    env: ["COMICVINE_API_KEY"],
    // Free tier: 200 requisições/hora → 4 páginas/tique (10 min) = 24/h, folga.
    pausaMs: 1100,
    paginasPorTick: 4,
    ativo: () => Boolean(process.env.COMICVINE_API_KEY),
    async proximaPagina(cursor) {
      const offset = lerNumero(cursor, "offset", 0);
      const chave = encodeURIComponent(process.env.COMICVINE_API_KEY ?? "");
      const url =
        `${COMICVINE_BASE}/volumes/?api_key=${chave}&format=json` +
        `&limit=${COMICVINE_LIMITE}&offset=${offset}&field_list=${COMICVINE_CAMPOS}`;
      const dados = await fetchJson<any>(url, {
        headers: { "User-Agent": UA_BROWSER, "Accept": "application/json" },
        timeoutMs: 20000,
      });
      if (Number(dados?.status_code) !== 1) {
        throw new Error(
          `ComicVine: status ${String(dados?.status_code)} (${String(dados?.error ?? "erro")})`,
        );
      }
      const linhas = Array.isArray(dados?.results) ? dados.results : [];
      const itens = linhas
        .map(mapearComicVineItem)
        .filter((i: ItemDescoberta | null): i is ItemDescoberta => i !== null);
      const total = Number(dados?.number_of_total_results);
      const proximoOffset = offset + COMICVINE_LIMITE;
      return {
        itens,
        proximo:
          linhas.length >= COMICVINE_LIMITE && (!Number.isFinite(total) || proximoOffset < total)
            ? { offset: proximoOffset }
            : null,
        totalFonte: Number.isFinite(total) ? total : null,
      };
    },
  };
}

// ===========================================================================
// Registro
// ===========================================================================

/** Fontes de descoberta na ordem em que o motor as atende. */
export function fontesDescoberta(): FonteDescoberta[] {
  return [
    tmdbDescoberta("FILME"),
    tmdbDescoberta("SERIE"),
    igdbDescoberta(),
    anilistDescoberta(),
    openLibraryDescoberta(),
    comicVineDescoberta(),
  ];
}

/** Estatística de referência da escala (reuso do adapter de score). */
export function estatisticasEscala(escala: EscalaFonte): { media: number; desvio: number } {
  return estatisticas(escala);
}
