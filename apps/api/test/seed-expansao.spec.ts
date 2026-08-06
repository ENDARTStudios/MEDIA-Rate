import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchTopItems, TMDB_ITEMS_POR_TIPO, TMDB_LISTAS, TMDB_MAX_PAGES } from "../prisma/seed-tmdb.js";
import { GAMES_CURADOS } from "../prisma/seed-games.js";

function tmdbItem(id: number, titulo: string, votos: number) {
  return { id, title: titulo, original_title: titulo, overview: "sinopse", release_date: "2020-01-01", poster_path: "/p.jpg", vote_average: 8.5, vote_count: votos };
}

describe("T180 — seed-expansao (HTTP mockado)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const u = new URL(String(url));
        const lista = u.pathname.includes("top_rated") ? "top_rated" : "popular";
        const page = Number(u.searchParams.get("page") ?? "1");
        const results =
          page === 1
            ? [tmdbItem(1, "Titulo A", 100), tmdbItem(2, "Titulo B", 90)]
            : [tmdbItem(3, "Titulo C", 80)];
        return { ok: true, json: async () => ({ results, total_pages: 2 }) } as Response;
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("busca top_rated E popular (múltiplas listas), dedup por id", async () => {
    const items = await fetchTopItems("movie", "chave", 3);
    const ids = items.map((i) => i.id);
    expect(ids).toEqual([1, 2, 3]);
    expect(new Set(ids).size).toBe(3);
  });

  it("não duplica quando a mesma obra aparece nas duas listas", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ results: [tmdbItem(7, "Repetido", 50)], total_pages: 1 }) }) as Response),
    );
    const items = await fetchTopItems("movie", "chave", 5);
    expect(items.filter((i) => i.id === 7).length).toBe(1);
  });

  it("respeita alvo, listas e máximo de páginas da config T180", () => {
    expect(TMDB_ITEMS_POR_TIPO).toBe(225);
    expect(TMDB_LISTAS).toContain("top_rated");
    expect(TMDB_LISTAS).toContain("popular");
    expect(TMDB_MAX_PAGES).toBe(12);
  });

  it("dataset de games tem ≥50 entradas com fontes canônicas do engine", () => {
    expect(GAMES_CURADOS.length).toBeGreaterThanOrEqual(50);
    for (const g of GAMES_CURADOS) {
      const fontes = [g.igdb, g.igdbPublico, g.opencritic, g.steam].filter(Boolean);
      expect(fontes.length).toBeGreaterThanOrEqual(2);
      // Ratings nas escalas corretas (0-100).
      for (const f of fontes) {
        expect(f!.rating).toBeGreaterThanOrEqual(0);
        expect(f!.rating).toBeLessThanOrEqual(100);
      }
      expect(g.slug.length).toBeGreaterThan(3);
    }
  });

  it("ratings TMDB usam escala 0-10 (vote_average) e votos", async () => {
    const items = await fetchTopItems("movie", "chave", 1);
    expect(items[0].vote_average).toBeLessThanOrEqual(10);
    expect(items[0].vote_count).toBeGreaterThan(0);
  });
});
