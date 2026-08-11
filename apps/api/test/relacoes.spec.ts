/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { RelacoesService } from "../src/modules/relacoes/relacoes.service.js";

function mockPrisma() {
  const arestas: any[] = [];
  const existentes = ["midia-1", "midia-2", "filme-1", "livro-1"];
  const prisma = {
    midia: {
      findFirst: vi.fn(async ({ where }: any) =>
        existentes.includes(where.id) ? { id: where.id } : null,
      ),
      findUnique: vi.fn(async ({ where }: any) =>
        existentes.includes(where.id) ? { id: where.id } : null,
      ),
      findMany: vi.fn(async ({ where }: any) =>
        (where?.id?.in ?? [])
          .filter((id: string) => existentes.includes(id))
          .map((id: string) => ({ id })),
      ),
    },
    relacaoObra: {
      findMany: vi.fn(async () => arestas),
      findUnique: vi.fn(async ({ where }: any) => arestas.find((a) => a.id === where.id) ?? null),
      upsert: vi.fn(async ({ create }: any) => {
        const existente = arestas.find(
          (a) => a.origem_id === create.origem_id && a.destino_id === create.destino_id,
        );
        if (existente) return existente;
        const nova = { id: `r${arestas.length + 1}`, criado_em: new Date(), ...create };
        arestas.push(nova);
        return nova;
      }),
      delete: vi.fn(async ({ where }: any) => {
        const i = arestas.findIndex((a) => a.id === where.id);
        return arestas.splice(i, 1)[0];
      }),
    },
  };
  return { prisma, arestas };
}

describe("T198 — relacoes.service (grafo Addendum 3 Parte 2)", () => {
  let prisma: any;
  let arestas: any[];
  let service: RelacoesService;

  beforeEach(() => {
    ({ prisma, arestas } = mockPrisma());
    service = new RelacoesService(prisma);
  });

  it("consulta bidirecional: uma aresta ativa a funcionalidade (1 livro → 1 filme)", async () => {
    arestas.push({
      id: "r1",
      tipo: "ADAPTACAO_DE",
      nota_editorial: "Baseado no livro de 1965",
      origem_id: "filme-1",
      destino_id: "livro-1",
      origem: { id: "filme-1", titulo: "Dune", tipo: "FILME", score: 91.2 },
      destino: { id: "livro-1", titulo: "Duna", tipo: "LIVRO", score: 95.0 },
    });
    const r = await service.listarBidirecional("filme-1");
    expect(r.relacoes.length).toBe(1);
    expect(r.relacoes[0].direcao).toBe("saida");
    expect(r.relacoes[0].midia.titulo).toBe("Duna");
    expect(r.relacoes[0].midia.tipo).toBe("LIVRO");
    expect(r.relacoes[0].midia.score).toBe(95.0);
    expect(r.relacoes[0].notaEditorial).toBe("Baseado no livro de 1965");

    // Aresta vista pelo DESTINO: direção invertida.
    const r2 = await service.listarBidirecional("livro-1");
    expect(r2.relacoes[0].direcao).toBe("entrada");
    expect(r2.relacoes[0].midia.titulo).toBe("Dune");
  });

  it("mídia inexistente → 404", async () => {
    await expect(service.listarBidirecional("nada")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("criar: origem == destino → 400", async () => {
    await expect(
      service.criar({ origemId: "midia-1", destinoId: "midia-1", tipo: "ADAPTACAO_DE" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("criar: extremo inexistente → 400", async () => {
    await expect(
      service.criar({ origemId: "midia-1", destinoId: "fantasma", tipo: "ADAPTACAO_DE" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("criar: upsert idempotente por (origem, destino)", async () => {
    const dto = {
      origemId: "midia-1",
      destinoId: "midia-2",
      tipo: "ADAPTACAO_DE" as const,
      notaEditorial: "x",
    };
    prisma.midia.findMany.mockResolvedValue([{ id: "midia-1" }, { id: "midia-2" }]);
    const a1 = await service.criar(dto);
    const a2 = await service.criar(dto);
    expect(a2.id).toBe(a1.id);
    expect(arestas.length).toBe(1);
  });

  it("remover: relação inexistente → 404; existente → remove", async () => {
    await expect(service.remover("nao-existe")).rejects.toBeInstanceOf(NotFoundException);
    arestas.push({ id: "r1", origem_id: "a", destino_id: "b" });
    const r = await service.remover("r1");
    expect(r.removido).toBe(true);
    expect(arestas.length).toBe(0);
  });
});
