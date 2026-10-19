import { describe, it, expect, vi } from "vitest";
import { SteamAdapter, normalizarNomeSteam } from "../src/modules/media-score/adapters/steam.adapter.js";
import { KitsuAdapter } from "../src/modules/media-score/adapters/kitsu.adapter.js";
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

describe("SteamAdapter — identidade do appid (T-DADOS-27)", () => {
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

describe("KitsuAdapter — URL de procedência (T-DADOS-27)", () => {
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

describe("RottenTomatoesAdapter — métrica e identidade (T-DADOS-27)", () => {
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
    mockFetch([
      { body: paginaRt({ ano: 2019, titulo: "Escape Room", critica: 51, publico: 54 }) },
    ]);
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
