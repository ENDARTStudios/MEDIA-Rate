import { describe, it, expect } from "vitest";
import { slugify, mapearResultado, resolverSlugs } from "../scripts/import-catalogo-tmdb.mjs";

/**
 * T170 (Onda D1) — importação TMDB discover: mapper de resultado (linha +
 * score v2 do público) e resolvedor de slugs únicos (colisão ganha sufixo
 * do tipo, depois numérico — convenção T398/T251).
 */

describe("slugify (T170)", () => {
  it("minúsculo, sem acento, dashes; corta em 240", () => {
    expect(slugify("Aprendendo a Lição")).toBe("aprendendo-a-licao");
    expect(slugify("  --O Hobbit--  ")).toBe("o-hobbit");
  });
});

describe("mapearResultado (T170)", () => {
  it("filme: campos completos + score = nota×10 (0-100)", () => {
    const r = mapearResultado(
      {
        id: 693134,
        title: "Duna: Parte Dois",
        original_title: "Dune: Part Two",
        overview: "  Paul Atreides une-se aos Fremen.  ",
        release_date: "2024-02-27",
        vote_average: 8.1,
        vote_count: 5200,
        poster_path: "/abc.jpg",
      },
      "FILME",
    );
    expect(r).toMatchObject({
      fonte: "tmdb",
      fonte_id: "693134",
      titulo: "Duna: Parte Dois",
      titulo_original: "Dune: Part Two",
      sinopse: "Paul Atreides une-se aos Fremen.",
      ano_lancamento: 2024,
      imagem_url: "https://image.tmdb.org/t/p/w780/abc.jpg",
      score: 81,
      votos: 5200,
    });
    expect(() => JSON.stringify(r)).not.toThrow();
  });

  it("série usa name/first_air_date/fonte tmdb_tv; sem overview → null; nota 0 → score null", () => {
    const r = mapearResultado(
      {
        id: 9,
        name: "Reacher",
        overview: "",
        first_air_date: "2022-02-04",
        vote_average: 0,
        poster_path: null,
      },
      "SERIE",
    );
    expect(r).toMatchObject({ fonte: "tmdb_tv", titulo: "Reacher", sinopse: null, score: null });
  });
});

describe("resolverSlugs (T170)", () => {
  it("colisão com existente ganha sufixo do tipo; persistindo com numérico", () => {
    const candidatos = [
      { fonte: "tmdb", fonte_id: "1", titulo: "Duna", tipo: "FILME" },
      { fonte: "tmdb", fonte_id: "2", titulo: "Duna", tipo: "SERIE" },
      { fonte: "tmdb", fonte_id: "3", titulo: "Duna", tipo: "FILME" },
    ];
    const r = resolverSlugs(candidatos, ["duna"]);
    expect(r.map((c) => c.slug)).toEqual(["duna-filme", "duna-serie", "duna-filme-2"]);
  });

  it("sem colisão usa o slug base; dentro do lote não reutiliza", () => {
    const r = resolverSlugs(
      [
        { fonte: "tmdb", fonte_id: "1", titulo: "Matrix", tipo: "FILME" },
        { fonte: "tmdb", fonte_id: "2", titulo: "Matrix", tipo: "FILME" },
      ],
      [],
    );
    expect(r[0].slug).toBe("matrix");
    expect(r[1].slug).toBe("matrix-filme");
  });
});
