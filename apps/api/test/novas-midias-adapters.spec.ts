import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ConsultaMedia } from "../src/modules/media-score/adapters/fonte-adapter.interface.js";
import { JikanAdapter } from "../src/modules/media-score/adapters/jikan.adapter.js";
import { AniListAdapter } from "../src/modules/media-score/adapters/anilist.adapter.js";
import { KitsuAdapter } from "../src/modules/media-score/adapters/kitsu.adapter.js";
import { OpenLibraryAdapter } from "../src/modules/media-score/adapters/openlibrary.adapter.js";
import { GoogleBooksAdapter } from "../src/modules/media-score/adapters/googlebooks.adapter.js";
import { ComicVineAdapter } from "../src/modules/media-score/adapters/comicvine.adapter.js";

function consulta(titulo: string, tipo = "ANIME"): ConsultaMedia {
  return { titulo, tipo, ano: 2020 } as ConsultaMedia;
}

describe("T181 — adaptadores de novas mídias (HTTP mockado)", () => {
  beforeEach(() => {
    vi.mock("node:https", () => ({}));
    vi.mock("node:http", () => ({}));
    vi.mock("https", () => ({}));
    vi.mock("http", () => ({}));
    vi.mock("../src/modules/media-score/adapters/http.utils.js", () => ({
      fetchJson: vi.fn(),
      postJson: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("jikan: rating 0–10 (público) direto da API", async () => {
    const { fetchJson } = await import("../src/modules/media-score/adapters/http.utils.js");
    vi.mocked(fetchJson).mockResolvedValue({
      data: [{ score: 9.05, scored_by: 380000, url: "https://myanimelist.net/anime/1" }],
    });
    const adapter = new JikanAdapter();
    const notas = await adapter.coletar(consulta("Berserk"));
    expect(notas[0].fonte).toBe("jikan");
    expect(notas[0].rating).toBe(9.05);
    expect(notas[0].votos).toBe(380000);
  });

  it("anilist: averageScore 0–100 ÷10 na exibição (escala 0-100 registrada)", async () => {
    const { postJson } = await import("../src/modules/media-score/adapters/http.utils.js");
    vi.mocked(postJson).mockResolvedValue({
      data: {
        Media: {
          averageScore: 89,
          siteUrl: "https://anilist.co/anime/1",
          statistics: { scoreDistribution: [{ amount: 160000 }, { amount: 100000 }] },
        },
      },
    });
    const adapter = new AniListAdapter();
    const notas = await adapter.coletar(consulta("Berserk"));
    expect(notas[0].fonte).toBe("anilist");
    expect(notas[0].rating).toBe(89);
    expect(notas[0].votos).toBe(260000);
  });

  it("anilist: votos indefinido quando scoreDistribution ausente", async () => {
    const { postJson } = await import("../src/modules/media-score/adapters/http.utils.js");
    vi.mocked(postJson).mockResolvedValue({
      data: { Media: { averageScore: 89, siteUrl: "https://anilist.co/anime/1" } },
    });
    const adapter = new AniListAdapter();
    const notas = await adapter.coletar(consulta("Berserk"));
    expect(notas[0].rating).toBe(89);
    expect(notas[0].votos).toBeUndefined();
  });

  it("kitsu: averageRating 0–100 com ratingCount como votos", async () => {
    const { fetchJson } = await import("../src/modules/media-score/adapters/http.utils.js");
    vi.mocked(fetchJson).mockResolvedValue({
      data: [{ attributes: { averageRating: "82.3", ratingCount: 12800 } }],
    });
    const adapter = new KitsuAdapter();
    const notas = await adapter.coletar(consulta("Berserk"));
    expect(notas[0].fonte).toBe("kitsu");
    expect(notas[0].rating).toBe(82.3);
    expect(notas[0].votos).toBe(12800);
  });

  it("kitsu: votos indefinido quando ratingCount null", async () => {
    const { fetchJson } = await import("../src/modules/media-score/adapters/http.utils.js");
    vi.mocked(fetchJson).mockResolvedValue({
      data: [{ attributes: { averageRating: "82.3", ratingCount: null } }],
    });
    const adapter = new KitsuAdapter();
    const notas = await adapter.coletar(consulta("Berserk"));
    expect(notas[0].rating).toBe(82.3);
    expect(notas[0].votos).toBeUndefined();
  });

  it("jikan/anilist: ativos sem gate e atendem anime/mangá (tipos ANIME e MANGA)", () => {
    expect(new JikanAdapter().ativo()).toBe(true);
    expect(new AniListAdapter().ativo()).toBe(true);
    expect(new JikanAdapter().atendeTipo("ANIME")).toBe(true);
    expect(new AniListAdapter().atendeTipo("ANIME")).toBe(true);
    // D-233/T231: MANGA (quadrinho japonês) é categoria própria e mantém o
    // mesmo domínio de fontes (anime_manga) — jikan/anilist atendem.
    expect(new JikanAdapter().atendeTipo("MANGA")).toBe(true);
    expect(new AniListAdapter().atendeTipo("MANGA")).toBe(true);
    // HQ ocidental (comicvine/amazon) não é atendida por jikan/anilist.
    expect(new JikanAdapter().atendeTipo("HQ")).toBe(false);
  });

  it("openlibrary: rating 0–5 (público) ×2 na normalização pelo motor", async () => {
    const { fetchJson } = await import("../src/modules/media-score/adapters/http.utils.js");
    vi.mocked(fetchJson).mockResolvedValue({
      docs: [{ ratings_average: 4.6, ratings_count: 42000 }],
    });
    const adapter = new OpenLibraryAdapter();
    const notas = await adapter.coletar(consulta("Duna", "LIVRO"));
    expect(notas[0].fonte).toBe("openlibrary");
    expect(notas[0].rating).toBeLessThanOrEqual(5);
  });

  it("googlebooks: rating 0–5 (público)", async () => {
    const { fetchJson } = await import("../src/modules/media-score/adapters/http.utils.js");
    vi.mocked(fetchJson).mockResolvedValue({
      items: [{ volumeInfo: { averageRating: 4.7, ratingsCount: 9800 } }],
    });
    const adapter = new GoogleBooksAdapter();
    const notas = await adapter.coletar(consulta("Duna", "LIVRO"));
    expect(notas[0].fonte).toBe("googlebooks");
    expect(notas[0].rating).toBe(4.7);
  });

  it("comicvine: metadados públicos (rating 0–5)", async () => {
    const { fetchJson } = await import("../src/modules/media-score/adapters/http.utils.js");
    vi.mocked(fetchJson).mockResolvedValue({ results: [{ count_of_reviews: 0 }] });
    const adapter = new ComicVineAdapter();
    const notas = await adapter.coletar(consulta("Watchmen", "COMIC"));
    expect(Array.isArray(notas)).toBe(true);
  });
});
