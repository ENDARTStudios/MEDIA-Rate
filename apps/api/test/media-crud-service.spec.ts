import { describe, it, expect, beforeEach, vi } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { MediaService } from "../src/modules/media/media.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { NotFoundException } from "@nestjs/common";

interface MockMediaPrisma {
  midia: {
    findUnique: (args: { where: { id: string } }) => Promise<Record<string, unknown> | null>;
    findFirst: (args: {
      where: Record<string, unknown>;
      select?: Record<string, boolean>;
    }) => Promise<Record<string, unknown> | null>;
    create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
    update: (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => Promise<Record<string, unknown>>;
    delete: ReturnType<typeof vi.fn>;
  };
}

describe("MediaService — escrita (unit)", () => {
  let service: MediaService;
  let prisma: MockMediaPrisma;

  beforeEach(async () => {
    prisma = mockPrisma();
    const m: TestingModule = await Test.createTestingModule({
      providers: [MediaService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = m.get<MediaService>(MediaService);
  });

  it("create — cria nova mídia", async () => {
    const result = await service.create({
      titulo: "Test",
      tipo: "FILME",
      sinopse: "Test",
      ano_lancamento: 2024,
    });
    expect(result.titulo).toBe("Test");
    expect(result.tipo).toBe("FILME");
  });

  it("update — atualiza campos da mídia", async () => {
    await service.create({ titulo: "Old", tipo: "FILME", sinopse: "Old", ano_lancamento: 2020 });
    const result = await service.update("m1", { titulo: "Updated" });
    expect(result.titulo).toBe("Updated");
  });

  it("update — mídia inexistente lança NotFoundException", async () => {
    await expect(service.update("nonexistent", { titulo: "X" })).rejects.toThrow(NotFoundException);
  });

  it("delete — SOFT delete (marca deleted_at, nunca chama delete do prisma)", async () => {
    await service.create({ titulo: "ToDelete", tipo: "FILME", sinopse: "X", ano_lancamento: 2024 });
    const removida = await service.remove("m1");
    expect(removida.deleted_at).toBeInstanceOf(Date);
    expect(prisma.midia.delete).not.toHaveBeenCalled();
    // Segunda remoção → 404 (já soft-deletada).
    await expect(service.remove("m1")).rejects.toThrow(NotFoundException);
  });

  it("delete — mídia inexistente lança NotFoundException", async () => {
    await expect(service.remove("nonexistent")).rejects.toThrow(NotFoundException);
  });

  it("create + update + delete — fluxo completo", async () => {
    const created = await service.create({
      titulo: "Fluxo",
      tipo: "SERIE",
      sinopse: "Fluxo",
      ano_lancamento: 2024,
    });
    expect(created.id).toBeDefined();

    const updated = await service.update(created.id, { titulo: "Fluxo 2", ano_lancamento: 2025 });
    expect(updated.titulo).toBe("Fluxo 2");
    expect(updated.ano_lancamento).toBe(2025);

    await service.remove(created.id);
    await expect(service.remove(created.id)).rejects.toThrow(NotFoundException);
  });
});

function mockPrisma(): MockMediaPrisma {
  const DB: Record<string, unknown>[] = [];
  let nextId = 1;

  return {
    midia: {
      findUnique: async (args) => DB.find((m) => m.id === args.where.id) ?? null,
      findFirst: async (args) => {
        const where = args.where ?? {};
        return (
          DB.find((m) => {
            if (where.id?.not !== undefined) {
              if (m.id === where.id.not) return false;
            } else if (where.id !== undefined && m.id !== where.id) {
              return false;
            }
            if (where.fonte !== undefined && m.fonte !== where.fonte) return false;
            if (where.fonte_id !== undefined && m.fonte_id !== where.fonte_id) return false;
            if (where.deleted_at === null && m.deleted_at !== null) return false;
            return true;
          }) ?? null
        );
      },
      create: async (args) => {
        const m = {
          id: `m${nextId++}`,
          deleted_at: null,
          ...args.data,
          created_at: new Date(),
          updated_at: new Date(),
        };
        DB.push(m);
        return m;
      },
      update: async (args) => {
        const idx = DB.findIndex((m) => m.id === args.where.id);
        if (idx === -1) throw new Error("NotFound");
        const row = DB[idx];
        if (row === undefined) throw new Error("NotFound");
        Object.assign(row, args.data, { updated_at: new Date() });
        return row;
      },
      delete: vi.fn(async () => ({})),
    },
  };
}
