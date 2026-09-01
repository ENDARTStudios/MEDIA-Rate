/**
 * refresh.config.ts — cadência de refrescamento das fontes externas (D-410/T426).
 *
 * Regra: TODAS as APIs externas (OpenCritic, TMDB, IMDb, Metacritic, IGDB,
 * MAL, Jikan, AniList, Kitsu, MangaDex, OpenLibrary, ComicVine, Google Books…)
 * refrescam no máximo 1x por semana por mídia. O score-job só re-consulta
 * mídias com `avaliacoes_atualizadas_em` NULL ou mais velhas que este intervalo;
 * execuções seguintes pulam as frescas (0 chamadas desnecessárias).
 */
export const REFRESH_INTERVAL_DAYS = Number(process.env.REFRESH_INTERVAL_DAYS ?? 7);
export const REFRESH_INTERVAL_MS = REFRESH_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
