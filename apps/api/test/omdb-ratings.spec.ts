import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * T175 — crítica real via array Ratings do OMDb (sem scraping): RT "85%" e
 * Metacritic "77/100" viram NotaColetada na escala 0-100 (bucket crítica do
 * registry); fontes desconhecidas e valores vazios são ignorados.
 *
 * T-DADOS-10 — lookup EXATO por `i=<imdb_id>` quando o TMDB fornece o id;
 * fallback `t=<titulo>&y=<ano>` com validação de identidade. Nenhuma rede:
 * `fetchJson` é mockado.
 */

vi.mock("../src/modules/media-score/adapters/http.utils.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/modules/media-score/adapters/http.utils.js")>();
  return { ...actual, fetchJson: vi.fn() };
});

import { fetchJson } from "../src/modules/media-score/adapters/http.utils.js";
import {
  OmdbAdapter,
  mapearRatingsOmdb,
  sanitizarTituloOmdb,
} from "../src/modules/media-score/adapters/omdb.adapter.js";

const fetchMock = vi.mocked(fetchJson);

/** Resposta real medida em produção para "The Hours" (tt0274558). */
const THE_HOURS = {
  Title: "The Hours",
  imdbID: "tt0274558",
  imdbRating: "7.5",
  imdbVotes: "140,000",
  Response: "True",
  Ratings: [
    { Source: "Internet Movie Database", Value: "7.5/10" },
    { Source: "Rotten Tomatoes", Value: "79%" },
    { Source: "Metacritic", Value: "80/100" },
  ],
};

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

describe("OmdbAdapter.coletar (T-DADOS-10)", () => {
  const envOriginal = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OMDB_API_KEY = "omdb-test";
  });

  afterEach(() => {
    process.env = { ...envOriginal };
  });

  function paramsDaChamada(): URLSearchParams {
    const url = String(fetchMock.mock.calls[0][0]);
    return new URL(url).searchParams;
  }

  it("com id IMDb: usa i= exato e NÃO envia t=/y=", async () => {
    fetchMock.mockResolvedValue(THE_HOURS);
    const notas = await new OmdbAdapter().coletar({
      tipo: "FILME",
      titulo: "The Hours",
      ano: 2002,
      idsExternos: { omdb: "tt0274558" },
    });
    const params = paramsDaChamada();
    expect(params.get("i")).toBe("tt0274558");
    expect(params.get("t")).toBeNull();
    expect(params.get("y")).toBeNull();
    expect(params.get("tomatoes")).toBeNull();
    // The Hours: IMDb 7.5 + RT 79 + Metacritic 80 = 3 notas.
    expect(notas).toHaveLength(3);
    expect(notas[0]).toMatchObject({
      fonte: "omdb",
      rating: 7.5,
      votos: 140000,
      url: "https://www.imdb.com/title/tt0274558",
    });
    expect(notas[1]).toMatchObject({ fonte: "rottentomatoes", rating: 79 });
    expect(notas[2]).toMatchObject({ fonte: "metacritic", rating: 80 });
  });

  it("sem id: cai no fallback t= + y=", async () => {
    fetchMock.mockResolvedValue(THE_HOURS);
    await new OmdbAdapter().coletar({ tipo: "FILME", titulo: "The Hours", ano: 2002 });
    const params = paramsDaChamada();
    expect(params.get("t")).toBe("The Hours");
    expect(params.get("y")).toBe("2002");
    expect(params.get("i")).toBeNull();
  });

  it("id inválido (abc) cai no fallback textual", async () => {
    fetchMock.mockResolvedValue(THE_HOURS);
    await new OmdbAdapter().coletar({
      tipo: "FILME",
      titulo: "The Hours",
      idsExternos: { omdb: "abc" },
    });
    const params = paramsDaChamada();
    expect(params.get("i")).toBeNull();
    expect(params.get("t")).toBe("The Hours");
  });

  it("fallback sanitiza aspas do título", async () => {
    fetchMock.mockResolvedValue(THE_HOURS);
    await new OmdbAdapter().coletar({
      tipo: "FILME",
      titulo: '  The "Hours"  ',
    });
    expect(paramsDaChamada().get("t")).toBe("The Hours");
  });

  it("identidade: id exato devolvendo outro imdbID é descartado", async () => {
    fetchMock.mockResolvedValue({ ...THE_HOURS, imdbID: "tt0000001" });
    const notas = await new OmdbAdapter().coletar({
      tipo: "FILME",
      titulo: "The Hours",
      idsExternos: { omdb: "tt0274558" },
    });
    expect(notas).toEqual([]);
  });

  it('Response "False" por título inexistente → vazio (sem nota legítima)', async () => {
    fetchMock.mockResolvedValue({ Response: "False", Error: "Movie not found!" });
    const notas = await new OmdbAdapter().coletar({
      tipo: "FILME",
      titulo: "Inexistente",
      idsExternos: { omdb: "tt9999999" },
    });
    expect(notas).toEqual([]);
  });

  it('Response "False" por cota → LANÇA em vez de devolver []', async () => {
    fetchMock.mockResolvedValue({ Response: "False", Error: "Request limit reached!" });
    const promessa = new OmdbAdapter().coletar({
      tipo: "FILME",
      titulo: "The Hours",
      idsExternos: { omdb: "tt0274558" },
    });
    // Lançar (não resolver []) é o que preserva as notas no deleteMany.
    await expect(promessa).rejects.toThrow(/limite de requisições/i);
  });

  it("credencial inválida → LANÇA (não vira ausência de nota)", async () => {
    fetchMock.mockResolvedValue({
      Response: "False",
      Error: "Invalid API key provided!",
    });
    await expect(
      new OmdbAdapter().coletar({
        tipo: "FILME",
        titulo: "The Hours",
        idsExternos: { omdb: "tt0274558" },
      }),
    ).rejects.toThrow(/limite de requisições/i);
  });

  it("HTTP 401 sem JSON → LANÇA (defensivo)", async () => {
    fetchMock.mockRejectedValue(new Error("HTTP 401 em https://www.omdbapi.com/"));
    await expect(
      new OmdbAdapter().coletar({
        tipo: "FILME",
        titulo: "The Hours",
        idsExternos: { omdb: "tt0274558" },
      }),
    ).rejects.toThrow(/HTTP 401/);
  });

  it("sanitizarTituloOmdb remove aspas e normaliza espaços", () => {
    expect(sanitizarTituloOmdb("  A \"Vida\" é 'Bela'  ")).toBe("A Vida é Bela");
  });
});
