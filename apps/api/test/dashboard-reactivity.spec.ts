import { describe, it, expect, vi } from "vitest";
import { DashboardService } from "../src/modules/dashboard/dashboard.service.js";

/**
 * BETA-GAP-02 (T118) - reatividade da dashboard.
 *
 * Causa raiz (evidencia): `dashboard.service.stats()` consulta
 * `usuarioMidiaInteracao.findMany({ where: { usuario_id } })` SEM filtrar
 * `deleted_at`, enquanto a remocao de interacao e SOFT DELETE
 * (`interacoes.service.ts` filtra `deleted_at: null`). Resultado: apos remover
 * tudo, total/concluidos/tipos/generos/evolucao/streak/histograma continuavam
 * contando itens removidos ("estado fantasma").
 *
 * Prova que o ESTADO ATUAL exclui registros soft-deleted. Prisma mockado
 * (convencao do repo). Fixtures sinteticas.
 */
function mockPrisma(rows: unknown[] = []) {
  const findMany = vi.fn(async () => rows);
  const prisma = {
    usuarioMidiaInteracao: { findMany, count: vi.fn(async () => rows.length) },
    $transaction: undefined as never,
  };
  return { prisma, findMany };
}

const LINHA = {
  status: "CONCLUIDO",
  atualizado_em: new Date("2026-09-20T12:00:00.000Z"),
  midia: { tipo: "movie", score: 80, generos: [{ genero: { nome: "Acao" } }] },
};

describe("BETA-GAP-02 - dashboard ignora interacoes removidas (soft delete)", () => {
  it("consulta o estado ATUAL com deleted_at: null (user-scoped)", async () => {
    const { prisma, findMany } = mockPrisma([LINHA]);
    const svc = new DashboardService(prisma as never);
    await svc.stats("u1", "PREMIUM");

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuario_id: "u1", deleted_at: null } }),
    );
  });

  it("nao amplia escopo: o filtro e por usuario", async () => {
    const { prisma, findMany } = mockPrisma([LINHA]);
    const svc = new DashboardService(prisma as never);
    await svc.stats("u2", "PREMIUM");

    const where = findMany.mock.calls[0]?.[0]?.where as Record<string, unknown>;
    expect(where.usuario_id).toBe("u2");
    expect(where).not.toHaveProperty("usuario_id", undefined);
  });

  it("metricas de estado atual refletem apenas o que a query entrega", async () => {
    const { prisma } = mockPrisma([LINHA]);
    const svc = new DashboardService(prisma as never);
    const r = await svc.stats("u1", "PREMIUM");

    expect(r.total).toBe(1);
    expect(r.concluidos).toBe(1);
    expect(r.tipos).toEqual({ movie: 1 });
    expect(r.generos).toEqual({ Acao: 1 });
  });
});
