import { describe, it, expect } from "vitest";
import {
  slugBaseFranquia,
  mapearColecaoFilme,
  mapearPaisSerie,
  mapearListaTemporadas,
  mapearEpisodios,
  arestasSequencia,
} from "../scripts/backfill-continuidade.mjs";

/**
 * T165 (Onda C3) — mappers do backfill de continuidade em escala:
 * coleções→franquia (com reuso de curadas por slug-base), temporadas/
 * episódios notados, país de origem e arestas de sequência por ano.
 */

describe("slugBaseFranquia (T165)", () => {
  it("normaliza e remove sufixo de coleção (pt e en)", () => {
    expect(slugBaseFranquia("Duna: Coleção")).toBe("duna");
    expect(slugBaseFranquia("The Avengers Collection")).toBe("the-avengers");
    expect(slugBaseFranquia("O Senhor dos Anéis: A Trilogia")).toBe(
      "o-senhor-dos-aneis-a-trilogia",
    );
    expect(slugBaseFranquia("  ")).toBe("");
  });
});

describe("mapearColecaoFilme / mapearPaisSerie (T165)", () => {
  it("extrai coleção + primeiro país do filme; sem coleção → null", () => {
    expect(
      mapearColecaoFilme({
        belongs_to_collection: { name: "Duna: Coleção" },
        production_countries: [{ iso_3166_1: "US" }, { iso_3166_1: "CA" }],
      }),
    ).toEqual({ colecaoNome: "Duna: Coleção", paisOrigem: "US" });
    expect(mapearColecaoFilme({})).toEqual({ colecaoNome: null, paisOrigem: null });
  });

  it("série: origin_country[0] ou null", () => {
    expect(mapearPaisSerie({ origin_country: ["JP", "US"] })).toBe("JP");
    expect(mapearPaisSerie({})).toBeNull();
  });
});

describe("mapearListaTemporadas (T165)", () => {
  it("só temporadas exibidas (air_date), season > 0, cap e ordenadas", () => {
    const tv = {
      seasons: [
        { season_number: 0, name: "Especiais", air_date: "2010-01-01" }, // specials fora
        { season_number: 2, name: "T2", air_date: "2012-05-05" },
        { season_number: 1, name: "T1", air_date: "2011-04-17" },
        { season_number: 3, name: "T3 futura", air_date: null }, // não exibida fora
      ],
    };
    const r = mapearListaTemporadas(tv);
    expect(r.map((t) => t.numero)).toEqual([1, 2]);
    expect(r[0]).toMatchObject({ numero: 1, titulo: "T1", ano: 2011 });
  });
});

describe("mapearEpisodios (T165)", () => {
  it("nota pública do TMDB; vote_average 0 → null (não fabrica); crítica null", () => {
    const r = mapearEpisodios({
      episodes: [
        { episode_number: 1, name: "Winter Is Coming", air_date: "2011-04-17", vote_average: 8.2 },
        { episode_number: 2, name: "EP 2", air_date: "2011-04-24", vote_average: 0 },
      ],
    });
    expect(r[0]).toEqual({
      numero: 1,
      titulo: "Winter Is Coming",
      data_exibicao: new Date("2011-04-17T00:00:00Z"),
      nota_publico: 8.2,
      nota_critica: null,
    });
    expect(r[1].nota_publico).toBeNull();
    expect(() => JSON.stringify(r)).not.toThrow();
  });
});

describe("arestasSequencia (T165)", () => {
  it("conecta consecutivos por ano, sem ano fica fora", () => {
    const r = arestasSequencia([
      { id: "c", ano: 2003 },
      { id: "a", ano: 2001 },
      { id: "sem-ano", ano: null },
      { id: "b", ano: 2002 },
    ]);
    expect(r).toEqual([
      { anteriorId: "a", sequenciaId: "b" },
      { anteriorId: "b", sequenciaId: "c" },
    ]);
  });
});
