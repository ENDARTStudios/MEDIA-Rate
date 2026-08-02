import { describe, it, expect, beforeEach } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { WatchlistService } from "../src/modules/watchlist/watchlist.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { ConflictException, NotFoundException } from "@nestjs/common";

describe("WatchlistService (unit)", () => {
  let service: WatchlistService;
  let prisma: any;

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
});

function mockPrisma() {
  let nextId = 1;
  const entries: any[] = [];

  return {
    watchlistEntry: {
      findMany: async (args: any) => {
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
      findFirst: async (args: any) => {
        return (
          entries.find((e) => e.id === args.where.id && e.usuario_id === args.where.usuario_id) ??
          null
        );
      },
      findUnique: async (args: any) => {
        const byUserMidia = entries.find(
          (e) =>
            e.usuario_id === args.where.usuario_id_midia_id.usuario_id &&
            e.midia_id === args.where.usuario_id_midia_id.midia_id,
        );
        if (byUserMidia) return byUserMidia;
        return entries.find((e) => e.id === args.where.id) ?? null;
      },
      create: async (args: any) => {
        const e = {
          id: `entry-${nextId++}`,
          usuario_id: args.data.usuario_id ?? args.data.usuario.connect.id,
          midia_id: args.data.midia_id ?? args.data.midia.connect.id,
          coluna: args.data.coluna ?? "WANT",
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
      update: async (args: any) => {
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
      delete: async (args: any) => {
        const idx = entries.findIndex((e) => e.id === args.where.id);
        if (idx === -1) throw new Error("Not found");
        entries.splice(idx, 1);
        return {};
      },
    },
    midia: {
      findUnique: async (args: any) =>
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
  };
}
