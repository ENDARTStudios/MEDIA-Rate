import { describe, it, expect, vi, beforeEach } from "vitest";

// T191: o http.utils valida o IP resolvido (anti-SSRF); nos testes o DNS é
// mockado para um IP público — nenhuma resolução real acontece.
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
}));

// T-DADOS-07: lookup do OpenLibrary por `GET /works/<id>/ratings.json`.
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

function urlsChamadas(): string[] {
  return vi.mocked(fetch).mock.calls.map((c) => String(c[0]));
}

async function carregarAdapter() {
  const { OpenLibraryAdapter } =
    await import("../src/modules/media-score/adapters/openlibrary.adapter.js");
  return OpenLibraryAdapter;
}

beforeEach(() => {
  vi.resetModules();
});

describe("OpenLibraryAdapter — T-DADOS-07 lookup por id do work", () => {
  it("id válido: consulta /works/<id>/ratings.json e NÃO usa search.json", async () => {
    mockFetch([{ body: { summary: { average: 4.2289, count: 83 } } }]);
    const OpenLibraryAdapter = await carregarAdapter();
    const notas = await new OpenLibraryAdapter().coletar({
      tipo: "LIVRO",
      titulo: "Duna",
      idsExternos: { openlibrary: "OL471932W" },
    });
    expect(urlsChamadas()).toEqual(["https://openlibrary.org/works/OL471932W/ratings.json"]);
    expect(notas).toHaveLength(1);
    expect(notas[0]).toMatchObject({
      fonte: "openlibrary",
      rating: 4.2289,
      votos: 83,
      url: "https://openlibrary.org/works/OL471932W",
    });
  });

  it.each([0, -1, undefined])("summary.average %s → []", async (average) => {
    mockFetch([
      {
        body: {
          summary: average === undefined ? { count: 10 } : { average, count: 10 },
        },
      },
    ]);
    const OpenLibraryAdapter = await carregarAdapter();
    const notas = await new OpenLibraryAdapter().coletar({
      tipo: "LIVRO",
      titulo: "Duna",
      idsExternos: { openlibrary: "OL471932W" },
    });
    expect(notas).toEqual([]);
  });

  it("fallback com key diferente do id devolve [] (nota de outro livro)", async () => {
    mockFetch([
      {
        body: {
          docs: [
            {
              key: "/works/OL999999W",
              title: "Outro livro",
              title_suggest: "Outro livro",
              ratings_average: 4.8,
              ratings_count: 120,
            },
          ],
        },
      },
    ]);
    const OpenLibraryAdapter = await carregarAdapter();
    const notas = await new OpenLibraryAdapter().coletar({
      tipo: "LIVRO",
      titulo: "Duna",
      // Formato não utilizável no caminho por id → cai no fallback textual.
      idsExternos: { openlibrary: "OL471932X" },
    });
    expect(urlsChamadas()).toEqual([
      "https://openlibrary.org/search.json?q=Duna&fields=key,title,title_suggest,ratings_average,ratings_count&limit=1",
    ]);
    expect(notas).toEqual([]);
  });

  it("fallback com key igual ao id (caixa normalizada) devolve a nota", async () => {
    mockFetch([
      {
        body: {
          docs: [
            {
              key: "/works/OL471932W",
              title: "Duna",
              title_suggest: "Duna",
              ratings_average: 4.3,
              ratings_count: 448,
            },
          ],
        },
      },
    ]);
    const OpenLibraryAdapter = await carregarAdapter();
    const notas = await new OpenLibraryAdapter().coletar({
      tipo: "LIVRO",
      titulo: "Duna",
      // Minúsculo não casa o regex do caminho por id → fallback validado por key.
      idsExternos: { openlibrary: "ol471932w" },
    });
    expect(notas).toHaveLength(1);
    expect(notas[0].rating).toBe(4.3);
  });

  it("sem id: título precisa casar com title/title_suggest (senão descarta)", async () => {
    mockFetch([
      {
        body: {
          docs: [
            {
              key: "/works/OL1W",
              title: "Sisterhood of Dune",
              title_suggest: "Sisterhood of Dune",
              ratings_average: 3.8,
              ratings_count: 9,
            },
          ],
        },
      },
    ]);
    const OpenLibraryAdapter = await carregarAdapter();
    const notas = await new OpenLibraryAdapter().coletar({ tipo: "LIVRO", titulo: "Duna" });
    expect(notas).toEqual([]);
  });

  it("título com aspas não quebra a URL e ainda valida a identidade", async () => {
    mockFetch([
      {
        body: {
          docs: [
            {
              key: "/works/OL2W",
              title: 'Duna "Messiah"',
              title_suggest: 'Duna "Messiah"',
              ratings_average: 4.1,
              ratings_count: 20,
            },
          ],
        },
      },
    ]);
    const OpenLibraryAdapter = await carregarAdapter();
    const notas = await new OpenLibraryAdapter().coletar({
      tipo: "LIVRO",
      titulo: 'Duna "Messiah"',
    });
    const url = urlsChamadas()[0];
    expect(url).not.toContain('"');
    expect(decodeURIComponent(url)).toContain("q=Duna Messiah&");
    expect(notas).toHaveLength(1);
  });

  it("escala 0–5 preservada: estatisticas('0-5') em media_fonte/desvio_fonte", async () => {
    mockFetch([{ body: { summary: { average: 4.2, count: 83 } } }]);
    const OpenLibraryAdapter = await carregarAdapter();
    const [nota] = await new OpenLibraryAdapter().coletar({
      tipo: "LIVRO",
      titulo: "Duna",
      idsExternos: { openlibrary: "OL471932W" },
    });
    expect(nota).toMatchObject({
      rating: 4.2,
      media_fonte: 3.5,
      desvio_fonte: 0.6,
    });
  });
});
