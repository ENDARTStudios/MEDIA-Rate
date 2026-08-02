/**
 * Registro espelho (web) das fontes de nota — sincronizado com
 * apps/api/src/modules/media-score/source-registry.ts (especificação
 * "Fontes de Dados"). Usado pelo engine para classificar cada fonte como
 * CRÍTICA ou PÚBLICO e derivar as duas barras (fix CRIT-02).
 *
 * `escala` seleciona as estatísticas (média/desvio) usadas no z-score.
 * Pesos por tipo seguem a tabela do registro (soma 1.00 por bucket).
 */

export type ClassificacaoFonte = "critica" | "publico";

export interface FonteWeb {
  id: string;
  rotulo: string;
  classificacao: ClassificacaoFonte;
  escala: "0-10" | "0-100" | "0-5" | "0-4" | "ratio";
}

export const FONTES_WEB: Record<string, FonteWeb> = {
  tmdb: { id: "tmdb", rotulo: "TMDB", classificacao: "publico", escala: "0-10" },
  // "imdb" (legado nos mocks) é tratado como o mesmo dado do OMDb no engine.
  omdb: { id: "omdb", rotulo: "OMDb (IMDb)", classificacao: "publico", escala: "0-10" },
  imdb_dataset: {
    id: "imdb_dataset",
    rotulo: "IMDb Datasets",
    classificacao: "publico",
    escala: "0-10",
  },
  tvmaze: { id: "tvmaze", rotulo: "TVMaze", classificacao: "publico", escala: "0-10" },
  trakt: { id: "trakt", rotulo: "Trakt.tv", classificacao: "publico", escala: "0-10" },
  letterboxd: { id: "letterboxd", rotulo: "Letterboxd", classificacao: "publico", escala: "0-5" },
  rottentomatoes: {
    id: "rottentomatoes",
    rotulo: "Rotten Tomatoes",
    classificacao: "critica",
    escala: "0-100",
  },
  rottentomatoes_audience: {
    id: "rottentomatoes_audience",
    rotulo: "RT (Audiência)",
    classificacao: "publico",
    escala: "0-100",
  },
  metacritic: { id: "metacritic", rotulo: "Metacritic", classificacao: "critica", escala: "0-100" },
  metacritic_user: {
    id: "metacritic_user",
    rotulo: "Metacritic (Público)",
    classificacao: "publico",
    escala: "0-10",
  },
  rogerebert: { id: "rogerebert", rotulo: "RogerEbert", classificacao: "critica", escala: "0-4" },
  igdb: { id: "igdb", rotulo: "IGDB (agregada)", classificacao: "critica", escala: "0-100" },
  igdb_publico: {
    id: "igdb_publico",
    rotulo: "IGDB (público)",
    classificacao: "publico",
    escala: "0-100",
  },
  rawg: { id: "rawg", rotulo: "RAWG", classificacao: "publico", escala: "0-5" },
  steam: { id: "steam", rotulo: "Steam Store", classificacao: "publico", escala: "ratio" },
  steamspy: { id: "steamspy", rotulo: "Steam Spy", classificacao: "publico", escala: "ratio" },
  opencritic: { id: "opencritic", rotulo: "OpenCritic", classificacao: "critica", escala: "0-100" },
  openlibrary: {
    id: "openlibrary",
    rotulo: "Open Library",
    classificacao: "publico",
    escala: "0-5",
  },
  googlebooks: {
    id: "googlebooks",
    rotulo: "Google Books",
    classificacao: "publico",
    escala: "0-5",
  },
  goodreads: { id: "goodreads", rotulo: "Goodreads", classificacao: "publico", escala: "0-5" },
  librarything: {
    id: "librarything",
    rotulo: "LibraryThing",
    classificacao: "publico",
    escala: "0-5",
  },
  skoob: { id: "skoob", rotulo: "Skoob", classificacao: "publico", escala: "0-5" },
  amazon: { id: "amazon", rotulo: "Amazon", classificacao: "publico", escala: "0-5" },
  comicvine: { id: "comicvine", rotulo: "Comic Vine", classificacao: "publico", escala: "0-5" },
  comicbookroundup: {
    id: "comicbookroundup",
    rotulo: "ComicBookRoundup",
    classificacao: "critica",
    escala: "0-100",
  },
  jikan: { id: "jikan", rotulo: "MyAnimeList", classificacao: "publico", escala: "0-10" },
  anilist: { id: "anilist", rotulo: "AniList", classificacao: "publico", escala: "0-100" },
  kitsu: { id: "kitsu", rotulo: "Kitsu", classificacao: "publico", escala: "0-100" },
  mangadex: { id: "mangadex", rotulo: "MangaDex", classificacao: "publico", escala: "0-10" },
  animeplanet: {
    id: "animeplanet",
    rotulo: "Anime-Planet",
    classificacao: "publico",
    escala: "0-5",
  },
};

/** Pesos por bucket (espelho de PESOS_POR_TIPO_V2 da API). */
export const PESOS_POR_TIPO_WEB: Record<
  string,
  { critica: Record<string, number>; publico: Record<string, number> }
> = {
  movie: {
    critica: { metacritic: 0.6, rottentomatoes: 0.4 },
    publico: {
      tmdb: 0.3,
      omdb: 0.25,
      trakt: 0.15,
      letterboxd: 0.15,
      rottentomatoes_audience: 0.15,
    },
  },
  series: {
    critica: { metacritic: 0.6, rottentomatoes: 0.4 },
    publico: { tmdb: 0.3, tvmaze: 0.25, omdb: 0.15, trakt: 0.15, rottentomatoes_audience: 0.15 },
  },
  game: {
    critica: { igdb: 0.5, opencritic: 0.3, metacritic: 0.2 },
    publico: { rawg: 0.35, igdb_publico: 0.25, steam: 0.15, steamspy: 0.1, metacritic_user: 0.15 },
  },
  book: {
    critica: {},
    publico: { openlibrary: 0.35, googlebooks: 0.25, goodreads: 0.25, skoob: 0.15 },
  },
  comic: {
    critica: { comicbookroundup: 1 },
    publico: { comicvine: 0.6, amazon: 0.4 },
  },
  anime: {
    critica: {},
    publico: { jikan: 0.3, anilist: 0.3, kitsu: 0.2, mangadex: 0.2 },
  },
};
