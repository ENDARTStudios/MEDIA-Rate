import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * T-DADOS-31 — Goodreads usa ID NUMÉRICO (`/book/show/<id>`); montar a URL
 * com slug do título devolvia 404 em 100% dos casos. O id é resolvido pelo
 * `/book/auto_complete` com guarda de identidade (título + ano) e a nota vem
 * do JSON-LD `Book` da página. Nenhuma rede: HTTP é mockado.
 */

vi.mock("../src/modules/media-score/adapters/http.utils.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/modules/media-score/adapters/http.utils.js")>();
  return { ...actual, fetchJson: vi.fn(), fetchTexto: vi.fn() };
});

import { fetchJson, fetchTexto } from "../src/modules/media-score/adapters/http.utils.js";
import {
  GoodreadsAdapter,
  isbnsDasEdicoesOpenLibrary,
} from "../src/modules/media-score/adapters/goodreads.adapter.js";

const fetchJsonMock = vi.mocked(fetchJson);
const fetchTextoMock = vi.mocked(fetchTexto);

function paginaLivro(aggregateRating?: { ratingValue: number; ratingCount?: number }): string {
  const jsonld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Book",
    "name": "La Divina Commedia",
    ...(aggregateRating
      ? { aggregateRating: { "@type": "AggregateRating", ...aggregateRating } }
      : {}),
  });
  return `<!doctype html><html><head><script type="application/ld+json">${jsonld}</script></head><body>ok</body></html>`;
}

function consulta(titulo: string, ano?: number, idsExternos?: Record<string, string>) {
  return { tipo: "LIVRO", titulo, ...(ano != null ? { ano } : {}), idsExternos };
}

describe("T-DADOS-31 — Goodreads resolve bookId numérico e coleta JSON-LD", () => {
  beforeEach(() => {
    fetchJsonMock.mockReset();
    fetchTextoMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("escolhe o item com título igual (normalizado) e coleta rating/votos", async () => {
    fetchJsonMock.mockResolvedValue([
      { bookId: "75446884", title: "La Divina Commedia Annotated" },
      { bookId: "49762475", title: "LA DIVINA COMMEDIA" },
    ]);
    fetchTextoMock.mockResolvedValue(paginaLivro({ ratingValue: 4.23, ratingCount: 429 }));

    const notas = await new GoodreadsAdapter(0).coletar(consulta("La Divina Commédia", undefined));

    expect(fetchJsonMock).toHaveBeenCalledTimes(1);
    expect(String(fetchJsonMock.mock.calls[0]?.[0])).toContain(
      "/book/auto_complete?format=json&q=",
    );
    expect(fetchTextoMock).toHaveBeenCalledWith(
      "https://www.goodreads.com/book/show/49762475",
      expect.objectContaining({
        headers: expect.objectContaining({
          "user-agent": expect.stringContaining("Mozilla"),
        }),
      }),
    );
    expect(notas).toEqual([
      {
        fonte: "goodreads",
        rating: 4.23,
        media_fonte: 3.5,
        desvio_fonte: 0.6,
        votos: 429,
        url: "https://www.goodreads.com/book/show/49762475",
      },
    ]);
  });

  it("rejeita homônimo (título diferente) e retorna [] quando nada casa", async () => {
    fetchJsonMock.mockResolvedValue([
      { bookId: "1", title: "Duna (Dune Chronicles #1)" },
      { bookId: "2", title: "Duna: Edição Especial" },
    ]);

    const notas = await new GoodreadsAdapter(0).coletar(consulta("Duna"));

    expect(notas).toEqual([]);
    expect(fetchTextoMock).not.toHaveBeenCalled();
  });

  it("retorna [] para resposta de autocomplete que não é array", async () => {
    fetchJsonMock.mockResolvedValue({ erro: "shape inesperado" });

    const notas = await new GoodreadsAdapter(0).coletar(consulta("Duna"));

    expect(notas).toEqual([]);
    expect(fetchTextoMock).not.toHaveBeenCalled();
  });

  it("guarda de ano: rejeita ano distante, aceita ±2 e aceita item sem ano", async () => {
    fetchJsonMock.mockResolvedValue([
      { bookId: "10", title: "Duna", originalPublicationYear: 1965 },
    ]);
    expect(await new GoodreadsAdapter(0).coletar(consulta("Duna", 1980))).toEqual([]);
    expect(fetchTextoMock).not.toHaveBeenCalled();

    // Diferença de 2 anos (edição vs. publicação) é aceita.
    fetchJsonMock.mockResolvedValue([
      { bookId: "11", title: "Duna", originalPublicationYear: 1982 },
    ]);
    fetchTextoMock.mockResolvedValue(paginaLivro({ ratingValue: 4, ratingCount: 10 }));
    const aceito = await new GoodreadsAdapter(0).coletar(consulta("Duna", 1980));
    expect(aceito[0]?.url).toBe("https://www.goodreads.com/book/show/11");

    // Hoje o autocomplete NÃO expõe ano; sem ano no item, a identidade é o título.
    fetchJsonMock.mockResolvedValue([{ bookId: "12", title: "Duna" }]);
    fetchTextoMock.mockResolvedValue(paginaLivro({ ratingValue: 4.1, ratingCount: 20 }));
    const semAnoNoItem = await new GoodreadsAdapter(0).coletar(consulta("Duna", 1980));
    expect(semAnoNoItem[0]?.url).toBe("https://www.goodreads.com/book/show/12");
  });

  it("extrai ratingValue/ratingCount apenas do bloco JSON-LD @type Book", async () => {
    fetchJsonMock.mockResolvedValue([{ bookId: "15651", title: "Inferno" }]);
    // Primeiro bloco tem aggregateRating, mas NÃO é o livro — deve ser ignorado.
    fetchTextoMock.mockResolvedValue(
      `<html><head>
        <script type="application/ld+json">{"@type":"WebSite","aggregateRating":{"ratingValue":1}}</script>
        ${paginaLivro({ ratingValue: 4.03, ratingCount: 214084 })}
      </head></html>`,
    );

    const notas = await new GoodreadsAdapter(0).coletar(consulta("Inferno"));

    expect(notas).toHaveLength(1);
    expect(notas[0]?.rating).toBe(4.03);
    expect(notas[0]?.votos).toBe(214084);
  });

  it("página sem aggregateRating no livro retorna []", async () => {
    fetchJsonMock.mockResolvedValue([{ bookId: "999", title: "Sem nota" }]);
    fetchTextoMock.mockResolvedValue(paginaLivro());

    const notas = await new GoodreadsAdapter(0).coletar(consulta("Sem nota"));

    expect(notas).toEqual([]);
  });

  it("nunca monta /book/show/<slug>: id externo textual é ignorado", async () => {
    fetchJsonMock.mockResolvedValue([{ bookId: "49762475", title: "La Divina Commedia" }]);
    fetchTextoMock.mockResolvedValue(paginaLivro({ ratingValue: 4.23, ratingCount: 429 }));

    await new GoodreadsAdapter(0).coletar(
      consulta("La Divina Commedia", undefined, { goodreads: "la-divina-commedia" }),
    );

    const urls = fetchTextoMock.mock.calls.map(([url]) => String(url));
    expect(urls).toEqual(["https://www.goodreads.com/book/show/49762475"]);
    for (const url of urls) {
      expect(url).toMatch(/^https:\/\/www\.goodreads\.com\/book\/show\/\d+$/);
    }
  });

  it("usa id externo numérico direto (sem slug, sem autocomplete)", async () => {
    fetchTextoMock.mockResolvedValue(paginaLivro({ ratingValue: 4.03, ratingCount: 214084 }));

    const notas = await new GoodreadsAdapter(0).coletar(
      consulta("Inferno", undefined, { goodreads: "15651" }),
    );

    expect(fetchJsonMock).not.toHaveBeenCalled();
    expect(fetchTextoMock).toHaveBeenCalledWith(
      "https://www.goodreads.com/book/show/15651",
      expect.anything(),
    );
    expect(notas[0]?.url).toBe("https://www.goodreads.com/book/show/15651");
  });

  it("mantém atendeTipo (livro) e o gate de preparação", () => {
    const adapter = new GoodreadsAdapter(0);
    expect(adapter.atendeTipo("LIVRO")).toBe(true);
    expect(adapter.atendeTipo("FILME")).toBe(false);
    vi.stubEnv("MEDIA_PREPARACAO_ENABLED", "true");
    expect(adapter.ativo()).toBe(true);
    vi.stubEnv("MEDIA_PREPARACAO_ENABLED", "false");
    expect(adapter.ativo()).toBe(false);
  });
});

/**
 * T-DADOS-32 — caminho POR ISBN. Os títulos do catálogo são em português e o
 * autocomplete devolve o título original: a guarda de título rejeitava quase
 * tudo (2/651 em produção). O work do OpenLibrary (`OL…W`) já está no
 * `idsExternos`; suas edições dão ISBNs e o autocomplete por ISBN resolve a
 * obra independentemente do idioma.
 */
const OL_WORK = "OL471932W";

function respostaJson(
  edicoesResp: unknown,
  autocomplete: Record<string, unknown>,
): (urlBruto: string) => Promise<unknown> {
  return async (urlBruto: string) => {
    const url = String(urlBruto);
    if (url.includes("/editions.json")) {
      if (edicoesResp === undefined) throw new Error("edições inesperadas neste cenário");
      return edicoesResp;
    }
    const q = new URL(url).searchParams.get("q") ?? "";
    return autocomplete[q] ?? [];
  };
}

describe("T-DADOS-32 — Goodreads resolve o livro por ISBN (work do OpenLibrary)", () => {
  beforeEach(() => {
    fetchJsonMock.mockReset();
    fetchTextoMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("(1) consulta as edições do OpenLibrary e depois o autocomplete por ISBN, nessa ordem", async () => {
    fetchJsonMock.mockImplementation(
      respostaJson(
        { entries: [{ isbn_13: ["9788535902778"] }] },
        {
          "9788535902778": [{ bookId: "835980", title: "A Ditadura Envergonhada" }],
        },
      ),
    );
    fetchTextoMock.mockResolvedValue(paginaLivro({ ratingValue: 4.42, ratingCount: 3030 }));

    const notas = await new GoodreadsAdapter(0).coletar(
      consulta("A Ditadura Envergonhada", undefined, { openlibrary: OL_WORK }),
    );

    const urlsJson = fetchJsonMock.mock.calls.map(([url]) => String(url));
    expect(urlsJson).toHaveLength(2);
    expect(urlsJson[0]).toBe(
      `https://openlibrary.org/works/${OL_WORK}/editions.json?limit=5&fields=isbn_13,isbn_10`,
    );
    expect(urlsJson[1]).toBe(
      "https://www.goodreads.com/book/auto_complete?format=json&q=9788535902778",
    );
    expect(fetchTextoMock).toHaveBeenCalledWith(
      "https://www.goodreads.com/book/show/835980",
      expect.anything(),
    );
    expect(notas).toEqual([
      {
        fonte: "goodreads",
        rating: 4.42,
        media_fonte: 3.5,
        desvio_fonte: 0.6,
        votos: 3030,
        url: "https://www.goodreads.com/book/show/835980",
      },
    ]);
  });

  it("(2) prefere isbn_13 a isbn_10, deduplica e limita a 3 ISBNs", () => {
    const isbns = isbnsDasEdicoesOpenLibrary({
      entries: [
        { isbn_10: ["8535902775"], isbn_13: ["9788535902778"] },
        {
          isbn_13: ["9788535902778", "9780439708180", "9788533613379"],
          isbn_10: ["0439708184"],
        },
      ],
    });

    expect(isbns).toEqual(["9788535902778", "9780439708180", "9788533613379"]);

    // Sem isbn_13, usa isbn_10 (também sem duplicatas).
    expect(
      isbnsDasEdicoesOpenLibrary({
        entries: [{ isbn_10: ["0439708184", "0439708184", "8535902775"] }],
      }),
    ).toEqual(["0439708184", "8535902775"]);
  });

  it("(3) aceita título traduzido/diferente (identidade é o ISBN), mas rejeita bookId não numérico", async () => {
    fetchJsonMock.mockImplementation(
      respostaJson(
        { entries: [{ isbn_13: ["9788535902778"] }] },
        {
          "9788535902778": [
            { bookId: "não-numérico", title: "A Ditadura Envergonhada" },
            { bookId: "835980", title: "The Embarrassed Dictatorship" },
          ],
        },
      ),
    );
    fetchTextoMock.mockResolvedValue(paginaLivro({ ratingValue: 4.42, ratingCount: 3030 }));

    const notas = await new GoodreadsAdapter(0).coletar(
      consulta("A Ditadura Envergonhada", undefined, { openlibrary: OL_WORK }),
    );

    expect(notas[0]?.url).toBe("https://www.goodreads.com/book/show/835980");
  });

  it("(4) tenta até 3 ISBNs, na ordem, até um resolver", async () => {
    fetchJsonMock.mockImplementation(
      respostaJson(
        {
          entries: [{ isbn_13: ["9788535902778", "9780439708180", "9788533613379"] }],
        },
        {
          "9788535902778": [],
          "9780439708180": [],
          "9788533613379": [{ bookId: "6068617", title: "The Fellowship of the Ring" }],
        },
      ),
    );
    fetchTextoMock.mockResolvedValue(paginaLivro({ ratingValue: 4.38, ratingCount: 1000 }));

    const notas = await new GoodreadsAdapter(0).coletar(
      consulta("A Sociedade do Anel", undefined, { openlibrary: OL_WORK }),
    );

    const tentativas = fetchJsonMock.mock.calls
      .map(([url]) => String(url))
      .filter((url) => url.includes("auto_complete"))
      .map((url) => new URL(url).searchParams.get("q"));
    expect(tentativas).toEqual(["9788535902778", "9780439708180", "9788533613379"]);
    expect(notas[0]?.url).toBe("https://www.goodreads.com/book/show/6068617");
  });

  it("(5) nenhum ISBN resolve → CAI no fallback por título (com guarda) — decisão T-DADOS-32", async () => {
    fetchJsonMock.mockImplementation(
      respostaJson(
        { entries: [{ isbn_13: ["9780141439518"] }] },
        {
          "9780141439518": [],
          "Dom Casmurro": [{ bookId: "77", title: "Dom Casmurro" }],
        },
      ),
    );
    fetchTextoMock.mockResolvedValue(paginaLivro({ ratingValue: 4.1, ratingCount: 500 }));

    const notas = await new GoodreadsAdapter(0).coletar(
      consulta("Dom Casmurro", undefined, { openlibrary: OL_WORK }),
    );

    const urlsJson = fetchJsonMock.mock.calls.map(([url]) => String(url));
    expect(urlsJson).toHaveLength(3);
    expect(urlsJson[0]).toContain("/editions.json");
    expect(urlsJson[1]).toContain("auto_complete?format=json&q=9780141439518");
    expect(urlsJson[2]).toContain("auto_complete?format=json&q=Dom%20Casmurro");
    expect(notas[0]?.url).toBe("https://www.goodreads.com/book/show/77");
  });

  it("(6) sem work OL…W → caminho por título de sempre (sem edições)", async () => {
    fetchJsonMock.mockImplementation(
      respostaJson(undefined, {
        Inferno: [{ bookId: "15651", title: "Inferno" }],
      }),
    );
    fetchTextoMock.mockResolvedValue(paginaLivro({ ratingValue: 4.03, ratingCount: 214084 }));

    const notas = await new GoodreadsAdapter(0).coletar(consulta("Inferno"));

    const urlsJson = fetchJsonMock.mock.calls.map(([url]) => String(url));
    expect(urlsJson).toHaveLength(1);
    expect(urlsJson[0]).toContain("auto_complete?format=json&q=Inferno");
    for (const url of urlsJson) expect(url).not.toContain("/editions.json");
    expect(notas[0]?.url).toBe("https://www.goodreads.com/book/show/15651");
  });

  it("(7) JSON-LD sem aggregateRating no caminho por ISBN → []", async () => {
    fetchJsonMock.mockImplementation(
      respostaJson(
        { entries: [{ isbn_13: ["9788535902778"] }] },
        {
          "9788535902778": [{ bookId: "835980", title: "A Ditadura Envergonhada" }],
        },
      ),
    );
    fetchTextoMock.mockResolvedValue(paginaLivro());

    const notas = await new GoodreadsAdapter(0).coletar(
      consulta("A Ditadura Envergonhada", undefined, { openlibrary: OL_WORK }),
    );

    expect(notas).toEqual([]);
  });

  it("falha de rede não lança: devolve [] (mesmo com ISBN e fallback indisponíveis)", async () => {
    fetchJsonMock.mockRejectedValue(new Error("HTTP 503"));

    await expect(
      new GoodreadsAdapter(0).coletar(
        consulta("A Ditadura Envergonhada", undefined, { openlibrary: OL_WORK }),
      ),
    ).resolves.toEqual([]);
  });
});
