/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { InteracoesService } from "../src/modules/interacoes/interacoes.service.js";

/**
 * T166 (Onda C5 — item 19): indicações "Para você" pelo GOSTO do usuário —
 * NUNCA aleatório. Perfil = gêneros das mídias interagidas (peso por status:
 * CONCLUIDO > CONSUMINDO > outros). Candidatos = não interagidas, com score,
 * que compartilham gênero; ranking = afinidade (peso dos gêneros em comum)
 * + bônus de adjacência no grafo (RelacaoObra de obra CONCLUÍDA) + bônus de
 * franquia. Cada indicação vem com MOTIVO (aresta > franquia > gêneros).
 */

const GEN = {
  drama: { id: 1, nome: "Drama", slug: "drama" },
  acao: { id: 2, nome: "Ação", slug: "acao" },
  crime: { id: 3, nome: "Crime", slug: "crime" },
};

function makeMocks(dados: any = {}) {
  const prisma = {
    usuarioMidiaInteracao: {
      findMany: vi.fn(async ({ where }: any) =>
        where?.usuario_id ? (dados.interacoes ?? []) : (dados.todas ?? []),
      ),
      findFirst: vi.fn(async () => null),
      findUnique: vi.fn(async () => null),
      create: vi.fn(async ({ data }: any) => data),
      update: vi.fn(),
      upsert: vi.fn(async ({ create }: any) => create),
      delete: vi.fn(),
      count: vi.fn(async () => 0),
      groupBy: vi.fn(async () => []),
      deleteMany: vi.fn(async () => ({ count: 0 })),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    midia: {
      findFirst: vi.fn(async () => null),
      findUnique: vi.fn(async () => null),
      findMany: vi.fn(async () => dados.candidatos ?? []),
      create: vi.fn(),
      update: vi.fn(),
    },
    midiaGenero: {
      findMany: vi.fn(async () => dados.generosDasInteragidas ?? []),
      findFirst: vi.fn(async () => null),
      createMany: vi.fn(async () => ({ count: 0 })),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    relacaoObra: {
      findMany: vi.fn(async () => dados.arestas ?? []),
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => null),
      create: vi.fn(),
      upsert: vi.fn(async ({ create }: any) => create),
    },
    discoveryEvent: {
      findMany: vi.fn(async () => []),
      createMany: vi.fn(async () => ({ count: 0 })),
      count: vi.fn(async () => 0),
      findUnique: vi.fn(async () => null),
    },
    usuario: {
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(async () => 0),
      updateMany: vi.fn(async () => ({ count: 0 })),
      groupBy: vi.fn(async () => []),
    },
    watchlistEntry: {
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => null),
      findUnique: vi.fn(async () => null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(async () => 0),
      groupBy: vi.fn(async () => []),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    $queryRawUnsafe: vi.fn(async () => []),
    $executeRawUnsafe: vi.fn(async () => undefined),
    $transaction: vi.fn(async (fn: any) => fn(prisma)),
    $disconnect: vi.fn(async () => undefined),
  };
  const service = new InteracoesService(prisma as any);
  return { service, prisma };
}

const INTERACOES = [
  { midia_id: "m-bb", status: "CONCLUIDO" },
  { midia_id: "m-mad", status: "CONSUMINDO" },
];

// Consumidas: BB (drama, crime), Mad Men (drama)
const GENEROS_INTERAGIDAS = [
  { midia_id: "m-bb", genero: GEN.drama },
  { midia_id: "m-bb", genero: GEN.crime },
  { midia_id: "m-mad", genero: GEN.drama },
];

const CANDIDATO = (id: string, generos: any[], score: number, extra: any = {}) => ({
  id,
  slug: `slug-${id}`,
  titulo: `Título ${id}`,
  tipo: "SERIE",
  ano_lancamento: 2020,
  imagem_url: null,
  score,
  generos: generos.map((g) => ({ genero: g })),
  ...extra,
});

describe("InteracoesService.paraVoce (T166 — indicações por gosto)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rankeia por afinidade: gêneros em comum pesados por status; exclui interagidas", async () => {
    const m = makeMocks({
      interacoes: INTERACOES,
      generosDasInteragidas: GENEROS_INTERAGIDAS,
      candidatos: [
        CANDIDATO("m-sop", [GEN.drama, GEN.crime], 70), // drama+crime, afinidade máxima
        CANDIDATO("m-romance", [GEN.drama], 90), // só drama
        { id: "m-bb" }, // interagida — fora
      ],
    });
    const r = await m.service.paraVoce("u1");
    expect(r.itens.map((i: any) => i.id)).toEqual(["m-sop", "m-romance"]);
    const chamada = m.prisma.midia.findMany.mock.calls[0][0];
    expect(chamada.where.id.notIn).toEqual(["m-bb", "m-mad"]);
    expect(chamada.where.score).toEqual({ not: null });
  });

  it("aresta do grafo de obra CONCLUÍDA vira bônus e MOTIVO principal", async () => {
    const m = makeMocks({
      interacoes: INTERACOES,
      generosDasInteragidas: GENEROS_INTERAGIDAS,
      candidatos: [CANDIDATO("m-elcamino", [GEN.crime], 65)],
      arestas: [
        {
          tipo: "SPINOFF_DE",
          origem_id: "m-elcamino",
          destino_id: "m-bb",
          origem: { titulo: "El Camino" },
          destino: { titulo: "Breaking Bad" },
        },
      ],
    });
    const r = await m.service.paraVoce("u1");
    expect(r.itens[0].motivo.tipo).toBe("GRAFO");
    expect(r.itens[0].motivo.rotulo).toContain("Breaking Bad");
    // Aresta (bônus 3 + crime comum peso 2×1) supera score baixo.
  });

  it("sem interações → vazio (nunca sugere no chute)", async () => {
    const m = makeMocks({
      interacoes: [],
      generosDasInteragidas: [],
      candidatos: [CANDIDATO("x", [GEN.drama], 90)],
    });
    const r = await m.service.paraVoce("u1");
    expect(r.itens).toEqual([]);
    expect(m.prisma.midia.findMany).not.toHaveBeenCalled();
  });

  it("motivo por gênero quando não há aresta/franquia", async () => {
    const m = makeMocks({
      interacoes: INTERACOES,
      generosDasInteragidas: GENEROS_INTERAGIDAS,
      candidatos: [CANDIDATO("m-sop", [GEN.drama, GEN.crime], 70)],
      arestas: [],
    });
    const r = await m.service.paraVoce("u1");
    expect(r.itens[0].motivo.tipo).toBe("GENERO");
    expect(r.itens[0].motivo.rotulo).toContain("Drama");
    expect(r.itens[0].motivo.rotulo).toContain("Crime");
  });

  it("payload serializa com JSON.stringify (D-447)", async () => {
    const m = makeMocks({
      interacoes: INTERACOES,
      generosDasInteragidas: GENEROS_INTERAGIDAS,
      candidatos: [CANDIDATO("m-sop", [GEN.drama], 70)],
      arestas: [],
    });
    const r = await m.service.paraVoce("u1");
    expect(() => JSON.stringify(r)).not.toThrow();
  });
});
