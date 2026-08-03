import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TmdbAdapter } from "../src/modules/media-score/adapters/tmdb.adapter.js";
import { OpenCriticAdapter } from "../src/modules/media-score/adapters/opencritic.adapter.js";

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

  it("token OAuth via POST form-encoded (não query string — Twitch 404)", async () => {
    mockFetch([
      { body: { access_token: "tok", expires_in: 3600 } },
      { body: [{ name: "Zelda", slug: "zelda", aggregated_rating: 90 }] },
    ]);
    const { IgdbAdapter } = await import("../src/modules/media-score/adapters/igdb.adapter.js");
    await new IgdbAdapter("igdb").coletar({ tipo: "GAME", titulo: "Zelda" });
    const chamadas = vi.mocked(fetch).mock.calls;
    const [url, init] = chamadas[0];
    expect(String(url)).toBe("https://id.twitch.tv/oauth2/token");
    expect(init?.method).toBe("POST");
    expect(init?.body).toContain("grant_type=client_credentials");
    expect((init?.headers as Record<string, string>)["content-type"]).toBe(
      "application/x-www-form-urlencoded",
    );
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

describe("OpenCriticAdapter — busca por critérios com apóstrofo (medianScore 0-100)", () => {
  it("casa nome compacto e retorna medianScore do detalhe", async () => {
    vi.stubEnv("OPENCRITIC_API_KEY", "teste");
    mockFetch([
      {
        body: [
          { id: 9136, name: "Baldur's Gate 3", dist: 0.277 },
          { id: 11384, name: "Baldur's Gate: Dark Alliance", dist: 0.65 },
        ],
      },
      {
        body: {
          id: 9136,
          name: "Baldur's Gate 3",
          medianScore: 91,
          url: "https://opencritic.com/game/9136/baldurs-gate-3",
        },
      },
    ]);
    const notas = await new OpenCriticAdapter().coletar({
      tipo: "GAME",
      titulo: "Baldurs Gate 3",
    });
    expect(notas).toHaveLength(1);
    expect(notas[0].fonte).toBe("opencritic");
    expect(notas[0].rating).toBe(91);
    expect(notas[0].url).toBe("https://opencritic.com/game/9136/baldurs-gate-3");
    const [buscaUrl, detalheUrl] = vi.mocked(fetch).mock.calls.map(([u]) => String(u));
    expect(buscaUrl).toContain("/game/search?criteria=");
    expect(detalheUrl).toContain("/game/9136");
  });

  it("fica inativo sem chave", () => {
    expect(new OpenCriticAdapter().ativo()).toBe(false);
  });
});
