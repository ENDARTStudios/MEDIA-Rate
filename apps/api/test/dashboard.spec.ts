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

describe("DashboardService (T295/T396/T402)", () => {
  it("FREE → base real (total/histograma/streak) SEM dados de radar/evolução (T402)", async () => {
    const svc = new DashboardService(mockPrisma([]) as any);
    const r = await svc.stats("u1", "FREE");
    expect(r.upgrade).toBe(false);
    expect(r.plano).toBe("FREE");
    expect(r.total).toBe(0);
    expect(r.tipos).toEqual({});
    expect(r.generos).toEqual({});
    expect(r.evolucao).toBeNull();
    expect(r.histograma).toHaveLength(5);
    expect(r.streak).toBe(0);
  });

  it("PLUS → radar (tipos/gêneros) + histograma, SEM evolução temporal", async () => {
    const interacoes = [
      {
        status: "CONCLUIDO",
        atualizado_em: agora,
        midia: { tipo: "FILME", score: 75, generos: [{ genero: { nome: "Ficção" } }] },
      },
      {
        status: "CONSUMINDO",
        atualizado_em: agora,
        midia: { tipo: "SERIE", score: 55, generos: [{ genero: { nome: "Drama" } }] },
      },
    ];
    const svc = new DashboardService(mockPrisma(interacoes) as any);
    const r = await svc.stats("u1", "PLUS");
    expect(r.upgrade).toBe(false);
    expect(r.tipos).toEqual({ FILME: 1, SERIE: 1 });
    expect(r.generos).toEqual({ Ficção: 1, Drama: 1 });
    expect(r.evolucao).toBeNull();
    // 75 → faixa 6-8 (idx 3); 55 → faixa 4-6 (idx 2).
    expect(r.histograma[3]?.total).toBe(1);
    expect(r.histograma[2]?.total).toBe(1);
    // 2 interações no mesmo dia → streak 1.
    expect(r.streak).toBe(1);
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
    expect(r.streak).toBe(1);
  });
});
