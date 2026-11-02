import { describe, expect, it } from "vitest";
import {
  avancarCursorTmdb,
  classificacaoNota,
  fatorDaEscala,
  limparTexto,
  mapearAnilistItem,
  mapearComicVineItem,
  mapearIgdbItem,
  mapearOpenLibraryItem,
  mapearTmdbItem,
  normalizarScore,
  slugifyCatalogo,
  sufixoSlug,
} from "./descoberta.fontes.js";

/**
 * T-DADOS-63 — mappers PUROS da descoberta em escala. Cobrem as regras que,
 * se errarem em produção, gravam dado errado em 25 mil linhas: identidade por
 * id exato, nota só quando a fonte publica, escala correta e slug canônico.
 */
describe("descoberta por mídia (T-DADOS-63)", () => {
  describe("TMDB", () => {
    it("mapeia filme com nota e fonte tmdb", () => {
      const item = mapearTmdbItem(
        {
          id: 603,
          title: "Matrix",
          original_title: "The Matrix",
          overview: "  Um hacker descobre a verdade.  ",
          release_date: "1999-03-31",
          vote_average: 8.2,
          vote_count: 24000,
          poster_path: "/abc.jpg",
        },
        "FILME",
      );
      expect(item).not.toBeNull();
      expect(item!.fonte).toBe("tmdb");
      expect(item!.fonteId).toBe("603");
      expect(item!.ano).toBe(1999);
      expect(item!.nota).toMatchObject({
        fonte: "tmdb",
        escala: "0-10",
        rating: 8.2,
        votos: 24000,
      });
      expect(item!.sinopse).toBe("Um hacker descobre a verdade.");
      expect(item!.imagemUrl).toBe("https://image.tmdb.org/t/p/w780/abc.jpg");
    });

    it("série usa fonte tmdb_tv e data de estreia", () => {
      const item = mapearTmdbItem(
        {
          id: 1399,
          name: "Game of Thrones",
          first_air_date: "2011-04-17",
          vote_average: 8.4,
          vote_count: 22000,
        },
        "SERIE",
      );
      expect(item!.fonte).toBe("tmdb_tv");
      expect(item!.ano).toBe(2011);
      expect(item!.tituloOriginal).toBeNull();
    });

    it("sem voto/votos não inventa nota", () => {
      const item = mapearTmdbItem(
        { id: 1, title: "Sem nota", vote_average: 0, vote_count: 0 },
        "FILME",
      );
      expect(item!.nota).toBeNull();
    });

    it("descarta resultado sem id ou título", () => {
      expect(mapearTmdbItem({ title: "sem id" }, "FILME")).toBeNull();
      expect(mapearTmdbItem({ id: 5, title: "   " }, "FILME")).toBeNull();
    });

    it("cursor avança por página, troca de ano e encerra em 1900", () => {
      expect(avancarCursorTmdb(2026, 1, 12)).toEqual({ ano: 2026, pagina: 2 });
      expect(avancarCursorTmdb(2026, 12, 12)).toEqual({ ano: 2025, pagina: 1 });
      expect(avancarCursorTmdb(1900, 50, 50)).toBeNull();
      // teto por ano (TMDB permite 500, o motor usa 50)
      expect(avancarCursorTmdb(2020, 50, 500)).toEqual({ ano: 2019, pagina: 1 });
    });
  });

  describe("IGDB", () => {
    it("prefere a crítica agregada e converte data unix em ano", () => {
      const item = mapearIgdbItem({
        id: 1029,
        name: "Baldur's Gate 3",
        summary: "RPG",
        url: "https://www.igdb.com/games/baldurs-gate-3",
        first_release_date: 1690848000, // 2023-08-01
        rating: 92.5,
        rating_count: 900,
        aggregated_rating: 96.2,
        aggregated_rating_count: 120,
        cover: { image_id: "co123" },
      });
      expect(item!.fonte).toBe("igdb");
      expect(item!.nota).toMatchObject({
        fonte: "igdb",
        escala: "0-100",
        rating: 96.2,
        votos: 120,
      });
      expect(item!.ano).toBe(2023);
      expect(item!.imagemUrl).toContain("t_cover_big/co123.jpg");
    });

    it("sem crítica usa o rating de público", () => {
      const item = mapearIgdbItem({ id: 7, name: "Indie", rating: 77, rating_count: 42 });
      expect(item!.nota).toMatchObject({ fonte: "igdb_publico", rating: 77, votos: 42 });
    });

    it("sem nenhuma nota publicada fica null (lacuna honesta)", () => {
      const item = mapearIgdbItem({ id: 8, name: "Sem nota", rating: 0, rating_count: 0 });
      expect(item!.nota).toBeNull();
      expect(item!.ano).toBeNull();
    });
  });

  describe("AniList → MAL", () => {
    it("grava o id do MAL para herdar o enriquecimento de jikan", () => {
      const item = mapearAnilistItem({
        id: 30013,
        idMal: 2,
        meanScore: 88,
        popularity: 90000,
        siteUrl: "https://anilist.co/manga/30013",
        description: "Berserk<br>é um mangá de <b>fantasia</b>.",
        startDate: { year: 1989 },
        title: { romaji: "Berserk", english: "Berserk", native: "ベルセルク" },
        coverImage: { large: "https://img/berserk.jpg" },
      });
      expect(item!.fonte).toBe("jikan");
      expect(item!.fonteId).toBe("2");
      expect(item!.nota).toMatchObject({ fonte: "anilist", escala: "0-100", rating: 88 });
      expect(item!.sinopse).toBe("Berserk é um mangá de fantasia.");
      expect(item!.tituloOriginal).toBe("ベルセルク");
    });

    it("descarta entrada sem idMal (sem id canônico não há identidade)", () => {
      expect(mapearAnilistItem({ id: 1, title: { romaji: "X" } })).toBeNull();
    });
  });

  describe("OpenLibrary", () => {
    it("remove o prefixo /works/ do id e não inventa nota", () => {
      const item = mapearOpenLibraryItem({
        key: "/works/OL123W",
        title: "Dom Casmurro",
        first_publish_year: 1899,
        cover_i: 42,
      });
      expect(item!.fonte).toBe("openlibrary");
      expect(item!.fonteId).toBe("OL123W");
      expect(item!.nota).toBeNull();
      expect(item!.imagemUrl).toBe("https://covers.openlibrary.org/b/id/42-L.jpg");
    });

    it("descarta chave fora do padrão OL…W", () => {
      expect(mapearOpenLibraryItem({ key: "/authors/OL9A", title: "Alguém" })).toBeNull();
    });
  });

  describe("ComicVine", () => {
    it("usa a capa original e mantém nota null (sem fonte de nota)", () => {
      const item = mapearComicVineItem({
        id: 1234,
        name: "Batman",
        deck: "Volume do morcego",
        start_year: "1940",
        image: { original_url: "https://cv/batman.jpg" },
      });
      expect(item!.fonte).toBe("comicvine");
      expect(item!.fonteId).toBe("1234");
      expect(item!.ano).toBe(1940);
      expect(item!.nota).toBeNull();
      expect(item!.imagemUrl).toBe("https://cv/batman.jpg");
    });
  });

  describe("normalização e utilitários", () => {
    it("converte a escala da fonte para 0–100", () => {
      expect(fatorDaEscala("0-10")).toBe(10);
      expect(fatorDaEscala("0-100")).toBe(1);
      expect(fatorDaEscala("0-5")).toBe(20);
      expect(normalizarScore(8.2, "0-10")).toBe(82);
      expect(normalizarScore(96.2, "0-100")).toBe(96.2);
      expect(normalizarScore(0, "0-10")).toBeNull();
    });

    it("classifica a fonte de nota como crítica ou público", () => {
      expect(classificacaoNota("tmdb")).toBe("publico");
      expect(classificacaoNota("igdb")).toBe("critica");
      expect(classificacaoNota("anilist")).toBe("publico");
      expect(classificacaoNota("desconhecida")).toBeNull();
    });

    it("slug canônico segue a convenção T398", () => {
      expect(slugifyCatalogo("O Senhor dos Anéis: A Sociedade")).toBe(
        "o-senhor-dos-aneis-a-sociedade",
      );
      expect(sufixoSlug("COMIC")).toBe("quadrinho");
      expect(sufixoSlug("MANGA")).toBe("manga");
    });

    it("limparTexto remove HTML e normaliza espaços", () => {
      expect(limparTexto("  a<br>b <i>c</i>  ")).toBe("a b c");
      expect(limparTexto(null)).toBeNull();
      expect(limparTexto("   ")).toBeNull();
    });
  });
});
