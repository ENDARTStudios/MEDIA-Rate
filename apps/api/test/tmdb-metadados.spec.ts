/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { mapearMovie, mapearTv } from "../scripts/backfill-tmdb-metadados.mjs";

/**
 * T164 (Onda C1) — mapper TMDB do backfill de metadados ricos:
 * elenco (top cast com personagem/foto), produtoras/estúdios (e networks
 * em séries) e backdrop. NUNCA fabrica: payload vazio → resultado vazio.
 */

const MOVIE = {
  backdrop_path: "/abc123.jpg",
  credits: {
    cast: Array.from({ length: 20 }, (_, i) => ({
      id: 100 + i,
      name: `Ator ${i}`,
      character: `Personagem ${i}`,
      order: i,
      profile_path: i < 3 ? `/perfil${i}.jpg` : null,
    })),
  },
  production_companies: [
    { id: 33, name: "Universal Pictures" },
    { id: 33, name: "Universal Pictures" }, // duplicada no payload
    { id: 999, name: "" }, // sem nome → fora
  ],
};

const TV = {
  backdrop_path: "/tv123.jpg",
  aggregate_credits: {
    cast: [
      {
        id: 7,
        name: "Bryan Cranston",
        profile_path: "/hal.jpg",
        roles: [
          { character: "Walter White" },
          { character: "Hal (crossover)" }, // pega o primeiro role
        ],
        order: 0,
        total_episode_count: 62,
      },
    ],
  },
  production_companies: [{ id: 52, name: "High Bridge Productions" }],
  networks: [{ id: 70, name: "AMC" }],
};

describe("mapearMovie / mapearTv (T164 — metadados TMDB)", () => {
  it("movie: top 15 do elenco com personagem/foto, produtoras dedupe, backdrop w1280", () => {
    const r = mapearMovie(MOVIE);
    expect(r.elenco).toHaveLength(15);
    expect(r.elenco[0]).toEqual({
      fonte_id: "100",
      nome: "Ator 0",
      personagem: "Personagem 0",
      ordem: 0,
      foto_url: "https://image.tmdb.org/t/p/w185/perfil0.jpg",
    });
    expect(r.produtoras).toEqual([
      { fonte_id: "33", nome: "Universal Pictures", papel: "PRODUTORA" },
    ]);
    expect(r.backdrop_url).toBe("https://image.tmdb.org/t/p/w1280/abc123.jpg");
    expect(() => JSON.stringify(r)).not.toThrow();
  });

  it("tv: aggregate_credits com primeiro role; companies PRODUTORA + networks NETWORK", () => {
    const r = mapearTv(TV);
    expect(r.elenco).toHaveLength(1);
    expect(r.elenco[0]).toMatchObject({
      fonte_id: "7",
      nome: "Bryan Cranston",
      personagem: "Walter White",
      ordem: 0,
    });
    expect(r.produtoras).toEqual([
      { fonte_id: "52", nome: "High Bridge Productions", papel: "PRODUTORA" },
      { fonte_id: "70", nome: "AMC", papel: "NETWORK" },
    ]);
    expect(r.backdrop_url).toBe("https://image.tmdb.org/t/p/w1280/tv123.jpg");
  });

  it("payload vazio/parcial → vazio (nunca fabrica dado)", () => {
    expect(mapearMovie({})).toEqual({ elenco: [], produtoras: [], backdrop_url: null });
    expect(mapearTv({ credits: { cast: [] } })).toEqual({
      elenco: [],
      produtoras: [],
      backdrop_url: null,
    });
  });

  it("tv sem aggregate_credits cai para credits legado", () => {
    const r = mapearTv({
      credits: { cast: [{ id: 5, name: "Legacy", character: "Papel", order: 0 }] },
    });
    expect(r.elenco[0]).toMatchObject({ nome: "Legacy", personagem: "Papel" });
  });
});
