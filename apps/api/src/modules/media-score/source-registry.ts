/**
 * Registro de Fontes de Dados — MEDIA Rate (especificação "Fontes de Dados,
 * Todas as Mídias", Instruções Mestre V1/V2, Appendix A §2 Official Sources Only).
 *
 * Princípios de coleta:
 *   1. API oficial gratuita (key ou sem key) — sempre preferida
 *   2. Dataset open source (download) — IMDb, OpenLibrary
 *   3. API gratuita com OAuth — IGDB, Twitch
 *   4. Scraping de nota numérica isolada — apenas quando não existir API gratuita
 *
 * Fundamento legal do scraping numérico: números são fatos matemáticos, não
 * expressão criativa. Fatos não são protegidos por copyright (Feist Publications
 * v. Rural Telephone, 499 U.S. 340; art. 7º Lei 9.610/98). A coleta é exclusiva
 * da nota numérica — sem texto, imagens, metadados editoriais ou estrutura.
 *
 * `fator100` converte o rating BRUTO da fonte para a escala interna 0–100
 * (todas as fórmulas da especificação são lineares):
 *   filme/série (0–10):  ×10   | games (0–100): ×1  | RAWG (0–5): ×20
 *   Steam ratio (0–1):   ×100  | Letterboxd (0–5): ×20 | RogerEbert (0–4): ×25
 *   RT %/Metascore/OpenCritic (0–100): ×1
 */

export type ClassificacaoFonte = "critica" | "publico";
export type DominioMidia = "filme_serie" | "game" | "livro" | "hq" | "anime_manga";
export type StatusFonte = "ativo" | "preparacao" | "inativo";
export type MetodoColeta = "api" | "dataset" | "oauth" | "scrape_numerico";

export interface FonteMeta {
  /** Identificador canônico da fonte (usado em `sources[].source`). */
  id: string;
  /** Nome de exibição. */
  rotulo: string;
  /** Domínios de mídia cobertos. */
  dominio: DominioMidia[];
  classificacao: ClassificacaoFonte;
  /** Escala canônica do domínio (para referência/UI). */
  escala: string;
  /** Fator linear: rating bruto → 0–100. */
  fator100: number;
  metodo: MetodoColeta;
  status: StatusFonte;
  /** Requer chave/credencial (env) para funcionar. */
  requerChave?: boolean;
}

/** Aliases legados → id canônico (ex.: seed antigo usava `tmdb_tv`). */
export const ALIASES_FONTE: Record<string, string> = {
  tmdb_tv: "tmdb",
  imdb_dataset: "imdb_dataset",
};

export const FONTES: FonteMeta[] = [
  // ── Filmes e Séries ─────────────────────────────────────────────────────
  {
    id: "tmdb",
    rotulo: "TMDB",
    dominio: ["filme_serie"],
    classificacao: "publico",
    escala: "0-10",
    fator100: 10,
    metodo: "api",
    status: "ativo",
    requerChave: true,
  },
  {
    id: "tvmaze",
    rotulo: "TVMaze",
    dominio: ["filme_serie"],
    classificacao: "publico",
    escala: "0-10",
    fator100: 10,
    metodo: "api",
    status: "ativo",
  },
  {
    id: "omdb",
    rotulo: "OMDb (IMDb)",
    dominio: ["filme_serie"],
    classificacao: "publico",
    escala: "0-10",
    fator100: 10,
    metodo: "api",
    status: "ativo",
    requerChave: true,
  },
  {
    id: "trakt",
    rotulo: "Trakt.tv",
    dominio: ["filme_serie"],
    classificacao: "publico",
    escala: "0-10",
    fator100: 10,
    metodo: "api",
    status: "ativo",
    requerChave: true,
  },
  {
    id: "imdb",
    rotulo: "IMDb",
    dominio: ["filme_serie"],
    classificacao: "publico",
    escala: "0-10",
    fator100: 10,
    metodo: "api",
    status: "ativo",
  },
  {
    id: "imdb_dataset",
    rotulo: "IMDb Datasets",
    dominio: ["filme_serie"],
    classificacao: "publico",
    escala: "0-10",
    fator100: 10,
    metodo: "dataset",
    status: "ativo",
  },
  {
    id: "rottentomatoes",
    rotulo: "Rotten Tomatoes",
    dominio: ["filme_serie"],
    classificacao: "critica",
    escala: "0-100%",
    fator100: 1,
    metodo: "scrape_numerico",
    status: "ativo",
  },
  {
    id: "metacritic",
    rotulo: "Metacritic",
    dominio: ["filme_serie", "game"],
    classificacao: "critica",
    escala: "0-100",
    fator100: 1,
    metodo: "scrape_numerico",
    status: "ativo",
  },
  {
    id: "rottentomatoes_audience",
    rotulo: "Rotten Tomatoes (Audiência)",
    dominio: ["filme_serie"],
    classificacao: "publico",
    escala: "0-100%",
    fator100: 1,
    metodo: "scrape_numerico",
    status: "ativo",
  },
  {
    id: "metacritic_user",
    rotulo: "Metacritic (Público)",
    dominio: ["filme_serie", "game"],
    classificacao: "publico",
    escala: "0-10",
    fator100: 10,
    metodo: "scrape_numerico",
    status: "ativo",
  },
  {
    id: "letterboxd",
    rotulo: "Letterboxd",
    dominio: ["filme_serie"],
    classificacao: "publico",
    escala: "0-5",
    fator100: 20,
    metodo: "scrape_numerico",
    status: "ativo",
  },
  {
    id: "rogerebert",
    rotulo: "RogerEbert.com",
    dominio: ["filme_serie"],
    classificacao: "critica",
    escala: "0-4",
    fator100: 25,
    metodo: "scrape_numerico",
    status: "ativo",
  },

  // ── Games ───────────────────────────────────────────────────────────────
  {
    id: "igdb",
    rotulo: "IGDB (agregada)",
    dominio: ["game"],
    classificacao: "critica",
    escala: "0-100",
    fator100: 1,
    metodo: "oauth",
    status: "ativo",
    requerChave: true,
  },
  {
    id: "igdb_publico",
    rotulo: "IGDB (público)",
    dominio: ["game"],
    classificacao: "publico",
    escala: "0-100",
    fator100: 1,
    metodo: "oauth",
    status: "ativo",
    requerChave: true,
  },
  {
    id: "rawg",
    rotulo: "RAWG",
    dominio: ["game"],
    classificacao: "publico",
    escala: "0-5",
    fator100: 20,
    metodo: "api",
    status: "ativo",
    requerChave: true,
  },
  {
    id: "steam",
    rotulo: "Steam Store",
    dominio: ["game"],
    classificacao: "publico",
    escala: "0-100",
    fator100: 100,
    metodo: "api",
    status: "ativo",
  },
  {
    id: "steamspy",
    rotulo: "Steam Spy",
    dominio: ["game"],
    classificacao: "publico",
    escala: "0-100",
    fator100: 100,
    metodo: "api",
    // API pública descontinuada (resposta vazia); acesso atual exige chave paga.
    status: "inativo",
    requerChave: true,
  },
  {
    id: "opencritic",
    rotulo: "OpenCritic",
    dominio: ["game"],
    classificacao: "critica",
    escala: "0-100",
    fator100: 1,
    metodo: "api",
    status: "ativo",
  },

  // ── Livros (preparação — "em breve") ────────────────────────────────────
  {
    id: "openlibrary",
    rotulo: "Open Library",
    dominio: ["livro"],
    classificacao: "publico",
    escala: "0-5",
    fator100: 20,
    metodo: "api",
    status: "preparacao",
  },
  {
    id: "googlebooks",
    rotulo: "Google Books",
    dominio: ["livro"],
    classificacao: "publico",
    escala: "0-5",
    fator100: 20,
    metodo: "api",
    status: "preparacao",
  },
  {
    id: "librarything",
    rotulo: "LibraryThing",
    dominio: ["livro"],
    classificacao: "publico",
    escala: "0-10",
    fator100: 10,
    metodo: "api",
    status: "preparacao",
    requerChave: true,
  },
  {
    id: "goodreads",
    rotulo: "Goodreads",
    dominio: ["livro"],
    classificacao: "publico",
    escala: "0-5",
    fator100: 20,
    metodo: "scrape_numerico",
    status: "preparacao",
  },
  {
    id: "amazon",
    rotulo: "Amazon",
    dominio: ["livro", "hq"],
    classificacao: "publico",
    escala: "0-5",
    fator100: 20,
    metodo: "scrape_numerico",
    status: "preparacao",
  },
  {
    id: "skoob",
    rotulo: "Skoob",
    dominio: ["livro"],
    classificacao: "publico",
    escala: "0-10",
    fator100: 10,
    metodo: "scrape_numerico",
    status: "preparacao",
  },

  // ── HQs / Comics (preparação — "em breve") ─────────────────────────────
  {
    id: "comicvine",
    rotulo: "Comic Vine",
    dominio: ["hq"],
    classificacao: "publico",
    escala: "0-10",
    fator100: 10,
    metodo: "api",
    status: "preparacao",
    requerChave: true,
  },
  {
    id: "comicbookroundup",
    rotulo: "ComicBookRoundup",
    dominio: ["hq"],
    classificacao: "critica",
    escala: "0-100%",
    fator100: 1,
    metodo: "scrape_numerico",
    status: "preparacao",
  },

  // ── Mangás / Animes (preparação — "em breve") ──────────────────────────
  {
    id: "jikan",
    rotulo: "Jikan (MyAnimeList)",
    dominio: ["anime_manga"],
    classificacao: "publico",
    escala: "0-10",
    fator100: 10,
    metodo: "api",
    status: "preparacao",
  },
  {
    id: "anilist",
    rotulo: "AniList",
    dominio: ["anime_manga"],
    classificacao: "publico",
    escala: "0-100",
    fator100: 1,
    metodo: "api",
    status: "preparacao",
  },
  {
    id: "kitsu",
    rotulo: "Kitsu",
    dominio: ["anime_manga"],
    classificacao: "publico",
    escala: "0-100",
    fator100: 1,
    metodo: "api",
    status: "preparacao",
  },
  {
    id: "mangadex",
    rotulo: "MangaDex",
    dominio: ["anime_manga"],
    classificacao: "publico",
    escala: "0-10",
    fator100: 10,
    metodo: "api",
    status: "preparacao",
  },
  {
    id: "animeplanet",
    rotulo: "Anime-Planet",
    dominio: ["anime_manga"],
    classificacao: "publico",
    escala: "0-5",
    fator100: 20,
    metodo: "scrape_numerico",
    status: "preparacao",
  },
];

/** Fontes de metadados apenas (sem nota — fora do cálculo de score). */
export const FONTES_METADADOS: string[] = [
  "wikidata",
  "wikipedia",
  "opensubtitles",
  "marvel",
  "dc_fandom",
];

const POR_ID: Record<string, FonteMeta> = Object.fromEntries(FONTES.map((f) => [f.id, f]));

export function obterFonte(id: string): FonteMeta | undefined {
  return POR_ID[ALIASES_FONTE[id] ?? id];
}

/** Normaliza rating bruto → 0–100 (escala interna). Linear (ver spec). */
export function normalizarPara100(fonteId: string, rating: number): number | null {
  const meta = obterFonte(fonteId);
  if (!meta) return null;
  return Math.max(0, Math.min(100, rating * meta.fator100));
}

/**
 * Pesos por tipo de mídia e classificação (soma 1.00 por bucket).
 * Fonte sem peso no bucket é ignorada (mesma semântica da v1).
 */
export const PESOS_POR_TIPO_V2: Record<
  string,
  { critica: Record<string, number>; publico: Record<string, number> }
> = {
  FILME: {
    critica: { metacritic: 0.6, rottentomatoes: 0.4 },
    publico: {
      tmdb: 0.3,
      omdb: 0.25,
      trakt: 0.15,
      letterboxd: 0.15,
      rottentomatoes_audience: 0.15,
    },
  },
  SERIE: {
    critica: { metacritic: 0.6, rottentomatoes: 0.4 },
    publico: { tmdb: 0.3, tvmaze: 0.25, omdb: 0.15, trakt: 0.15, rottentomatoes_audience: 0.15 },
  },
  GAME: {
    critica: { igdb: 0.5, opencritic: 0.3, metacritic: 0.2 },
    publico: { rawg: 0.35, igdb_publico: 0.25, steam: 0.15, steamspy: 0.1, metacritic_user: 0.15 },
  },
  LIVRO: {
    critica: {},
    publico: { openlibrary: 0.35, googlebooks: 0.25, goodreads: 0.25, skoob: 0.15 },
  },
  HQ: {
    critica: { comicbookroundup: 1 },
    publico: { comicvine: 0.6, amazon: 0.4 },
  },
  ANIME: {
    critica: {},
    publico: { jikan: 0.3, anilist: 0.3, kitsu: 0.2, mangadex: 0.2 },
  },
};
