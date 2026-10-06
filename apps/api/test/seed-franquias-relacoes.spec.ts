import { describe, it, expect } from "vitest";
import { construirPlano } from "../scripts/seed-franquias-relacoes.mjs";

/**
 * T163 (Onda B) — planner do seed auditado: match por (titulo, tipo),
 * ausentes/ambiguos pulados com relatório, franquia só com >= 2 itens,
 * plano idempotente.
 */

const CATALOGO = [
  { id: "m-hobbit", titulo: "O Hobbit", tipo: "LIVRO" },
  { id: "m-sociedade-f", titulo: "O Senhor dos Anéis: A Sociedade do Anel", tipo: "FILME" },
  { id: "m-sociedade-l", titulo: "O Senhor dos Anéis: A Sociedade do Anel", tipo: "LIVRO" },
  { id: "m-duas", titulo: "O Senhor dos Anéis: As Duas Torres", tipo: "FILME" },
  { id: "m-bb", titulo: "Breaking Bad", tipo: "SERIE" },
  { id: "m-bcs", titulo: "Better Call Saul", tipo: "SERIE" },
];

const DATASET = {
  franquias: [
    {
      slug: "o-senhor-dos-aneis",
      nome: "O Senhor dos Anéis",
      itens: [
        { titulo: "O Hobbit", tipo: "LIVRO", lancamento: 1, cronologica: 1 },
        {
          titulo: "O Senhor dos Anéis: A Sociedade do Anel",
          tipo: "FILME",
          lancamento: 2,
          cronologica: 2,
        },
        {
          titulo: "O Senhor dos Anéis: As Duas Torres",
          tipo: "FILME",
          lancamento: 3,
          cronologica: 3,
        },
        { titulo: "NÃO EXISTE NO CATÁLOGO", tipo: "FILME", lancamento: 4, cronologica: 4 },
      ],
    },
    {
      slug: "breaking-bad-universo",
      nome: "Breaking Bad (Universo)",
      itens: [
        { titulo: "Better Call Saul", tipo: "SERIE", lancamento: 2, cronologica: 1 },
        { titulo: "Breaking Bad", tipo: "SERIE", lancamento: 1, cronologica: 2 },
      ],
    },
    {
      slug: "franquia-solitaria",
      nome: "Franquia Solitária",
      itens: [{ titulo: "O Hobbit", tipo: "LIVRO", lancamento: 1, cronologica: 1 }],
    },
  ],
  relacoes: [
    {
      origem: { titulo: "O Senhor dos Anéis: A Sociedade do Anel", tipo: "FILME" },
      tipoRelacao: "ADAPTACAO_DE",
      destino: { titulo: "O Senhor dos Anéis: A Sociedade do Anel", tipo: "LIVRO" },
      nota: "Adaptação do primeiro volume",
    },
    {
      origem: { titulo: "NÃO EXISTE", tipo: "GAME" },
      tipoRelacao: "SEQUENCIA_DE",
      destino: { titulo: "Breaking Bad", tipo: "SERIE" },
      nota: null,
    },
  ],
};

describe("construirPlano (T163 — seed auditado)", () => {
  it("casa por (titulo, tipo) mesmo com mesmo título em tipos distintos", () => {
    const plano = construirPlano(DATASET, CATALOGO);
    const lotr = plano.franquias.find((f) => f.slug === "o-senhor-dos-aneis");
    // 3 resolvidos + 1 ausente pulado.
    expect(lotr.itens).toHaveLength(3);
    expect(lotr.itens.map((i) => i.midiaId)).toEqual(["m-hobbit", "m-sociedade-f", "m-duas"]);
    const rel = plano.relacoes[0];
    expect(rel).toEqual({
      origemId: "m-sociedade-f",
      destinoId: "m-sociedade-l",
      tipoRelacao: "ADAPTACAO_DE",
      nota: "Adaptação do primeiro volume",
    });
  });

  it("ausentes vão para o relatório e não bloqueiam o plano", () => {
    const plano = construirPlano(DATASET, CATALOGO);
    expect(plano.ausentes).toContainEqual({
      contexto: "franquia o-senhor-dos-aneis",
      titulo: "NÃO EXISTE NO CATÁLOGO",
      tipo: "FILME",
    });
    expect(plano.ausentes).toContainEqual(
      expect.objectContaining({ contexto: "relação SEQUENCIA_DE" }),
    );
  });

  it("franquia com < 2 itens resolvidos é descartada (regra do hub /top)", () => {
    const plano = construirPlano(DATASET, CATALOGO);
    expect(plano.franquias.find((f) => f.slug === "franquia-solitaria")).toBeUndefined();
    expect(plano.ausentes).toContainEqual(
      expect.objectContaining({ contexto: "franquia franquia-solitaria (ficou com < 2 itens)" }),
    );
  });

  it("plano é determinístico (idempotência: rodar 2x dá o mesmo plano)", () => {
    const a = construirPlano(DATASET, CATALOGO);
    const b = construirPlano(DATASET, CATALOGO);
    expect(a).toEqual(b);
  });

  it("título duplicado no mesmo tipo é ambiguo e é pulado", () => {
    const catalogo = [
      { id: "a", titulo: "X", tipo: "FILME" },
      { id: "b", titulo: "X", tipo: "FILME" },
    ];
    const plano = construirPlano(
      {
        franquias: [],
        relacoes: [
          {
            origem: { titulo: "X", tipo: "FILME" },
            tipoRelacao: "SEQUENCIA_DE",
            destino: { titulo: "X", tipo: "FILME" },
            nota: null,
          },
        ],
      },
      catalogo,
    );
    expect(plano.relacoes).toHaveLength(0);
    expect(plano.ambiguos).toHaveLength(1);
  });
});
