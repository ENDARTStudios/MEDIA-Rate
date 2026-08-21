/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { DashboardService } from "../src/modules/dashboard/dashboard.service.js";

const agora = new Date();

function mockPrisma(interacoes: any[]) {
  return {
    usuarioMidiaInteracao: { findMany: vi.fn(async () => interacoes) },
    $transaction: undefined as never, // aciona o fallback do comContextoRls
  };
}

describe("DashboardService (T295)", () => {
  it("FREE → módulos base (total/tipos/gêneros), sem radar gateado no payload", async () => {
    const svc = new DashboardService(mockPrisma([]) as any);
    const r = await svc.stats("u1", "FREE");
    expect(r.upgrade).toBe(false);
    expect(r.plano).toBe("FREE");
    expect(r.total).toBe(0);
    expect(r.tipos).toEqual({});
    expect(r.evolucao).toBeNull();
  });

  it("PLUS → radar (tipos/gêneros) sem evolução temporal", async () => {
    const interacoes = [
      {
        status: "CONCLUIDO",
        atualizado_em: agora,
        midia: { tipo: "FILME", generos: [{ genero: { nome: "Ficção" } }] },
      },
      {
        status: "CONSUMINDO",
        atualizado_em: agora,
        midia: { tipo: "SERIE", generos: [{ genero: { nome: "Drama" } }] },
      },
    ];
    const svc = new DashboardService(mockPrisma(interacoes) as any);
    const r = await svc.stats("u1", "PLUS");
    expect(r.upgrade).toBe(false);
    expect(r.tipos).toEqual({ FILME: 1, SERIE: 1 });
    expect(r.generos).toEqual({ Ficção: 1, Drama: 1 });
    expect(r.evolucao).toBeNull();
  });

  it("PREMIUM → radar + evolução temporal (12 meses zero-preenchidos)", async () => {
    const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
    const interacoes = [
      { status: "CONCLUIDO", atualizado_em: agora, midia: { tipo: "FILME", generos: [] } },
    ];
    const svc = new DashboardService(mockPrisma(interacoes) as any);
    const r = await svc.stats("u1", "PREMIUM");
    expect(r.evolucao).toHaveLength(12);
    expect(r.evolucao?.[11]?.mes).toBe(mesAtual);
    expect(r.evolucao?.[11]?.total).toBe(1);
    expect(r.evolucao?.[0]?.total).toBe(0);
  });
});
