import { describe, it, expect, vi } from "vitest";
import { TraktAdapter } from "../src/modules/media-score/adapters/trakt.adapter.js";
import { ComicVineAdapter } from "../src/modules/media-score/adapters/comicvine.adapter.js";

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

describe("TraktAdapter — regressão CRIT (rating aninhado em movie/show)", () => {
  it("extrai rating de movie na resposta de busca", async () => {
    vi.stubEnv("TRAKT_CLIENT_ID", "teste");
    mockFetch([
      {
        body: [
          {
            type: "movie",
            movie: { ids: { slug: "the-godfather-1972" }, rating: 8.900876998901367 },
          },
        ],
      },
    ]);
    const notas = await new TraktAdapter().coletar({
      tipo: "FILME",
      titulo: "The Godfather",
      ano: 1972,
    });
    expect(notas).toHaveLength(1);
    expect(notas[0].rating).toBeCloseTo(8.900876998901367, 5);
    expect(notas[0].url).toBe("https://trakt.tv/movie/the-godfather-1972");
  });

  it("retorna [] quando rating faltante (não quebra)", async () => {
    vi.stubEnv("TRAKT_CLIENT_ID", "teste");
    mockFetch([{ body: [{ type: "movie", movie: { ids: { slug: "x" } } }] }]);
    const notas = await new TraktAdapter().coletar({ tipo: "FILME", titulo: "Sem nota" });
    expect(notas).toEqual([]);
  });
});

describe("ComicVineAdapter — regressão: campo count_of_issues (não count_of_issue_appearances)", () => {
  it("usa count_of_issues do detalhe do volume", async () => {
    vi.stubEnv("COMICVINE_API_KEY", "teste");
    mockFetch([
      {
        body: {
          results: [{ id: 3622, name: "Watchmen", site_detail_url: "https://comicvine/..." }],
        },
      },
      { body: { results: { count_of_issues: 12 } } },
    ]);
    const notas = await new ComicVineAdapter().coletar({
      tipo: "HQ",
      titulo: "Watchmen",
      ano: 1986,
    });
    expect(notas).toHaveLength(1);
    expect(notas[0].fonte).toBe("comicvine");
    expect(notas[0].rating).toBe(3.5);
  });

  it("volta vazio quando volume não é encontrado", async () => {
    vi.stubEnv("COMICVINE_API_KEY", "teste");
    mockFetch([{ body: { results: [] } }]);
    const notas = await new ComicVineAdapter().coletar({ tipo: "HQ", titulo: "Inexistente" });
    expect(notas).toEqual([]);
  });
});
