import { describe, it, expect, beforeEach, vi } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { DiscoveryService } from "../src/modules/discovery/discovery.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import type { EventoReacaoRegistrada } from "../src/modules/watchlist/watchlist.service.js";

interface Relacao {
  id: string;
  tipo: string;
  origem_id: string;
  destino_id: string;
}

function mockPrisma(relacoes: Relacao[]) {
  const eventos: Record<
    string,
    { usuario_id: string; from_media_id: string; to_media_id: string; relation_type: string }
  > = {};
  const prisma = {
    relacaoObra: {
      findMany: vi.fn(async () => relacoes),
    },
    discoveryEvent: {
      upsert: vi.fn(async ({ where, create }) => {
        const chave =
          where.usuario_id_to_media_id.usuario_id + "|" + where.usuario_id_to_media_id.to_media_id;
        eventos[chave] = create;
        return { id: "ev-" + Object.keys(eventos).length, ...create };
      }),
      findMany: vi.fn(async ({ where, take }) => {
        const lista = Object.entries(eventos)
          .filter(([k]) => k.startsWith(where.usuario_id + "|"))
          .map(([, v]) => ({
            id: "ev-1",
            relation_type: v.relation_type,
            created_em: new Date(),
            from_media: {
              id: v.from_media_id,
              titulo: "De",
              tipo: "FILME",
              imagem_url: null,
              score: 8,
            },
            to_media: {
              id: v.to_media_id,
              titulo: "Para",
              tipo: "GAME",
              imagem_url: null,
              score: 9,
            },
          }));
        return lista.slice(0, take);
      }),
    },
  };
  return { prisma, eventos };
}

describe("DiscoveryService (T286)", () => {
  let service: DiscoveryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoveryService,
        { provide: PrismaService, useValue: { relacaoObra: {}, discoveryEvent: {} } },
      ],
    }).compile();
    service = module.get<DiscoveryService>(DiscoveryService);
  });

  it("GOSTEI em obra com relação → gera evento idempotente para a obra relacionada", async () => {
    const ctx = mockPrisma([
      { id: "r1", tipo: "ADAPTACAO_DE", origem_id: "m-livro", destino_id: "m-filme" },
    ]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiscoveryService, { provide: PrismaService, useValue: ctx.prisma }],
    }).compile();
    service = module.get<DiscoveryService>(DiscoveryService);

    const evento: EventoReacaoRegistrada = {
      usuarioId: "u1",
      entryId: "e1",
      midiaId: "m-livro", // origem da aresta → to = destino
      reacao: "GOSTEI",
    };
    await service.processarReacao(evento);

    expect(ctx.prisma.discoveryEvent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { usuario_id_to_media_id: { usuario_id: "u1", to_media_id: "m-filme" } },
        create: expect.objectContaining({
          usuario_id: "u1",
          from_media_id: "m-livro",
          to_media_id: "m-filme",
          relation_type: "ADAPTACAO_DE",
        }),
      }),
    );
  });

  it("NAO_GOSTEI não gera eventos", async () => {
    const ctx = mockPrisma([{ id: "r1", tipo: "SEQUENCIA_DE", origem_id: "a", destino_id: "b" }]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiscoveryService, { provide: PrismaService, useValue: ctx.prisma }],
    }).compile();
    service = module.get<DiscoveryService>(DiscoveryService);

    await service.processarReacao({
      usuarioId: "u1",
      entryId: "e1",
      midiaId: "a",
      reacao: "NAO_GOSTEI",
    });
    expect(ctx.prisma.discoveryEvent.upsert).not.toHaveBeenCalled();
  });

  it("obra sem relação no grafo não gera evento", async () => {
    const ctx = mockPrisma([]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiscoveryService, { provide: PrismaService, useValue: ctx.prisma }],
    }).compile();
    service = module.get<DiscoveryService>(DiscoveryService);

    await service.processarReacao({
      usuarioId: "u1",
      entryId: "e1",
      midiaId: "solo",
      reacao: "GOSTEI",
    });
    expect(ctx.prisma.discoveryEvent.upsert).not.toHaveBeenCalled();
  });

  it("falha do feed nunca quebra o PATCH (processarReacao não lança)", async () => {
    const ctx = {
      prisma: {
        relacaoObra: {
          findMany: vi.fn(async () => {
            throw new Error("boom");
          }),
        },
        discoveryEvent: {},
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiscoveryService, { provide: PrismaService, useValue: ctx.prisma }],
    }).compile();
    service = module.get<DiscoveryService>(DiscoveryService);

    await expect(
      service.processarReacao({ usuarioId: "u1", entryId: "e1", midiaId: "m", reacao: "GOSTEI" }),
    ).resolves.toBeUndefined();
  });

  it("listar retorna o feed paginado do usuário", async () => {
    const ctx = mockPrisma([
      { id: "r1", tipo: "MESMO_UNIVERSO", origem_id: "m1", destino_id: "m2" },
    ]);
    ctx.eventos["u1|m2"] = {
      usuario_id: "u1",
      from_media_id: "m1",
      to_media_id: "m2",
      relation_type: "MESMO_UNIVERSO",
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiscoveryService, { provide: PrismaService, useValue: ctx.prisma }],
    }).compile();
    service = module.get<DiscoveryService>(DiscoveryService);

    const feed = await service.listar("u1", {});
    expect(feed.itens).toHaveLength(1);
    expect(feed.itens[0].para.id).toBe("m2");
    expect(feed.itens[0].relation_type).toBe("MESMO_UNIVERSO");
  });
});
