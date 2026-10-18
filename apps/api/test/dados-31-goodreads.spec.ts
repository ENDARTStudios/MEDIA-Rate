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
import { GoodreadsAdapter } from "../src/modules/media-score/adapters/goodreads.adapter.js";

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

    const notas = await new GoodreadsAdapter().coletar(consulta("La Divina Commédia", undefined));

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

    const notas = await new GoodreadsAdapter().coletar(consulta("Duna"));

    expect(notas).toEqual([]);
    expect(fetchTextoMock).not.toHaveBeenCalled();
  });

  it("retorna [] para resposta de autocomplete que não é array", async () => {
    fetchJsonMock.mockResolvedValue({ erro: "shape inesperado" });

    const notas = await new GoodreadsAdapter().coletar(consulta("Duna"));

    expect(notas).toEqual([]);
    expect(fetchTextoMock).not.toHaveBeenCalled();
  });

  it("guarda de ano: rejeita ano distante, aceita ±2 e aceita item sem ano", async () => {
    fetchJsonMock.mockResolvedValue([
      { bookId: "10", title: "Duna", originalPublicationYear: 1965 },
    ]);
    expect(await new GoodreadsAdapter().coletar(consulta("Duna", 1980))).toEqual([]);
    expect(fetchTextoMock).not.toHaveBeenCalled();

    // Diferença de 2 anos (edição vs. publicação) é aceita.
    fetchJsonMock.mockResolvedValue([
      { bookId: "11", title: "Duna", originalPublicationYear: 1982 },
    ]);
    fetchTextoMock.mockResolvedValue(paginaLivro({ ratingValue: 4, ratingCount: 10 }));
    const aceito = await new GoodreadsAdapter().coletar(consulta("Duna", 1980));
    expect(aceito[0]?.url).toBe("https://www.goodreads.com/book/show/11");

    // Hoje o autocomplete NÃO expõe ano; sem ano no item, a identidade é o título.
    fetchJsonMock.mockResolvedValue([{ bookId: "12", title: "Duna" }]);
    fetchTextoMock.mockResolvedValue(paginaLivro({ ratingValue: 4.1, ratingCount: 20 }));
    const semAnoNoItem = await new GoodreadsAdapter().coletar(consulta("Duna", 1980));
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

    const notas = await new GoodreadsAdapter().coletar(consulta("Inferno"));

    expect(notas).toHaveLength(1);
    expect(notas[0]?.rating).toBe(4.03);
    expect(notas[0]?.votos).toBe(214084);
  });

  it("página sem aggregateRating no livro retorna []", async () => {
    fetchJsonMock.mockResolvedValue([{ bookId: "999", title: "Sem nota" }]);
    fetchTextoMock.mockResolvedValue(paginaLivro());

    const notas = await new GoodreadsAdapter().coletar(consulta("Sem nota"));

    expect(notas).toEqual([]);
  });

  it("nunca monta /book/show/<slug>: id externo textual é ignorado", async () => {
    fetchJsonMock.mockResolvedValue([{ bookId: "49762475", title: "La Divina Commedia" }]);
    fetchTextoMock.mockResolvedValue(paginaLivro({ ratingValue: 4.23, ratingCount: 429 }));

    await new GoodreadsAdapter().coletar(
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

    const notas = await new GoodreadsAdapter().coletar(
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
    const adapter = new GoodreadsAdapter();
    expect(adapter.atendeTipo("LIVRO")).toBe(true);
    expect(adapter.atendeTipo("FILME")).toBe(false);
    vi.stubEnv("MEDIA_PREPARACAO_ENABLED", "true");
    expect(adapter.ativo()).toBe(true);
    vi.stubEnv("MEDIA_PREPARACAO_ENABLED", "false");
    expect(adapter.ativo()).toBe(false);
  });
});
