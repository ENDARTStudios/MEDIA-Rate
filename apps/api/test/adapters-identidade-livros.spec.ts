import { describe, it, expect, vi } from "vitest";
import {
  GoogleBooksAdapter,
  escolherVolumeGoogleBooks,
} from "../src/modules/media-score/adapters/googlebooks.adapter.js";
import { OpenCriticAdapter } from "../src/modules/media-score/adapters/opencritic.adapter.js";

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

describe("GoogleBooksAdapter — identidade por título (T-DADOS-49)", () => {
  const itens = [
    { volumeInfo: { title: "Por que Paulo Coelho teve sucesso", averageRating: 4.5 } },
    { volumeInfo: { title: "O Alquimista", averageRating: 4.1, ratingsCount: 9000 } },
  ];

  it("rejeita o primeiro com nota e pega o volume do título certo", () => {
    const pick = escolherVolumeGoogleBooks(itens, { tipo: "LIVRO", titulo: "O Alquimista" });
    expect(pick?.volumeInfo?.title).toBe("O Alquimista");
  });

  it("casa título traduzido via tituloOriginal", () => {
    const itensEn = [
      { volumeInfo: { title: "Outro Livro", averageRating: 4 } },
      { volumeInfo: { title: "The Alchemist", averageRating: 4.2 } },
    ];
    const pick = escolherVolumeGoogleBooks(itensEn, {
      tipo: "LIVRO",
      titulo: "O Alquimista",
      tituloOriginal: "The Alchemist",
    });
    expect(pick?.volumeInfo?.title).toBe("The Alchemist");
  });

  it("casa por inclusão quando o título do volume é mais longo (2001)", () => {
    const itens2001 = [
      {
        volumeInfo: {
          title: "Enforcing International Law Norms Against Terrorism",
          averageRating: 3,
        },
      },
      { volumeInfo: { title: "2001: A Space Odyssey", averageRating: 4.3 } },
    ];
    const pick = escolherVolumeGoogleBooks(itens2001, { tipo: "LIVRO", titulo: "2001" });
    expect(pick?.volumeInfo?.title).toBe("2001: A Space Odyssey");
  });

  it("sem volume com o título que confira, não atribui (caso real Twisted Lies)", () => {
    const outros = [{ volumeInfo: { title: "In Search of the Lost", averageRating: 4 } }];
    const pick = escolherVolumeGoogleBooks(outros, { tipo: "LIVRO", titulo: "Twisted Lies" });
    expect(pick).toBeNull();
  });

  it("coletar usa o volume conferido", async () => {
    vi.stubEnv("GOOGLE_BOOKS_API_KEY", "teste");
    mockFetch([{ body: { items: itens } }]);
    const notas = await new GoogleBooksAdapter().coletar({ tipo: "LIVRO", titulo: "O Alquimista" });
    expect(notas).toHaveLength(1);
    expect(notas[0].rating).toBe(4.1);
    expect(notas[0].votos).toBe(9000);
  });
});

describe("OpenCriticAdapter — sem fallback cego ao 1º resultado (T-DADOS-49)", () => {
  it("nome sem correspondência não atribui (caso real Pole Position → PositronX)", async () => {
    vi.stubEnv("OPENCRITIC_API_KEY", "teste");
    mockFetch([
      { body: [{ id: 10462, name: "PositronX", dist: 0.5 }] },
      { body: { medianScore: 70 } },
    ]);
    const notas = await new OpenCriticAdapter().coletar({ tipo: "GAME", titulo: "Pole Position" });
    expect(notas).toEqual([]);
  });

  it("continua casando exato e parcial (regressão)", async () => {
    vi.stubEnv("OPENCRITIC_API_KEY", "teste");
    mockFetch([
      { body: [{ id: 163, name: "Grand Theft Auto V", dist: 0.1 }] },
      { body: { medianScore: 92 } },
    ]);
    const notas = await new OpenCriticAdapter().coletar({
      tipo: "GAME",
      titulo: "Grand Theft Auto V",
    });
    expect(notas).toHaveLength(1);
    expect(notas[0].rating).toBe(92);
  });
});
