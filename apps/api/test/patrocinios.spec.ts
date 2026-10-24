/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { PatrociniosService } from "../src/modules/patrocinios/patrocinios.service.js";

/**
 * UAT-46 — registro público de patrocínios: leitura pública ordenada,
 * criação admin e soft delete. D-447: toda resposta serializa em JSON.
 */

const REGISTRO = {
  id: "p1",
  patrocinador: "Fulano de Tal",
  secao: "Cinema",
  rotulo: "Conteúdo patrocinado — banner Cinema",
  desde: new Date("2026-10-01T00:00:00Z"),
  removido_em: null,
};

function mockPrisma(overrides: Record<string, any> = {}) {
  return {
    patrocinio: {
      findMany: vi.fn(async () => [REGISTRO]),
      findUnique: vi.fn(async () => REGISTRO),
      create: vi.fn(async ({ data }: any) => ({ ...REGISTRO, ...data })),
      update: vi.fn(async () => ({ ...REGISTRO, removido_em: new Date() })),
    },
    $transaction: undefined as never, // aciona o fallback do comContextoRls
    ...overrides,
  };
}

describe("PatrociniosService (UAT-46)", () => {
  it("lista registro público ativo, mais recente primeiro, com data ISO curta", async () => {
    const svc = new PatrociniosService(mockPrisma() as any);
    const r = await svc.listarPublicos();
    expect(r).toHaveLength(1);
    expect(r[0].desde).toBe("2026-10-01");
    expect(JSON.parse(JSON.stringify(r))[0].patrocinador).toBe("Fulano de Tal");
  });

  it("cria registro com data de veiculação e serializa (D-447)", async () => {
    const svc = new PatrociniosService(mockPrisma() as any);
    const r = await svc.criar("admin1", {
      usuario_id: "u1",
      patrocinador: "Fulano de Tal",
      secao: "Cinema",
      rotulo: "Conteúdo patrocinado — banner Cinema",
      desde: "2026-10-01",
    });
    expect(() => JSON.stringify(r)).not.toThrow();
    expect(r.desde).toBe("2026-10-01");
  });

  it("recusa data de início inválida sem tocar o banco", async () => {
    const prisma = mockPrisma();
    const svc = new PatrociniosService(prisma as any);
    await expect(
      svc.criar("admin1", {
        patrocinador: "X",
        secao: "Y",
        rotulo: "Z",
        desde: "não-data",
      }),
    ).rejects.toThrow();
    expect(prisma.patrocinio.create).not.toHaveBeenCalled();
  });

  it("remoção é soft delete (removido_em) e não apaga o histórico", async () => {
    const prisma = mockPrisma();
    const svc = new PatrociniosService(prisma as any);
    const r = await svc.remover("admin1", "p1");
    expect(r).toEqual({ ok: true });
    expect(prisma.patrocinio.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "p1" } }),
    );
  });

  it("remoção de registro inexistente → 404 honesto", async () => {
    const prisma = mockPrisma();
    prisma.patrocinio.findUnique = vi.fn(async () => null);
    const svc = new PatrociniosService(prisma as any);
    await expect(svc.remover("admin1", "p1")).rejects.toThrow();
  });
});
