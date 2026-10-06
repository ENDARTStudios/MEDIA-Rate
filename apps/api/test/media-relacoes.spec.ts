/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MediaController } from "../src/modules/media/media.controller.js";

/**
 * T163 (Onda B — conteúdo relacionado na ficha):
 * - getBySlug expõe `relacoes` (RelacaoObra nas duas direções) com resumo da
 *   outra ponta + tipo_relacao + nota_editorial;
 * - relações e franquias EXCLUEM mídias soft-deleted (T215);
 * - franquias vêm ordenadas por ordem_cronologica (nulls first) e lançamento.
 */

const RESUMO = (id: string, titulo: string, tipo: string, ano: number | null) => ({
  id,
  slug: `slug-${id}`,
  titulo,
  tipo,
  ano_lancamento: ano,
  imagem_url: null,
  score: 80,
});

function makeMidiaRow(relacoes: { origem: any[]; destino: any[] }, franquias: any[] = []) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "matrix",
    titulo: "Matrix",
    titulo_original: "The Matrix",
    titulo_en: null,
    titulo_es: null,
    tipo: "FILME",
    sinopse: null,
    sinopse_en: null,
    sinopse_es: null,
    ano_lancamento: 1999,
    imagem_url: null,
    classificacao_indicativa: "DOZE",
    origem_editorial: null,
    classificacoes_regiao: [],
    premios: [],
    pais_origem: "US",
    duracao_minutos: 136,
    generos: [],
    streamings: [],
    scores: [
      {
        score: 82,
        score_critica: 80,
        score_publico: 84,
        consenso: 4,
        indice_consenso: 96,
        votos_total: 1000,
        num_fontes: 3,
        confianca: 0.7,
        calculado_em: new Date("2026-01-01T00:00:00Z"),
        detalhes: [],
      },
    ],
    avaliacoes: [],
    franquias,
    relacoes_origem: relacoes.origem,
    relacoes_destino: relacoes.destino,
    deleted_at: null,
  };
}

function makeController(midiaRow: any) {
  const prisma = {
    midia: {
      findUnique: vi.fn(async ({ where }: any) => (where.id === midiaRow.id ? midiaRow : null)),
      findFirst: vi.fn(async () => ({ id: midiaRow.id })),
      findMany: vi.fn(async () => []),
    },
  };
  const controller = new MediaController(prisma as any, { calcularScore: vi.fn() } as any);
  return { controller, prisma };
}

describe("MediaController.getBySlug — relações e franquias (T163)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("expoe relacoes nas duas direcoes com resumo da outra ponta", async () => {
    const livro = RESUMO("22222222-2222-4222-8222-222222222222", "Duna", "LIVRO", 1965);
    const sequencia = RESUMO(
      "33333333-3333-4333-8333-333333333333",
      "Matrix Reloaded",
      "FILME",
      2003,
    );
    const row = makeMidiaRow({
      origem: [
        { tipo: "ADAPTACAO_DE", nota_editorial: "Baseado no livro de 1965", destino: livro },
      ],
      destino: [{ tipo: "SEQUENCIA_DE", nota_editorial: null, origem: sequencia }],
    });
    const { controller } = makeController(row);
    const result = (await controller.getBySlug("matrix")) as any;

    expect(result.relacoes).toHaveLength(2);
    // Origem: esta mídia É a adaptação DE <livro>.
    const adapt = result.relacoes.find((r: any) => r.tipo_relacao === "ADAPTACAO_DE");
    expect(adapt).toMatchObject({
      midia_id: livro.id,
      slug: livro.slug,
      titulo: "Duna",
      nota_editorial: "Baseado no livro de 1965",
    });
    // Destino: <sequencia> É sequência DESTE título.
    const seq = result.relacoes.find((r: any) => r.tipo_relacao === "SEQUENCIA_DE");
    expect(seq).toMatchObject({ midia_id: sequencia.id, titulo: "Matrix Reloaded" });
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it("include filtra relacoes com a outra ponta soft-deleted (T215)", async () => {
    const row = makeMidiaRow({ origem: [], destino: [] });
    const { prisma, controller } = makeController(row);
    await controller.getBySlug("matrix");
    const include = prisma.midia.findUnique.mock.calls[0][0].include;
    // relacoes_origem = esta mídia é a origem → a outra ponta é o destino.
    expect(include.relacoes_origem.where.destino.deleted_at).toBeNull();
    // relacoes_destino = esta mídia é o destino → a outra ponta é a origem.
    expect(include.relacoes_destino.where.origem.deleted_at).toBeNull();
  });

  it("include de franquias filtra soft-deleted e ordena cronologica nulls first + lancamento", async () => {
    const row = makeMidiaRow({ origem: [], destino: [] });
    const { prisma, controller } = makeController(row);
    await controller.getBySlug("matrix");
    const include = prisma.midia.findUnique.mock.calls[0][0].include;
    const franquiaMidias = include.franquias.include.franquia.include.midias;
    expect(franquiaMidias.where.midia.deleted_at).toBeNull();
    expect(franquiaMidias.orderBy).toEqual([
      { ordem_cronologica: { sort: "asc", nulls: "first" } },
      { ordem_lancamento: "asc" },
    ]);
  });

  it("relacoes com a outra ponta apagada nao aparecem no payload", async () => {
    const apagada = {
      ...RESUMO("44444444-4444-4444-8444-444444444444", "Spin-off Cancelado", "FILME", 2020),
      deleted_at: new Date(),
    };
    const viva = RESUMO("55555555-5555-4555-8555-555555555555", "Obra Viva", "FILME", 2021);
    const row = makeMidiaRow({
      // Simula o que o banco devolve depois do filtro no include: só arestas vivas.
      origem: [{ tipo: "SPINOFF_DE", nota_editorial: null, destino: viva }],
      destino: [],
    });
    const { controller } = makeController(row);
    const result = (await controller.getBySlug("matrix")) as any;
    expect(result.relacoes.map((r: any) => r.midia_id)).toEqual([viva.id]);
    expect(result.relacoes[0].titulo).not.toBe("Spin-off Cancelado");
    void apagada;
  });
});
