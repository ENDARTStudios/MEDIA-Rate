import { describe, it, expect, vi, beforeEach } from "vitest";
import { LgpdPurgeService } from "../src/modules/lgpd/lgpd-purge.service.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";

/**
 * T156/J-002-A — worker de eliminação definitiva pós-carenência LGPD (P0-02).
 *
 * O mock NÃO define $transaction → comContextoRls cai no fallback de execução
 * direta (contrato do helper), isolando o comportamento do worker.
 */
function criarServico() {
  const prisma = {
    usuario: {
      findMany: vi.fn(),
      delete: vi.fn(),
    },
  };
  const service = new LgpdPurgeService(prisma as unknown as PrismaService);
  return { service, prisma };
}

describe("LgpdPurgeService (T156/J-002-A)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("purga somente os expirados: lote completo, delete por id, sumário correto", async () => {
    const { service, prisma } = criarServico();
    prisma.usuario.findMany.mockResolvedValue([{ id: "u1" }, { id: "u2" }]);
    prisma.usuario.delete.mockResolvedValue({ id: "u1" });

    const resultado = await service.purgeExpirados();

    expect(resultado).toEqual({ verificados: 2, purgados: 2, falhas: 0 });
    // Seleção: apenas carência expirada, mais antigos primeiro, lote padrão.
    const args = prisma.usuario.findMany.mock.calls[0][0];
    expect(args.where.dados_para_exclusao_at.lte).toBeInstanceOf(Date);
    expect(args.orderBy).toEqual({ dados_para_exclusao_at: "asc" });
    expect(args.take).toBe(100);
    // Delete individual dentro do contexto RLS do próprio usuário.
    expect(prisma.usuario.delete).toHaveBeenCalledTimes(2);
    expect(prisma.usuario.delete).toHaveBeenNthCalledWith(1, { where: { id: "u1" } });
    expect(prisma.usuario.delete).toHaveBeenNthCalledWith(2, { where: { id: "u2" } });
  });

  it("respeita o limite de lote informado", async () => {
    const { service, prisma } = criarServico();
    prisma.usuario.findMany.mockResolvedValue([]);
    await service.purgeExpirados(5);
    expect(prisma.usuario.findMany.mock.calls[0][0].take).toBe(5);
  });

  it("falha isolada não aborta o lote (idempotente na execução seguinte)", async () => {
    const { service, prisma } = criarServico();
    prisma.usuario.findMany.mockResolvedValue([{ id: "u-erro" }, { id: "u-ok" }]);
    prisma.usuario.delete.mockRejectedValueOnce(new Error("FK constraint"));
    prisma.usuario.delete.mockResolvedValueOnce({ id: "u-ok" });

    const resultado = await service.purgeExpirados();

    expect(resultado).toEqual({ verificados: 2, purgados: 1, falhas: 1 });
    expect(prisma.usuario.delete).toHaveBeenCalledTimes(2);
  });

  it("lote vazio: nada a fazer", async () => {
    const { service, prisma } = criarServico();
    prisma.usuario.findMany.mockResolvedValue([]);
    const resultado = await service.purgeExpirados();
    expect(resultado).toEqual({ verificados: 0, purgados: 0, falhas: 0 });
    expect(prisma.usuario.delete).not.toHaveBeenCalled();
  });
});
