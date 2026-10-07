import { describe, it, expect } from "vitest";
import { mapearRatingsOmdb } from "../src/modules/media-score/adapters/omdb.adapter.js";

/**
 * T175 — crítica real via array Ratings do OMDb (sem scraping): RT "85%" e
 * Metacritic "77/100" viram NotaColetada na escala 0-100 (bucket crítica do
 * registry); fontes desconhecidas e valores vazios são ignorados.
 */

describe("mapearRatingsOmdb (T175)", () => {
  const url = "https://www.imdb.com/title/tt0111161";

  it("extrai Rotten Tomatoes e Metacritic na escala 0-100", () => {
    const r = mapearRatingsOmdb(
      [
        { Source: "Internet Movie Database", Value: "9.3/10" },
        { Source: "Rotten Tomatoes", Value: "91%" },
        { Source: "Metacritic", Value: "80/100" },
      ],
      url,
    );
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ fonte: "rottentomatoes", rating: 91, url });
    expect(r[1]).toMatchObject({ fonte: "metacritic", rating: 80, url });
    // Escala de referência 0-100 (registry: media 70, desvio 15).
    expect(r[0].media_fonte).toBe(70);
    expect(() => JSON.stringify(r)).not.toThrow();
  });

  it("valores sem número são ignorados", () => {
    expect(mapearRatingsOmdb([{ Source: "Rotten Tomatoes", Value: "N/A" }], url)).toEqual([]);
  });

  it("sem Ratings → vazio", () => {
    expect(mapearRatingsOmdb(undefined, url)).toEqual([]);
  });
});
