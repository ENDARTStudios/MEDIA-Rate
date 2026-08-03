import { describe, it, expect, beforeEach } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  WatchlistService,
  FREE_WATCHLIST_LIMIT,
} from "../src/modules/watchlist/watchlist.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { ConflictException, HttpException, NotFoundException } from "@nestjs/common";

interface WatchlistEntryRow {
  id: string;
  usuario_id: string;
  midia_id: string;
  coluna: string;
  prioridade: number;
  created_at: Date;
  updated_at: Date;
}

interface MockWatchlistArgs {
  where: {
    usuario_id?: string;
    id?: string;
    coluna?: string;
    usuario_id_midia_id?: { usuario_id: string; midia_id: string };
  };
  data?: {
    usuario_id?: string;
    midia_id?: string;
    coluna?: string;
    usuario?: { connect: { id: string } };
    midia?: { connect: { id: string } };
  };
}

type WatchlistEntryWithMidia = WatchlistEntryRow & { midia: Record<string, unknown> };

interface MockWatchlistPrisma {
  watchlistEntry: {
    findMany: (args: MockWatchlistArgs) => Promise<WatchlistEntryWithMidia[]>;
    findFirst: (args: MockWatchlistArgs) => Promise<WatchlistEntryRow | null>;
    findUnique: (args: MockWatchlistArgs) => Promise<WatchlistEntryRow | null>;
    create: (args: MockWatchlistArgs) => Promise<WatchlistEntryWithMidia>;
    update: (args: MockWatchlistArgs) => Promise<WatchlistEntryWithMidia | null>;
    delete: (args: MockWatchlistArgs) => Promise<Record<string, unknown>>;
    count: (args: { where: { usuario_id: string } }) => Promise<number>;
  };
  midia: {
    findUnique: (args: MockWatchlistArgs) => Promise<Record<string, unknown> | null>;
  };
  usuarioPlano: {
    findUnique: (args: { where: { usuario_id: string } }) => Promise<{ plano: string } | null>;
  };
}

describe("WatchlistService (unit)", () => {
  let service: WatchlistService;
  let prisma: MockWatchlistPrisma;

  beforeEach(async () => {
    prisma = mockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [WatchlistService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<WatchlistService>(WatchlistService);
  });

  it("add — adiciona mídia à watchlist", async () => {
    const result = await service.add("user-1", { midia_id: "media-1", coluna: "WANT" });
    expect(result.midia_id).toBe("media-1");
    expect(result.coluna).toBe("WANT");
  });

  it("add — coluna default é WANT", async () => {
    const result = await service.add("user-1", { midia_id: "media-2" });
    expect(result.coluna).toBe("WANT");
  });

  it("add — mídia duplicada lança ConflictException", async () => {
    await service.add("user-1", { midia_id: "media-1" });
    await expect(service.add("user-1", { midia_id: "media-1" })).rejects.toThrow(ConflictException);
  });

  it("add — mídia duplicada em coluna diferente lança ConflictException", async () => {
    await service.add("user-1", { midia_id: "media-1", coluna: "WANT" });
    await expect(
      service.add("user-1", { midia_id: "media-1", coluna: "COMPLETED" }),
    ).rejects.toThrow(ConflictException);
  });

  it("list — retorna watchlist do usuário por coluna", async () => {
    await service.add("user-1", { midia_id: "m1", coluna: "WANT" });
    await service.add("user-1", { midia_id: "m2", coluna: "WATCHING" });
    const result = await service.list("user-1", "WANT");
    expect(result.length).toBe(1);
    expect(result[0].midia_id).toBe("m1");
  });

  it("list — retorna todas as colunas se coluna não especificada", async () => {
    await service.add("user-1", { midia_id: "m1", coluna: "WANT" });
    await service.add("user-1", { midia_id: "m2", coluna: "WATCHING" });
    const result = await service.list("user-1");
    expect(result.length).toBe(2);
  });

  it("move — move mídia para outra coluna", async () => {
    await service.add("user-1", { midia_id: "m1", coluna: "WANT" });
    const result = await service.move("user-1", "entry-1", "COMPLETED");
    expect(result.coluna).toBe("COMPLETED");
  });

  it("move — entrada inexistente lança NotFoundException", async () => {
    await expect(service.move("user-1", "nonexistent", "COMPLETED")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("move — entrada de outro usuário lança NotFoundException", async () => {
    await service.add("user-1", { midia_id: "m1" });
    await expect(service.move("user-2", "entry-1", "COMPLETED")).rejects.toThrow(NotFoundException);
  });

  it("remove — remove mídia da watchlist", async () => {
    await service.add("user-1", { midia_id: "m1" });
    await service.remove("user-1", "entry-1");
    const result = await service.list("user-1");
    expect(result.length).toBe(0);
  });

  it("remove — entrada inexistente lança NotFoundException", async () => {
    await expect(service.remove("user-1", "nonexistent")).rejects.toThrow(NotFoundException);
  });

  describe("D-132: limite do plano Free (20 itens)", () => {
    it("add — FREE abaixo do limite permite", async () => {
      prisma = mockPrisma({ prefill: FREE_WATCHLIST_LIMIT - 1 });
      service = await buildService(prisma);
      const result = await service.add("user-1", { midia_id: "media-x", coluna: "WANT" });
      expect(result.midia_id).toBe("media-x");
    });

    it("add — FREE no limite lança 402 Payment Required", async () => {
      prisma = mockPrisma({ prefill: FREE_WATCHLIST_LIMIT });
      service = await buildService(prisma);
      const err = await service
        .add("user-1", { midia_id: "media-x", coluna: "WANT" })
        .catch((e) => e);
      expect(err).toBeInstanceOf(HttpException);
      expect(err.getStatus()).toBe(402);
      expect(err.getResponse().required_plan).toBe("PLUS");
    });

    it("add — sem registro de plano (FREE default) aplica limite", async () => {
      prisma = mockPrisma({ prefill: FREE_WATCHLIST_LIMIT });
      service = await buildService(prisma);
      await expect(service.add("user-1", { midia_id: "media-x", coluna: "WANT" })).rejects.toThrow(
        HttpException,
      );
    });

    it("add — PLUS ignora o limite (trial incluído)", async () => {
      prisma = mockPrisma({ prefill: FREE_WATCHLIST_LIMIT, plano: "PLUS" });
      service = await buildService(prisma);
      const result = await service.add("user-1", { midia_id: "media-x", coluna: "WANT" });
      expect(result.midia_id).toBe("media-x");
    });
  });
});

async function buildService(prisma: MockWatchlistPrisma): Promise<WatchlistService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [WatchlistService, { provide: PrismaService, useValue: prisma }],
  }).compile();
  return module.get<WatchlistService>(WatchlistService);
}

function mockPrisma(opts: { plano?: string; prefill?: number } = {}): MockWatchlistPrisma {
  let nextId = 1;
  const entries: WatchlistEntryRow[] = [];
  for (let i = 0; i < (opts.prefill ?? 0); i++) {
    entries.push({
      id: `entry-${nextId++}`,
      usuario_id: "user-1",
      midia_id: `m-${i}`,
      coluna: "WANT",
      prioridade: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  return {
    watchlistEntry: {
      count: async (args: { where: { usuario_id: string } }) =>
        entries.filter((e) => e.usuario_id === args.where.usuario_id).length,
      findMany: async (args: MockWatchlistArgs) => {
        let items = entries.filter((e) => e.usuario_id === args.where.usuario_id);
        if (args.where?.coluna) items = items.filter((e) => e.coluna === args.where.coluna);
        return items.map((e) => ({
          ...e,
          midia: {
            id: e.midia_id,
            titulo: `Title ${e.midia_id}`,
            tipo: "FILME",
            ano_lancamento: 2024,
            imagem_url: null,
          },
        }));
      },
      findFirst: async (args: MockWatchlistArgs) => {
        return (
          entries.find((e) => e.id === args.where.id && e.usuario_id === args.where.usuario_id) ??
          null
        );
      },
      findUnique: async (args: MockWatchlistArgs) => {
        const byUserMidia = entries.find(
          (e) =>
            e.usuario_id === args.where.usuario_id_midia_id?.usuario_id &&
            e.midia_id === args.where.usuario_id_midia_id?.midia_id,
        );
        if (byUserMidia) return byUserMidia;
        return entries.find((e) => e.id === args.where.id) ?? null;
      },
      create: async (args: MockWatchlistArgs) => {
        const e: WatchlistEntryRow = {
          id: `entry-${nextId++}`,
          usuario_id: args.data?.usuario_id ?? args.data?.usuario?.connect.id ?? "",
          midia_id: args.data?.midia_id ?? args.data?.midia?.connect.id ?? "",
          coluna: args.data?.coluna ?? "WANT",
          prioridade: 0,
          created_at: new Date(),
          updated_at: new Date(),
        };
        entries.push(e);
        return {
          ...e,
          midia: {
            id: e.midia_id,
            titulo: `Title ${e.midia_id}`,
            tipo: "FILME",
            ano_lancamento: 2024,
            imagem_url: null,
          },
        };
      },
      update: async (args: MockWatchlistArgs) => {
        const e = entries.find((x) => x.id === args.where.id);
        if (!e) return null;
        Object.assign(e, args.data, { updated_at: new Date() });
        return {
          ...e,
          midia: {
            id: e.midia_id,
            titulo: `Title ${e.midia_id}`,
            tipo: "FILME",
            ano_lancamento: 2024,
            imagem_url: null,
          },
        };
      },
      delete: async (args: MockWatchlistArgs) => {
        const idx = entries.findIndex((e) => e.id === args.where.id);
        if (idx === -1) throw new Error("Not found");
        entries.splice(idx, 1);
        return {};
      },
    },
    midia: {
      findUnique: async (args: MockWatchlistArgs) =>
        entries.some((e) => e.midia_id === args.where.id)
          ? {
              id: args.where.id,
              titulo: "Title",
              tipo: "FILME",
              ano_lancamento: 2024,
              imagem_url: null,
            }
          : null,
    },
    usuarioPlano: {
      findUnique: async () => (opts.plano ? { plano: opts.plano } : null),
    },
  };
}
