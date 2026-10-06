/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { MediaService } from "../src/modules/media/media.service.js";

/**
 * T162 (Onda A — Rankings): GET /api/v1/midias/top?tipo=FILME
 * — TOP por MEDIA Score (gate de >= 2 fontes com fallback para >= 1),
 * lancamentos do ano corrente, franquias ("por onde começar", >= 2 midias
 * ativas do tipo, ordenadas por ordem_cronologica ?? ordem_lancamento)
 * e generos com contagem por tipo.
 */

function makeMidia(
  id: string,
  score: number | null,
  numFontes = 1,
  extras: Record<string, unknown> = {},
) {
  return {
    id,
    slug: `slug-${id}`,
    titulo: `Título ${id}`,
    titulo_original: null,
    titulo_en: null,
    titulo_es: null,
    tipo: "FILME",
    ano_lancamento: 2024,
    imagem_url: `https://img/${id}.jpg`,
    score,
    scores: [{ num_fontes: numFontes }],
    ...extras,
  };
}

function makeMocks(
  dados: {
    gate?: any[];
    fallback?: any[];
    lancamentos?: any[];
    generos?: any[];
    franquias?: any[];
  } = {},
) {
  const chamadasMidia: any[] = [];
  const prisma = {
    midia: {
      findMany: vi.fn(async (args: any) => {
        chamadasMidia.push(args);
        const where = args?.where ?? {};
        if (where.scores?.some?.num_fontes) return dados.gate ?? [];
        if (where.ano_lancamento !== undefined) return dados.lancamentos ?? [];
        return dados.fallback ?? [];
      }),
    },
    genero: {
      findMany: vi.fn(async () => dados.generos ?? []),
    },
    franquia: {
      findMany: vi.fn(async () => dados.franquias ?? []),
    },
  };
  const service = new MediaService(prisma as any);
  return { service, prisma, chamadasMidia };
}

describe("MediaService.topPorTipo (T162 — rankings por tipo)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ranking usa gate de >= 2 fontes, ordena por score desc (nulos por ultimo) e respeita o limite", async () => {
    const m = makeMocks({
      gate: [makeMidia("a", 92, 3), makeMidia("b", 88, 2)],
    });
    const payload = await m.service.topPorTipo("FILME");
    expect(payload.tipo).toBe("FILME");
    expect(payload.top).toHaveLength(2);
    expect(payload.top[0]).toMatchObject({ id: "a", num_fontes: 3, score: 92 });
    const primeira = m.chamadasMidia[0];
    expect(primeira.where).toMatchObject({
      deleted_at: null,
      tipo: "FILME",
      score: { not: null },
    });
    expect(primeira.where.scores.some.num_fontes).toEqual({ gte: 2 });
    expect(primeira.orderBy).toEqual({ score: { sort: "desc", nulls: "last" } });
    expect(primeira.take).toBe(10);
  });

  it("fallback para >= 1 fonte quando o gate devolve menos que o limite, sem duplicar", async () => {
    const m = makeMocks({
      gate: [makeMidia("a", 92, 3), makeMidia("b", 88, 2)],
      fallback: [
        makeMidia("a", 92, 3),
        makeMidia("b", 88, 2),
        makeMidia("c", 80, 1),
        makeMidia("d", 70, 1),
      ],
    });
    const payload = await m.service.topPorTipo("FILME");
    expect(payload.top.map((i: any) => i.id)).toEqual(["a", "b", "c", "d"]);
    // Segunda consulta (fallback) sem gate de fontes.
    expect(m.chamadasMidia[1].where.scores).toBeUndefined();
  });

  it("lancamentos do ano: where por tipo + ano, ordenado por score, default = ano corrente", async () => {
    const m = makeMocks({
      gate: [makeMidia("a", 92, 3)],
      lancamentos: [makeMidia("l1", 75, 2)],
    });
    const payload = await m.service.topPorTipo("FILME");
    expect(payload.lancamentos_ano).toHaveLength(1);
    const chamadaLanc = m.chamadasMidia.find((c) => c.where.ano_lancamento !== undefined);
    expect(chamadaLanc.where).toMatchObject({
      tipo: "FILME",
      deleted_at: null,
      score: { not: null },
      ano_lancamento: new Date().getFullYear(),
    });
  });

  it("tipo invalido rejeita com BadRequest; alias ANIME -> MANGA e HQ -> COMIC", async () => {
    const m = makeMocks({ gate: [] });
    await expect(m.service.topPorTipo("PODCAST")).rejects.toBeInstanceOf(BadRequestException);
    await m.service.topPorTipo("ANIME");
    await m.service.topPorTipo("HQ");
    // Cada chamada gera gate + fallback + lancamentos: filtrar as de gate.
    const gates = m.chamadasMidia.filter((c) => c.where.scores?.some?.num_fontes);
    expect(gates).toHaveLength(2);
    expect(gates[0].where.tipo).toBe("MANGA");
    expect(gates[1].where.tipo).toBe("COMIC");
  });

  it("franquias: so com >= 2 midias ativas do tipo; itens com ordens e resumo", async () => {
    const m = makeMocks({
      gate: [makeMidia("a", 92, 3)],
      franquias: [
        {
          id: "f1",
          nome: "O Senhor dos Anéis",
          slug: "o-senhor-dos-aneis",
          midias: [
            { ordem_cronologica: 2, ordem_lancamento: 2, midia: makeMidia("m2", 80) },
            { ordem_cronologica: 1, ordem_lancamento: 1, midia: makeMidia("m1", 85) },
          ],
        },
        {
          id: "f2",
          nome: "Franquia solitária",
          slug: "solitaria",
          midias: [{ ordem_cronologica: null, ordem_lancamento: 1, midia: makeMidia("m3", 70) }],
        },
      ],
    });
    const payload = await m.service.topPorTipo("FILME");
    expect(payload.franquias).toHaveLength(1);
    expect(payload.franquias[0].nome).toBe("O Senhor dos Anéis");
    expect(payload.franquias[0].itens).toHaveLength(2);
    expect(payload.franquias[0].itens[0]).toMatchObject({
      id: "m2",
      ordens: { cronologica: 2, lancamento: 2 },
    });
  });

  it("generos com contagem por tipo (mapeada de _count filtrado)", async () => {
    const m = makeMocks({
      gate: [makeMidia("a", 92, 3)],
      generos: [
        { id: 1, nome: "Ação", slug: "acao", _count: { midias: 42 } },
        { id: 2, nome: "Drama", slug: "drama", _count: { midias: 17 } },
      ],
    });
    const payload = await m.service.topPorTipo("FILME");
    expect(payload.generos).toEqual([
      { id: 1, nome: "Ação", slug: "acao", total_midias: 42 },
      { id: 2, nome: "Drama", slug: "drama", total_midias: 17 },
    ]);
  });

  it("limite clamped 1..20 e payload serializa com JSON.stringify (D-447)", async () => {
    const m = makeMocks({ gate: [makeMidia("a", 92, 3)] });
    await m.service.topPorTipo("FILME", 99);
    expect(m.chamadasMidia[0].take).toBe(20);
    const payload = await m.service.topPorTipo("FILME", 5);
    expect(() => JSON.stringify(payload)).not.toThrow();
    expect(payload.top).toHaveLength(1);
  });
});
