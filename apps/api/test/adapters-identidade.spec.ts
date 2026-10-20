import { describe, it, expect, vi } from "vitest";
import {
  SteamAdapter,
  normalizarNomeSteam,
} from "../src/modules/media-score/adapters/steam.adapter.js";
import { KitsuAdapter } from "../src/modules/media-score/adapters/kitsu.adapter.js";
import { TmdbAdapter } from "../src/modules/media-score/adapters/tmdb.adapter.js";
import {
  TraktAdapter,
  escolherItemTrakt,
} from "../src/modules/media-score/adapters/trakt.adapter.js";
import {
  TvmazeAdapter,
  escolherShowTvmaze,
} from "../src/modules/media-score/adapters/tvmaze.adapter.js";
import {
  RottenTomatoesAdapter,
  extrairAnoRt,
  extrairNotaRt,
} from "../src/modules/media-score/adapters/rottentomatoes.adapter.js";

// T191: o http.utils valida o IP resolvido (anti-SSRF); DNS mockado.
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
}));

function mockFetch(respostas: { ok?: boolean; status?: number; body: unknown }[]) {
  let indice = 0;
  const espiao = vi.fn(async () => {
    const r = respostas[Math.min(indice++, respostas.length - 1)];
    return {
      ok: r.ok ?? true,
      status: r.status ?? 200,
      headers: new Headers({ "content-type": "text/html" }),
      async json() {
        return r.body;
      },
      async text() {
        return typeof r.body === "string" ? r.body : JSON.stringify(r.body);
      },
    } as Response;
  });
  vi.stubGlobal("fetch", espiao);
  return espiao;
}

/** Página RT mínima com os blocos que o adaptador lê (JSON escapado). */
function paginaRt(opcoes: {
  ano?: number;
  titulo: string;
  critica?: number;
  publico?: number;
}): string {
  const blocoCritica =
    opcoes.critica == null
      ? ""
      : `,\\"criticsScore\\":{\\"reviewCount\\":211,\\"score\\":\\"${opcoes.critica}\\",\\"title\\":\\"Tomatometer\\"}`;
  const blocoPublico =
    opcoes.publico == null
      ? ""
      : `\\"audienceScore\\":{\\"reviewCount\\":2500,\\"score\\":\\"${opcoes.publico}\\",\\"title\\":\\"Popcornmeter\\"}`;
  const releaseYear = opcoes.ano == null ? "" : `\\"releaseYear\\":\\"${opcoes.ano}\\",`;
  return `<html><head><title>${opcoes.titulo} | Rotten Tomatoes</title></head><body><script>
  window.__DATA__ = {${blocoPublico}${blocoCritica}};
  window.__INFO__ = {${releaseYear}\\"title\\":\\"${opcoes.titulo}\\"};
  </script></body></html>`;
}

describe("SteamAdapter — identidade do appid (T-DADOS-41)", () => {
  it("não aceita o primeiro resultado quando o nome é outro produto", async () => {
    const fetchMock = mockFetch([
      { body: { total: 1, items: [{ id: 1127420, name: "Sim Racing Telemetry - F1 2019" }] } },
    ]);
    const notas = await new SteamAdapter().coletar({ tipo: "GAME", titulo: "F1 2019" });
    expect(notas).toEqual([]);
    // só a busca: não consulta reviews de um appid que não é o jogo
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("aceita nome igual (ignorando ™ e acento) e devolve ratio com URL", async () => {
    mockFetch([
      { body: { total: 1, items: [{ id: 367520, name: "Hollow Knight" }] } },
      {
        body: { query_summary: { total_positive: 95, total_negative: 5 } },
      },
    ]);
    const notas = await new SteamAdapter().coletar({ tipo: "GAME", titulo: "Hollow Knight" });
    expect(notas).toHaveLength(1);
    expect(notas[0].rating).toBeCloseTo(0.95, 5);
    expect(notas[0].votos).toBe(100);
    expect(notas[0].url).toBe("https://store.steampowered.com/app/367520");
  });

  it("normaliza ™/®/© e pontuação", () => {
    expect(normalizarNomeSteam("DARK SOULS™ III")).toBe("dark souls iii");
    expect(normalizarNomeSteam("Pokémon™: Let's Go")).toBe("pokemon let s go");
  });
});

describe("KitsuAdapter — URL de procedência (T-DADOS-41)", () => {
  it("usa o slug da obra na URL pública", async () => {
    mockFetch([
      {
        body: {
          data: [
            {
              id: "8",
              type: "manga",
              attributes: { slug: "berserk", averageRating: "82.3", ratingCount: 5000 },
            },
          ],
        },
      },
    ]);
    const notas = await new KitsuAdapter().coletar({ tipo: "MANGA", titulo: "Berserk" });
    expect(notas).toHaveLength(1);
    expect(notas[0].url).toBe("https://kitsu.io/manga/berserk");
    expect(notas[0].votos).toBe(5000);
  });

  it("cai para o id quando a API não manda slug", async () => {
    mockFetch([
      { body: { data: [{ id: "42", attributes: { averageRating: "70", ratingCount: 0 } }] } },
    ]);
    const notas = await new KitsuAdapter().coletar({ tipo: "MANGA", titulo: "Sem slug" });
    expect(notas[0].url).toBe("https://kitsu.io/manga/42");
    expect(notas[0].votos).toBeUndefined();
  });
});

describe("RottenTomatoesAdapter — métrica e identidade (T-DADOS-41)", () => {
  it("rejeita página de outra obra por releaseYear", async () => {
    mockFetch([{ body: paginaRt({ ano: 2017, titulo: "Escape Room", critica: 50, publico: 19 }) }]);
    const notas = await new RottenTomatoesAdapter().coletar({
      tipo: "FILME",
      titulo: "Escape Room",
      ano: 2019,
    });
    expect(notas).toEqual([]);
  });

  it("ao bater em homônimo de outro ano, tenta /m/<slug>_<ano>", async () => {
    mockFetch([
      { body: paginaRt({ ano: 2017, titulo: "Escape Room", publico: 19 }) },
      { body: paginaRt({ ano: 2019, titulo: "Escape Room (2019)", critica: 51, publico: 54 }) },
    ]);
    const notas = await new RottenTomatoesAdapter().coletar({
      tipo: "FILME",
      titulo: "Escape Room",
      ano: 2019,
    });
    expect(notas).toHaveLength(2);
    expect(notas[0].url).toBe("https://www.rottentomatoes.com/m/escape_room_2019");
  });

  it("separa Tomatometer (crítica) de Popcornmeter (público)", async () => {
    mockFetch([{ body: paginaRt({ ano: 2019, titulo: "Escape Room", critica: 51, publico: 54 }) }]);
    const notas = await new RottenTomatoesAdapter().coletar({
      tipo: "FILME",
      titulo: "Escape Room",
      ano: 2019,
    });
    expect(notas).toHaveLength(2);
    const critica = notas.find((n) => n.fonte === "rottentomatoes");
    const publico = notas.find((n) => n.fonte === "rottentomatoes_audience");
    expect(critica?.rating).toBe(51);
    expect(critica?.votos).toBe(211);
    expect(publico?.rating).toBe(54);
    expect(publico?.votos).toBe(2500);
    expect(publico?.url).toBe("https://www.rottentomatoes.com/m/escape_room");
  });

  it("sem releaseYear, aceita quando o título original confere (título internacional)", async () => {
    mockFetch([{ body: paginaRt({ titulo: "Spider-Man: Far From Home", critica: 91 }) }]);
    const notas = await new RottenTomatoesAdapter().coletar({
      tipo: "FILME",
      titulo: "Homem-Aranha: Longe de Casa",
      tituloOriginal: "Spider-Man: Far From Home",
      ano: 2019,
    });
    expect(notas).toHaveLength(1);
    expect(notas[0].fonte).toBe("rottentomatoes");
    expect(notas[0].rating).toBe(91);
  });

  it("sem releaseYear e sem título que confira, não atribui", async () => {
    mockFetch([{ body: paginaRt({ titulo: "Fantastic Invasion of Planet Earth", critica: 20 }) }]);
    const notas = await new RottenTomatoesAdapter().coletar({
      tipo: "FILME",
      titulo: "Bubble",
      ano: 2022,
    });
    expect(notas).toEqual([]);
  });

  it("leitura dos blocos: nota 0 é válida (Tomatometer real de 0%)", () => {
    const html = paginaRt({ ano: 2020, titulo: "Filme", critica: 0, publico: 31 });
    expect(extrairAnoRt(html)).toBe(2020);
    expect(extrairNotaRt(html, "criticsScore")).toEqual({ score: 0, votos: 211 });
    expect(extrairNotaRt(html, "audienceScore")).toEqual({ score: 31, votos: 2500 });
  });
});

describe("TmdbAdapter — id exato no lugar da busca (D3f/T-DADOS-42)", () => {
  it("com id numérico, consulta /3/movie/{id} em 1 request", async () => {
    vi.stubEnv("TMDB_API_KEY", "teste");
    const fetchMock = mockFetch([
      { body: { id: 238, title: "O Poderoso Chefão", vote_average: 8.7, vote_count: 20000 } },
    ]);
    const notas = await new TmdbAdapter().coletar({
      tipo: "FILME",
      titulo: "O Poderoso Chefão",
      ano: 1972,
      idsExternos: { tmdb: "238" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("/3/movie/238");
    expect(url).not.toContain("/search/");
    expect(notas[0].rating).toBe(8.7);
    expect(notas[0].votos).toBe(20000);
    expect(notas[0].url).toBe("https://www.themoviedb.org/movie/238");
  });

  it("série usa /3/tv/{id} (fonte tmdb_tv)", async () => {
    vi.stubEnv("TMDB_API_KEY", "teste");
    mockFetch([{ body: { id: 1396, name: "Breaking Bad", vote_average: 8.9, vote_count: 14000 } }]);
    const notas = await new TmdbAdapter().coletar({
      tipo: "SERIE",
      titulo: "Breaking Bad",
      idsExternos: { tmdb_tv: "1396" },
    });
    expect(notas[0].url).toBe("https://www.themoviedb.org/tv/1396");
  });

  it("sem id, mantém a busca por título (fallback)", async () => {
    vi.stubEnv("TMDB_API_KEY", "teste");
    const fetchMock = mockFetch([
      { body: { results: [{ id: 5, title: "X", vote_average: 7.1, vote_count: 30 }] } },
    ]);
    const notas = await new TmdbAdapter().coletar({ tipo: "FILME", titulo: "X", ano: 2001 });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("/search/movie");
    expect(notas[0].rating).toBe(7.1);
  });

  describe("TraktAdapter — identidade na busca (T-DADOS-45)", () => {
    const itens = [
      {
        type: "movie",
        movie: {
          title: "The Proposal",
          year: 2009,
          ids: { slug: "the-proposal-2009", tmdb: 18240 },
          rating: 6.8,
        },
      },
      {
        type: "movie",
        movie: {
          title: "A Proposta",
          year: 2005,
          ids: { slug: "a-proposta-2005", tmdb: 99999 },
          rating: 7.1,
        },
      },
    ];

    it("pula o primeiro resultado parecido e pega o id do TMDB correto", () => {
      const alvo = escolherItemTrakt(itens, {
        tipo: "FILME",
        titulo: "A Proposta",
        ano: 2005,
        idsExternos: { tmdb: "99999" },
      });
      expect(alvo?.ids?.slug).toBe("a-proposta-2005");
    });

    it("sem nenhum id do TMDB que confira, não atribui", () => {
      const alvo = escolherItemTrakt(itens, {
        tipo: "FILME",
        titulo: "A Proposta",
        ano: 2005,
        idsExternos: { tmdb: "123" },
      });
      expect(alvo).toBeNull();
    });

    it("sem ids externos, usa o ano ±1 como identidade", () => {
      const alvo = escolherItemTrakt(itens, { tipo: "FILME", titulo: "A Proposta", ano: 2005 });
      expect(alvo?.ids?.slug).toBe("a-proposta-2005");
    });

    it("coletar devolve a nota do item conferido (não do primeiro)", async () => {
      vi.stubEnv("TRAKT_CLIENT_ID", "teste");
      mockFetch([{ body: itens }]);
      const notas = await new TraktAdapter().coletar({
        tipo: "FILME",
        titulo: "A Proposta",
        ano: 2005,
        idsExternos: { tmdb: "99999" },
      });
      expect(notas).toHaveLength(1);
      expect(notas[0].url).toBe("https://trakt.tv/movie/a-proposta-2005");
    });

    it("Pânico 3: resultado errado sem o id do TMDB vira lacuna honesta", async () => {
      vi.stubEnv("TRAKT_CLIENT_ID", "teste");
      mockFetch([
        {
          body: [
            {
              type: "movie",
              movie: {
                title: "Three O'Clock High",
                year: 1987,
                ids: { slug: "three-o-clock-high-1987", tmdb: 101 },
                rating: 7.2,
              },
            },
          ],
        },
      ]);
      const notas = await new TraktAdapter().coletar({
        tipo: "FILME",
        titulo: "Pânico 3",
        ano: 2000,
        idsExternos: { tmdb: "4234" },
      });
      expect(notas).toEqual([]);
    });
  });

  describe("TvmazeAdapter — identidade por ano de estreia (T-DADOS-46)", () => {
    const resultados = [
      {
        show: {
          name: "Vida",
          premiered: "2018-05-02",
          url: "https://www.tvmaze.com/shows/1/vida",
          rating: { average: 7.1 },
        },
      },
      {
        show: {
          name: "Vida",
          premiered: "2009-05-10",
          url: "https://www.tvmaze.com/shows/2/vida",
          rating: { average: 7.6 },
        },
      },
    ];

    it("pula o homônimo do ano errado e pega a série certa", () => {
      const show = escolherShowTvmaze(resultados, { tipo: "SERIE", titulo: "Vida", ano: 2009 });
      expect(show?.url).toBe("https://www.tvmaze.com/shows/2/vida");
    });

    it("sem série com o ano do catálogo, não atribui", () => {
      const show = escolherShowTvmaze(resultados, { tipo: "SERIE", titulo: "Vida", ano: 1999 });
      expect(show).toBeNull();
    });

    it("sem ano no catálogo, mantém o primeiro com nota", () => {
      const show = escolherShowTvmaze(resultados, { tipo: "SERIE", titulo: "Vida" });
      expect(show?.url).toBe("https://www.tvmaze.com/shows/1/vida");
    });

    it("coletar grava o show.url (página pública), não o endpoint de busca", async () => {
      mockFetch([{ body: resultados }]);
      const notas = await new TvmazeAdapter().coletar({ tipo: "SERIE", titulo: "Vida", ano: 2009 });
      expect(notas).toHaveLength(1);
      expect(notas[0].rating).toBe(7.6);
      expect(notas[0].url).toBe("https://www.tvmaze.com/shows/2/vida");
    });
  });
});
