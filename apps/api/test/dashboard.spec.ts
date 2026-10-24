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

describe("DashboardService (T295/T396/T402 + UAT-43/44/45)", () => {
  it("FREE sem interações → base real zerada, sem radar/evolução", async () => {
    const svc = new DashboardService(mockPrisma([]) as any);
    const r = await svc.stats("u1", "FREE");
    expect(r.upgrade).toBe(false);
    expect(r.plano).toBe("FREE");
    expect(r.total).toBe(0);
    expect(r.concluidos).toBe(0);
    expect(r.tipos).toEqual({});
    expect(r.generos).toEqual({});
    expect(r.generos_por_tipo).toEqual([]);
    expect(r.evolucao).toBeNull();
    expect(r.evolucao_tipos).toBeNull();
    expect(r.histograma).toHaveLength(5);
    expect(r.streak).toBe(0);
  });

  it("FREE com interações → tipos de todos (medalhas UAT-44) + radar 12 gêneros NARRATIVOS, SEM subgênero (UAT-43)", async () => {
    const interacoes = [
      {
        status: "CONCLUIDO",
        atualizado_em: agora,
        midia: {
          tipo: "FILME",
          score: 75,
          generos: [
            { genero: { nome: "Ficção", tipo: "NARRATIVO" } },
            { genero: { nome: "Shonen", tipo: "SUBGENERO" } },
          ],
        },
      },
    ];
    const svc = new DashboardService(mockPrisma(interacoes) as any);
    const r = await svc.stats("u1", "FREE");
    expect(r.tipos).toEqual({ FILME: 1 });
    expect(r.generos).toEqual({ Ficção: 1 });
    expect(r.generos_por_tipo).toEqual([]);
  });

  it("FREE com 15 gêneros narrativos → radar corta em 12 por peso", async () => {
    const interacoes = Array.from({ length: 15 }, (_, i) => ({
      status: "CONCLUIDO",
      atualizado_em: agora,
      midia: {
        tipo: "FILME",
        score: 70,
        generos: [{ genero: { nome: `Gênero ${i}`, tipo: "NARRATIVO" } }],
      },
    }));
    const svc = new DashboardService(mockPrisma(interacoes) as any);
    const r = await svc.stats("u1", "FREE");
    expect(Object.keys(r.generos)).toHaveLength(12);
  });

  it("PLUS → gêneros COM subgênero + radar por tipo limitado a FILME/SERIE/GAME (UAT-43), SEM evolução", async () => {
    const interacoes = [
      {
        status: "CONCLUIDO",
        atualizado_em: agora,
        midia: {
          tipo: "FILME",
          score: 75,
          generos: [
            { genero: { nome: "Ficção", tipo: "NARRATIVO" } },
            { genero: { nome: "Shonen", tipo: "SUBGENERO" } },
          ],
        },
      },
      {
        status: "CONSUMINDO",
        atualizado_em: agora,
        midia: { tipo: "SERIE", score: 55, generos: [{ genero: { nome: "Drama" } }] },
      },
      {
        status: "CONCLUIDO",
        atualizado_em: agora,
        midia: { tipo: "LIVRO", score: 80, generos: [] },
      },
    ];
    const svc = new DashboardService(mockPrisma(interacoes) as any);
    const r = await svc.stats("u1", "PLUS");
    expect(r.concluidos).toBe(2);
    expect(r.tipos).toEqual({ FILME: 1, SERIE: 1, LIVRO: 1 });
    // Subgênero entra para Plus.
    expect(r.generos).toEqual({ Ficção: 1, Shonen: 1, Drama: 1 });
    // Recorte por tipo: 3 mídias do Plus, com LIVRO fora da lista.
    expect(r.generos_por_tipo.map((g) => g.tipo)).toEqual(["FILME", "SERIE", "GAME"]);
    expect(r.generos_por_tipo[0]?.generos).toEqual({ Ficção: 1, Shonen: 1 });
    expect(r.evolucao).toBeNull();
    expect(r.evolucao_tipos).toBeNull();
    // 55 → faixa 4-6 (idx 2); 75 → 6-8 (idx 3); 80 → 8-10 (idx 4).
    expect(r.histograma[2]?.total).toBe(1);
    expect(r.histograma[3]?.total).toBe(1);
    expect(r.histograma[4]?.total).toBe(1);
    expect(r.streak).toBe(1);
  });

  it("PREMIUM → radar por tipo com as 6 mídias + evolução 12m total E por tipo (UAT-45)", async () => {
    const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
    const interacoes = [
      {
        status: "CONCLUIDO",
        atualizado_em: agora,
        midia: { tipo: "FILME", generos: [{ genero: { nome: "Drama", tipo: "NARRATIVO" } }] },
      },
      {
        status: "CONSUMINDO",
        atualizado_em: agora,
        midia: { tipo: "MANGA", generos: [] },
      },
    ];
    const svc = new DashboardService(mockPrisma(interacoes) as any);
    const r = await svc.stats("u1", "PREMIUM");
    expect(r.generos_por_tipo.map((g) => g.tipo)).toEqual([
      "FILME",
      "SERIE",
      "GAME",
      "LIVRO",
      "COMIC",
      "MANGA",
    ]);
    expect(r.evolucao).toHaveLength(12);
    expect(r.evolucao?.[11]?.mes).toBe(mesAtual);
    expect(r.evolucao?.[11]?.total).toBe(2);
    expect(r.evolucao?.[0]?.total).toBe(0);
    // UAT-45: a série por tipo carrega TODAS as mídias consumidas no mês.
    expect(r.evolucao_tipos).toHaveLength(12);
    expect(r.evolucao_tipos?.[11]?.por_tipo).toEqual({ FILME: 1, MANGA: 1 });
    expect(r.streak).toBe(1);
  });

  it("resposta serializa em JSON (D-447) — sem 500 oculto de serialização", async () => {
    const interacoes = [
      {
        status: "CONCLUIDO",
        atualizado_em: agora,
        midia: {
          tipo: "FILME",
          score: 75,
          generos: [{ genero: { nome: "Ficção", tipo: "NARRATIVO" } }],
        },
      },
    ];
    const svc = new DashboardService(mockPrisma(interacoes) as any);
    for (const plano of ["FREE", "PLUS", "PREMIUM"]) {
      const r = await svc.stats("u1", plano);
      expect(() => JSON.stringify(r)).not.toThrow();
      const parsed = JSON.parse(JSON.stringify(r)) as { plano: string };
      expect(parsed.plano).toBe(plano);
    }
  });
});
