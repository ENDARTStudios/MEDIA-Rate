/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { MediaService } from "../src/modules/media/media.service.js";

function makeMocks() {
  const midias = new Map<string, Record<string, unknown>>();
  const prisma = {
    midia: {
      findFirst: async ({ where }: any) => {
        const alvos = [...midias.values()].filter((m) => {
          if (where.id?.not !== undefined) {
            if (m.id === where.id.not) return false;
          } else if (where.id !== undefined && m.id !== where.id) {
            return false;
          }
          if (where.fonte !== undefined && m.fonte !== where.fonte) return false;
          if (where.fonte_id !== undefined && m.fonte_id !== where.fonte_id) return false;
          if (where.deleted_at === null && m.deleted_at !== null) return false;
          return true;
        });
        return alvos[0] ?? null;
      },
      findUnique: async ({ where }: any) => midias.get(where.id) ?? null,
      create: async ({ data }: any) => {
        const m = { id: "m-novo", deleted_at: null, ...data };
        midias.set(m.id, m);
        return m;
      },
      update: async ({ where, data }: any) => {
        const m = midias.get(where.id);
        if (m) Object.assign(m, data);
        return m;
      },
      delete: vi.fn(async () => ({})), // NUNCA deve ser chamado (soft delete)
    },
  };
  const service = new MediaService(prisma as any);
  return { service, prisma, midias };
}

const DTO = {
  titulo: "Filme Teste",
  tipo: "FILME",
  sinopse: "sinopse",
  ano_lancamento: 2024,
  fonte: "manual",
  fonte_id: "manual",
};

describe("MediaService — CRUD admin (T215)", () => {
  let m: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    m = makeMocks();
  });

  it("create: cria e persiste", async () => {
    const r = await m.service.create(DTO as any);
    expect(r.id).toBe("m-novo");
    expect(m.midias.get("m-novo")).toBeDefined();
  });

  it("create: (fonte, fonte_id) duplicado → 409", async () => {
    m.midias.set("m1", { id: "m1", fonte: "tmdb", fonte_id: "123", deleted_at: null });
    await expect(
      m.service.create({ ...DTO, fonte: "tmdb", fonte_id: "123" } as any),
    ).rejects.toThrow(ConflictException);
  });

  it("update: parcial (só campos presentes) e mídia deletada → 404", async () => {
    m.midias.set("m1", { id: "m1", titulo: "Antes", deleted_at: null });
    const r = await m.service.update("m1", { titulo: "Depois" } as any);
    expect(r.titulo).toBe("Depois");
    await expect(m.service.update("nao-existe", { titulo: "X" } as any)).rejects.toThrow(
      NotFoundException,
    );
    m.midias.set("m2", { id: "m2", titulo: "Deletada", deleted_at: new Date() });
    await expect(m.service.update("m2", { titulo: "X" } as any)).rejects.toThrow(NotFoundException);
  });

  it("update: PUT que viola unicidade → 409", async () => {
    m.midias.set("m1", { id: "m1", fonte: "tmdb", fonte_id: "1", deleted_at: null });
    m.midias.set("m2", { id: "m2", fonte: "tmdb", fonte_id: "2", deleted_at: null });
    await expect(m.service.update("m2", { fonte_id: "1" } as any)).rejects.toThrow(
      ConflictException,
    );
  });

  it("remove: SOFT delete (deleted_at setado, delete() NUNCA chamado)", async () => {
    m.midias.set("m1", { id: "m1", titulo: "X", deleted_at: null });
    const r = await m.service.remove("m1");
    expect((m.midias.get("m1")!.deleted_at as Date).getTime()).toBeLessThanOrEqual(Date.now());
    expect(r.deleted_at).toBeInstanceOf(Date);
    expect(m.prisma.midia.delete).not.toHaveBeenCalled();
  });

  it("remove: inexistente ou já deletada → 404", async () => {
    m.midias.set("m2", { id: "m2", deleted_at: new Date() });
    await expect(m.service.remove("m2")).rejects.toThrow(NotFoundException);
    await expect(m.service.remove("nao-existe")).rejects.toThrow(NotFoundException);
  });

  it("findAtiva: só retorna mídia não deletada", async () => {
    m.midias.set("m1", { id: "m1", deleted_at: null });
    m.midias.set("m2", { id: "m2", deleted_at: new Date() });
    expect((await m.service.findAtiva("m1"))?.id).toBe("m1");
    expect(await m.service.findAtiva("m2")).toBeNull();
  });
});
