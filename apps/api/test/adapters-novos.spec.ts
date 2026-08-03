import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TmdbAdapter } from "../src/modules/media-score/adapters/tmdb.adapter.js";
import { RawgAdapter } from "../src/modules/media-score/adapters/rawg.adapter.js";

function mockFetch(respostas: { ok?: boolean; status?: number; body: unknown }[]) {
  let indice = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      const r = respostas[Math.min(indice++, respostas.length - 1)];
      return {
        ok: r.ok ?? true,
        status: r.status ?? 200,
        async json() {
          return r.body;
        },
        async text() {
          return JSON.stringify(r.body);
        },
      } as Response;
    }),
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("TmdbAdapter — nova fonte do registro (vote_average 0-10)", () => {
  it("extrai vote_average da busca por filme", async () => {
    vi.stubEnv("TMDB_API_KEY", "teste");
    mockFetch([{ body: { results: [{ id: 238, title: "The Godfather", vote_average: 8.7 }] } }]);
    const notas = await new TmdbAdapter().coletar({
      tipo: "FILME",
      titulo: "The Godfather",
      ano: 1972,
    });
    expect(notas).toHaveLength(1);
    expect(notas[0].rating).toBe(8.7);
    expect(notas[0].url).toBe("https://www.themoviedb.org/movie/238");
  });

  it("usa endpoint de tv para séries", async () => {
    vi.stubEnv("TMDB_API_KEY", "teste");
    mockFetch([{ body: { results: [{ id: 1396, name: "Breaking Bad", vote_average: 9.4 }] } }]);
    const notas = await new TmdbAdapter().coletar({ tipo: "SERIE", titulo: "Breaking Bad" });
    expect(notas[0].url).toBe("https://www.themoviedb.org/tv/1396");
  });

  it("fica inativo sem chave", () => {
    expect(new TmdbAdapter().ativo()).toBe(false);
  });
});

describe("IgdbAdapter — OAuth Twitch + Apicalypse (aggregated_rating/rating)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("TWITCH_CLIENT_ID", "cid");
    vi.stubEnv("TWITCH_CLIENT_SECRET", "secret");
  });

  it("fonte igdb usa aggregated_rating (crítica)", async () => {
    mockFetch([
      { body: { access_token: "tok", expires_in: 3600 } },
      {
        body: [
          {
            name: "The Legend of Zelda: Breath of the Wild",
            slug: "zelda-botw",
            aggregated_rating: 97,
          },
        ],
      },
    ]);
    const { IgdbAdapter } = await import("../src/modules/media-score/adapters/igdb.adapter.js");
    const notas = await new IgdbAdapter("igdb").coletar({ tipo: "GAME", titulo: "Zelda BotW" });
    expect(notas[0].fonte).toBe("igdb");
    expect(notas[0].rating).toBe(97);
    expect(notas[0].url).toBe("https://www.igdb.com/games/zelda-botw");
  });

  it("fonte igdb_publico usa rating (público)", async () => {
    mockFetch([
      { body: { access_token: "tok", expires_in: 3600 } },
      { body: [{ name: "Zelda", slug: "zelda", rating: 92 }] },
    ]);
    const { IgdbAdapter } = await import("../src/modules/media-score/adapters/igdb.adapter.js");
    const notas = await new IgdbAdapter("igdb_publico").coletar({ tipo: "GAME", titulo: "Zelda" });
    expect(notas[0].fonte).toBe("igdb_publico");
    expect(notas[0].rating).toBe(92);
  });

  it("inativo sem credenciais Twitch", async () => {
    vi.stubEnv("TWITCH_CLIENT_ID", "");
    vi.stubEnv("TWITCH_CLIENT_SECRET", "");
    const { IgdbAdapter } = await import("../src/modules/media-score/adapters/igdb.adapter.js");
    expect(new IgdbAdapter("igdb").ativo()).toBe(false);
    expect(new IgdbAdapter("igdb_publico").ativo()).toBe(false);
  });
});

describe("RawgAdapter — busca por nome com apóstrofo (rating 0-5)", () => {
  it("casa nome compacto e retorna rating", async () => {
    vi.stubEnv("RAWG_API_KEY", "teste");
    mockFetch([
      {
        body: {
          results: [
            { name: "Other Game", slug: "other", rating: 3.2 },
            { name: "Baldur's Gate 3", slug: "baldurs-gate-3", rating: 4.5 },
          ],
        },
      },
    ]);
    const notas = await new RawgAdapter().coletar({ tipo: "GAME", titulo: "Baldurs Gate 3" });
    expect(notas).toHaveLength(1);
    expect(notas[0].rating).toBe(4.5);
    expect(notas[0].url).toBe("https://rawg.io/games/baldurs-gate-3");
  });

  it("fica inativo sem chave", () => {
    expect(new RawgAdapter().ativo()).toBe(false);
  });
});
