import { describe, it, expect, beforeEach } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { MediaService } from "../src/modules/media/media.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { NotFoundException } from "@nestjs/common";

describe("MediaService — escrita (unit)", () => {
  let service: MediaService;
  let prisma: any;

  beforeEach(async () => {
    prisma = mockPrisma();
    const m: TestingModule = await Test.createTestingModule({
      providers: [MediaService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = m.get<MediaService>(MediaService);
  });

  it("create — cria nova mídia", async () => {
    const result = await service.create({ titulo: "Test", tipo: "FILME", sinopse: "Test", ano_lancamento: 2024 });
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

  it("delete — remove mídia", async () => {
    await service.create({ titulo: "ToDelete", tipo: "FILME", sinopse: "X", ano_lancamento: 2024 });
    await expect(service.remove("m1")).resolves.toBeUndefined();
  });

  it("delete — mídia inexistente lança NotFoundException", async () => {
    await expect(service.remove("nonexistent")).rejects.toThrow(NotFoundException);
  });

  it("create + update + delete — fluxo completo", async () => {
    const created = await service.create({ titulo: "Fluxo", tipo: "SERIE", sinopse: "Fluxo", ano_lancamento: 2024 });
    expect(created.id).toBeDefined();

    const updated = await service.update(created.id, { titulo: "Fluxo 2", ano_lancamento: 2025 });
    expect(updated.titulo).toBe("Fluxo 2");
    expect(updated.ano_lancamento).toBe(2025);

    await service.remove(created.id);
    await expect(service.remove(created.id)).rejects.toThrow(NotFoundException);
  });
});

function mockPrisma() {
  const DB: any[] = [];
  let nextId = 1;

  return {
    midia: {
      findUnique: async (args: any) => DB.find((m) => m.id === args.where.id) ?? null,
      create: async (args: any) => {
        const m = { id: `m${nextId++}`, ...args.data, created_at: new Date(), updated_at: new Date() };
        DB.push(m);
        return m;
      },
      update: async (args: any) => {
        const idx = DB.findIndex((m) => m.id === args.where.id);
        if (idx === -1) throw new Error("NotFound");
        Object.assign(DB[idx], args.data, { updated_at: new Date() });
        return DB[idx];
      },
      delete: async (args: any) => {
        const idx = DB.findIndex((m) => m.id === args.where.id);
        if (idx === -1) throw new Error("NotFound");
        DB.splice(idx, 1);
        return {};
      },
    },
  };
}
