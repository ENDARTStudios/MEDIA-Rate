import { describe, it, expect, vi } from "vitest";
import { AniListAdapter } from "../src/modules/media-score/adapters/anilist.adapter.js";
import { GoodreadsAdapter } from "../src/modules/media-score/adapters/goodreads.adapter.js";

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
      headers: new Headers({ "content-type": "application/json" }),
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

describe("AniListAdapter — fonte que não respondeu ≠ sem nota (D-cota/T-DADOS-43)", () => {
  it("erro GraphQL no corpo vira exceção (não [] que apagaria a linha)", async () => {
    mockFetch([
      {
        body: {
          errors: [{ message: 'Cannot query field "statistics" on type "Media".' }],
          data: null,
        },
      },
    ]);
    await expect(
      new AniListAdapter().coletar({ tipo: "MANGA", titulo: "Berserk" }),
    ).rejects.toThrow(/AniList/);
  });

  it("resposta válida usa stats.scoreDistribution para os votos", async () => {
    mockFetch([
      {
        body: {
          data: {
            Media: {
              averageScore: 92,
              siteUrl: "https://anilist.co/manga/30002",
              stats: { scoreDistribution: [{ amount: 10 }, { amount: 5 }] },
            },
          },
        },
      },
    ]);
    const notas = await new AniListAdapter().coletar({ tipo: "MANGA", titulo: "Berserk" });
    expect(notas).toHaveLength(1);
    expect(notas[0].rating).toBe(92);
    expect(notas[0].votos).toBe(15);
    expect(notas[0].url).toBe("https://anilist.co/manga/30002");
  });

  it("sem nota (obra sem averageScore) segue como lacuna honesta", async () => {
    mockFetch([{ body: { data: { Media: { siteUrl: "https://anilist.co/manga/1" } } } }]);
    const notas = await new AniListAdapter().coletar({ tipo: "MANGA", titulo: "Sem nota" });
    expect(notas).toEqual([]);
  });
});

describe("GoodreadsAdapter — bloqueio não apaga a nota existente (D-cota/T-DADOS-43)", () => {
  it("403 do autocomplete propaga em vez de virar []", async () => {
    mockFetch([
      { body: { entries: [{ isbn_13: ["9780000000000"] }] } },
      { ok: false, status: 403, body: { error: "blocked" } },
    ]);
    const adapter = new GoodreadsAdapter(0);
    await expect(
      adapter.coletar({ tipo: "LIVRO", titulo: "Livro", idsExternos: { openlibrary: "OL123W" } }),
    ).rejects.toThrow();
  });

  it("página sem JSON-LD continua sendo ausência honesta ([])", async () => {
    mockFetch([
      { body: { entries: [{ isbn_13: ["9780000000001"] }] } },
      { body: [{ bookId: "123", title: "Livro" }] },
      { body: "<html><body>sem dados</body></html>" },
    ]);
    const adapter = new GoodreadsAdapter(0);
    const notas = await adapter.coletar({
      tipo: "LIVRO",
      titulo: "Livro",
      idsExternos: { openlibrary: "OL123W" },
    });
    expect(notas).toEqual([]);
  });
});
