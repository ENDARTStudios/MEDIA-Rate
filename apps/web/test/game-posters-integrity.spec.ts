import { describe, it, expect } from "vitest";
import { getCatalogSync, MOCK_MEDIA } from "@/lib/api";

// Domínios aceitos para posters de games. "upload.wikimedia.org" é exceção
// documentada: exclusivos de plataforma (ex: Zelda BOTW, Nintendo) não estão
// no Steam, e a capa oficial da Wikimedia é o melhor ativo estável.
// O host também está no remotePatterns do next.config (images).
const GAME_DOMAINS = [
  "steamcdn-a.akamaihd.net",
  "cdn.cloudflare.steamstatic.com",
  "upload.wikimedia.org",
];

describe("T141 — game poster structural integrity", () => {
  it("0 games with posterUrl null", () => {
    const games = MOCK_MEDIA.filter((m) => m.type === "game");
    const missing = games.filter((m) => !m.posterUrl);
    expect(
      missing,
      `${missing.length} games without poster: ${missing.map((m) => m.title).join(", ")}`,
    ).toEqual([]);
  });

  it("0 games with poster from movie domain (tmdb)", () => {
    const games = MOCK_MEDIA.filter((m) => m.type === "game");
    const tmdbGames = games.filter((m) => m.posterUrl && m.posterUrl.includes("image.tmdb.org"));
    expect(
      tmdbGames,
      `${tmdbGames.length} games with tmdb poster: ${tmdbGames.map((m) => m.title).join(", ")}`,
    ).toEqual([]);
  });

  it("game posters come from game domains (steam/wikimedia)", () => {
    const games = MOCK_MEDIA.filter((m) => m.type === "game");
    for (const g of games) {
      const url = g.posterUrl;
      if (url) {
        const ok = GAME_DOMAINS.some((d) => url.includes(d));
        expect(ok, `${g.title} poster ${url} is not from game domain`).toBe(true);
      }
    }
  });

  it("no duplicate posters within games", () => {
    const games = MOCK_MEDIA.filter((m) => m.type === "game");
    const urls = games.map((m) => m.posterUrl).filter(Boolean) as string[];
    const unique = new Set(urls);
    expect(unique.size, `duplicate posters: ${urls.length - unique.size} duplicates`).toBe(
      urls.length,
    );
  });

  it("filter type=game returns only type==='game'", () => {
    const result = getCatalogSync({ type: "game", limit: 100 });
    const nonGames = result.items.filter((m) => m.type !== "game");
    expect(nonGames, `${nonGames.length} non-games in game filter`).toEqual([]);
  });

  it("filter type=movie returns only type==='movie'", () => {
    const result = getCatalogSync({ type: "movie", limit: 100 });
    const nonMovies = result.items.filter((m) => m.type !== "movie");
    expect(nonMovies).toEqual([]);
  });

  it("filter type=series returns only type==='series'", () => {
    const result = getCatalogSync({ type: "series", limit: 100 });
    const nonSeries = result.items.filter((m) => m.type !== "series");
    expect(nonSeries).toEqual([]);
  });
});
