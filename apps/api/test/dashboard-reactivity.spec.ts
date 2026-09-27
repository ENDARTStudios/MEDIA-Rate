/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { StatusConsumo } from "@prisma/client";
import { DashboardService } from "../src/modules/dashboard/dashboard.service.js";
import { InteracoesService } from "../src/modules/interacoes/interacoes.service.js";

/**
 * BETA-GAP-02 / T118 — reatividade da dashboard.
 *
 * Fluxo real descoberto com evidência: não existe `DELETE /interacoes`; a UI
 * "remove" mudando o status para `ABANDONADO` (estado válido e reclassificável
 * pela máquina de estados — D-528). A dashboard deve excluir `ABANDONADO` das
 * métricas de ESTADO ATUAL (`total`, `tipos`, `generos`, `streak`) e preservar
 * `ABANDONADO` em `porStatus`/Biblioteca como histórico reclassificável.
 */

const DIA_MS = 24 * 60 * 60 * 1000;

function diasAtras(dias: number): Date {
  return new Date(Date.now() - dias * DIA_MS);
}

function interacao(
  status: StatusConsumo,
  {
    tipo = "FILME",
    genero = "Drama",
    atualizado,
  }: { tipo?: string; genero?: string; atualizado?: Date } = {},
) {
  return {
    status,
    atualizado_em: atualizado ?? diasAtras(0),
    midia: {
      tipo,
      score: 80,
      generos: [{ genero: { nome: genero } }],
    },
  };
}

function mockDashboardPrisma(interacoes: any[]) {
  return {
    usuarioMidiaInteracao: { findMany: vi.fn(async () => interacoes) },
    $transaction: undefined as never, // aciona o fallback do comContextoRls
  };
}

describe("DashboardService — estado atual exclui ABANDONADO (BETA-GAP-02/T118)", () => {
  it("todos ABANDONADO → total 0, tipos/generos vazios, streak 0, concluidos 0", async () => {
    const svc = new DashboardService(
      mockDashboardPrisma([
        interacao(StatusConsumo.ABANDONADO, { tipo: "FILME", genero: "Drama" }),
        interacao(StatusConsumo.ABANDONADO, { tipo: "SERIE", genero: "Suspense" }),
      ]) as any,
    );
    const r = await svc.stats("u1", "PLUS");
    expect(r.total).toBe(0);
    expect(r.tipos).toEqual({});
    expect(r.generos).toEqual({});
    expect(r.streak).toBe(0);
    expect(r.concluidos).toBe(0);
  });

  it("mix de status → conta só os ativos (ABANDONADO fica de fora)", async () => {
    const svc = new DashboardService(
      mockDashboardPrisma([
        interacao(StatusConsumo.QUERO_CONSUMIR, {
          tipo: "FILME",
          genero: "Drama",
          atualizado: diasAtras(5),
        }),
        interacao(StatusConsumo.CONSUMINDO, {
          tipo: "SERIE",
          genero: "Suspense",
          atualizado: diasAtras(5),
        }),
        interacao(StatusConsumo.CONCLUIDO, {
          tipo: "LIVRO",
          genero: "Ficção",
          atualizado: diasAtras(5),
        }),
        // Único com atividade HOJE, mas abandonado → não entra em streak.
        interacao(StatusConsumo.ABANDONADO, {
          tipo: "GAME",
          genero: "Aventura",
          atualizado: diasAtras(0),
        }),
      ]) as any,
    );
    const r = await svc.stats("u1", "PLUS");
    expect(r.total).toBe(3);
    expect(r.concluidos).toBe(1);
    expect(r.tipos).toEqual({ FILME: 1, SERIE: 1, LIVRO: 1 });
    expect(r.generos).toEqual({ Drama: 1, Suspense: 1, Ficção: 1 });
    // Ativos só têm atividade há 5 dias → streak 0 (o ABANDONADO de hoje não conta).
    expect(r.streak).toBe(0);
  });

  it("somente CONCLUIDO → total 1, concluidos 1", async () => {
    const svc = new DashboardService(
      mockDashboardPrisma([interacao(StatusConsumo.CONCLUIDO)]) as any,
    );
    const r = await svc.stats("u1", "PLUS");
    expect(r.total).toBe(1);
    expect(r.concluidos).toBe(1);
    expect(r.tipos).toEqual({ FILME: 1 });
    expect(r.generos).toEqual({ Drama: 1 });
    expect(r.streak).toBe(1);
  });

  it("reclassificação: ABANDONADO→CONSUMINDO volta a contar (filtro, não exclusão)", async () => {
    const abandonado = new DashboardService(
      mockDashboardPrisma([interacao(StatusConsumo.ABANDONADO)]) as any,
    );
    expect((await abandonado.stats("u1", "PLUS")).total).toBe(0);

    const reclassificado = new DashboardService(
      mockDashboardPrisma([interacao(StatusConsumo.CONSUMINDO)]) as any,
    );
    const r = await reclassificado.stats("u1", "PLUS");
    expect(r.total).toBe(1);
    expect(r.tipos).toEqual({ FILME: 1 });
  });
});

describe("InteracoesService.listar — porStatus preserva ABANDONADO (não regride)", () => {
  it("porStatus da Biblioteca mantém o histórico ABANDONADO", async () => {
    const prisma = {
      usuarioMidiaInteracao: {
        findMany: vi.fn(async () => []),
        count: vi.fn(async () => 3),
        groupBy: vi.fn(async () => [
          { status: "CONCLUIDO", _count: { _all: 1 } },
          { status: "ABANDONADO", _count: { _all: 2 } },
        ]),
      },
      $transaction: undefined as never,
    };
    const svc = new InteracoesService(prisma as any);
    const r = await svc.listar("u1");
    expect(r.porStatus.ABANDONADO).toBe(2);
    expect(r.porStatus.CONCLUIDO).toBe(1);
  });
});
