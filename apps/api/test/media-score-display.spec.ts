import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { recalcularScoreSeed } from "../prisma/seed-lib.js";

/**
 * T228 — coerência score×fontes na ficha:
 * (1) o seed grava media_score.detalhes como ARRAY com UMA entrada por
 *     avaliação real ({fonte, rating_original, rating_100}) — o frontend
 *     monta a lista FONTES a partir dele (nunca campo solto);
 * (2) num_fontes deriva da MESMA lista;
 * (3) calculado_em é refrescado a cada run (upsert update com now()).
 */

interface MockMidia {
  id: string;
  avaliacoes: { fonte: string; rating: number }[];
  score?: number;
}

function makePrisma(estado: { midia: MockMidia | null; calculadoEm?: Date }) {
  const mediaScoreUpserts: { create?: unknown; update?: unknown }[] = [];
  const midiaUpdates: { score?: number }[] = [];
  const prisma = {
    midia: {
      findUnique: vi.fn(async () => {
        if (!estado.midia) return null;
        return { id: estado.midia.id, avaliacoes: estado.midia.avaliacoes };
      }),
      update: vi.fn(async (args: { where: { id: string }; data: { score: number } }) => {
        midiaUpdates.push(args.data);
        if (estado.midia) estado.midia.score = args.data.score;
        return { id: args.where.id, ...args.data };
      }),
    },
    mediaScore: {
      upsert: vi.fn(async (args: {
        where: { midia_id: string };
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => {
        mediaScoreUpserts.push({ create: args.create, update: args.update });
        return { midia_id: args.where.midia_id, ...args.create };
      }),
    },
  };
  return { prisma, mediaScoreUpserts, midiaUpdates };
}

describe("T228 — recalcularScoreSeed: display score×fontes coerente", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("grava detalhes como ARRAY com uma entrada por avaliação (fonte + rating_100)", async () => {
    const estado = {
      midia: {
        id: "midia-1",
        avaliacoes: [
          { fonte: "tmdb", rating: 8.95 }, // escala 0-10 → ×10
          { fonte: "igdb", rating: 89 }, // escala 0-100 → ×1
        ],
      },
    };
    const { prisma, mediaScoreUpserts } = makePrisma(estado);

    const score = await recalcularScoreSeed(prisma as unknown as PrismaClient, "midia-1");

    expect(score).toBe(48.98); // média aritmética (8.95+89)/2
    const data = mediaScoreUpserts[0]!.update as Record<string, unknown>;
    const detalhes = data.detalhes as { fonte: string; rating_original: number; rating_100: number }[];
    expect(Array.isArray(detalhes)).toBe(true);
    expect(detalhes).toHaveLength(2);
    expect(detalhes[0]).toMatchObject({ fonte: "tmdb", rating_original: 8.95, rating_100: 89.5 });
    expect(detalhes[1]).toMatchObject({ fonte: "igdb", rating_original: 89, rating_100: 89 });
    expect(data.num_fontes).toBe(2);
  });

  it("num_fontes e lista vêm da MESMA fonte de verdade (avaliações reais)", async () => {
    const estado = {
      midia: {
        id: "midia-2",
        avaliacoes: [{ fonte: "tmdb", rating: 8.0 }],
      },
    };
    const { prisma, mediaScoreUpserts } = makePrisma(estado);

    await recalcularScoreSeed(prisma as unknown as PrismaClient, "midia-2");

    const data = mediaScoreUpserts[0]!.update as Record<string, unknown>;
    const detalhes = data.detalhes as { fonte: string }[];
    expect(data.num_fontes).toBe(1);
    expect(detalhes).toHaveLength(1);
    expect(detalhes[0]!.fonte).toBe("tmdb");
  });

  it("fonte sem fator de escala conhecido NÃO entra em detalhes (display nunca inventa nota)", async () => {
    const estado = {
      midia: {
        id: "midia-3",
        avaliacoes: [
          { fonte: "tmdb", rating: 8.0 },
          { fonte: "fonte_desconhecida", rating: 99 },
        ],
      },
    };
    const { prisma, mediaScoreUpserts } = makePrisma(estado);

    await recalcularScoreSeed(prisma as unknown as PrismaClient, "midia-3");

    const data = mediaScoreUpserts[0]!.update as Record<string, unknown>;
    const detalhes = data.detalhes as { fonte: string }[];
    expect(detalhes).toHaveLength(1);
    expect(detalhes[0]!.fonte).toBe("tmdb");
  });

  it("re-run refresca calculado_em (ficha nunca mostra data stale)", async () => {
    const estado = {
      midia: { id: "midia-4", avaliacoes: [{ fonte: "tmdb", rating: 8.0 }] },
    };
    const { prisma, mediaScoreUpserts } = makePrisma(estado);

    await recalcularScoreSeed(prisma as unknown as PrismaClient, "midia-4");
    const primeiro = mediaScoreUpserts[0]!.update as { calculado_em: Date };
    expect(primeiro.calculado_em).toBeInstanceOf(Date);

    // Simula re-run após 1h.
    await new Promise((r) => setTimeout(r, 5));
    await recalcularScoreSeed(prisma as unknown as PrismaClient, "midia-4");
    const segundo = mediaScoreUpserts[1]!.update as { calculado_em: Date };
    expect(segundo.calculado_em).toBeInstanceOf(Date);
    expect(segundo.calculado_em.getTime()).toBeGreaterThanOrEqual(primeiro.calculado_em.getTime());
    // O update SEMPRE carrega calculado_em (nunca omite → stale).
    expect(mediaScoreUpserts[1]!.update).toHaveProperty("calculado_em");
  });

  it("sem avaliações: prior 7.0, num_fontes 0, detalhes [] (display: 'Sem avaliações suficientes')", async () => {
    const estado = { midia: { id: "midia-5", avaliacoes: [] } };
    const { prisma, mediaScoreUpserts } = makePrisma(estado);

    const score = await recalcularScoreSeed(prisma as unknown as PrismaClient, "midia-5");

    expect(score).toBe(7);
    const data = mediaScoreUpserts[0]!.update as Record<string, unknown>;
    expect(data.num_fontes).toBe(0);
    expect(data.detalhes).toEqual([]);
  });
});
