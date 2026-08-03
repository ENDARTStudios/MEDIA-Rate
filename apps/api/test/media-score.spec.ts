/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MediaScoreService } from "../src/modules/media-score/media-score.service.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";

describe("MediaScoreService (T4.7)", () => {
  let svc: MediaScoreService;

  beforeEach(() => {
    const mockPrisma = {} as PrismaService;
    svc = new MediaScoreService(mockPrisma);
  });

  describe("calcularScore() — algoritmo z-score + pesos + clipping", () => {
    it("score neutro (50) quando não há avaliações", () => {
      const result = svc.calcularScore("FILME", []);
      expect(result.score).toBe(50);
      expect(result.num_fontes).toBe(0);
      expect(result.confianca).toBe(0);
      expect(result.detalhes).toEqual([]);
    });

    it("score aumenta quando rating > média da fonte (z positivo)", () => {
      const result = svc.calcularScore("FILME", [
        { fonte: "omdb", rating: 9.0, media_fonte: 7.0, desvio_fonte: 1.0 },
        { fonte: "tmdb", rating: 9.0, media_fonte: 7.0, desvio_fonte: 1.0 },
        { fonte: "metacritic", rating: 90, media_fonte: 70, desvio_fonte: 10 },
      ]);
      // z = 2.0 para todas as 3 fontes
      // zMedio = 2.0
      // score = 50 + 2.0 * 25 = 100 (clipped)
      expect(result.score).toBe(100);
      expect(result.num_fontes).toBe(3);
      expect(result.confianca).toBeGreaterThan(0.8);
    });

    it("score diminui quando rating < média da fonte (z negativo)", () => {
      const result = svc.calcularScore("FILME", [
        { fonte: "omdb", rating: 5.0, media_fonte: 7.0, desvio_fonte: 1.0 },
        { fonte: "tmdb", rating: 5.0, media_fonte: 7.0, desvio_fonte: 1.0 },
        { fonte: "metacritic", rating: 50, media_fonte: 70, desvio_fonte: 10 },
      ]);
      // z = -2.0 para todas
      // zMedio = -2.0
      // score = 50 + (-2.0) * 25 = 0 (clipped)
      expect(result.score).toBe(0);
      expect(result.num_fontes).toBe(3);
    });

    it("clipping em [0, 100] — z extremo não passa do limite", () => {
      const result = svc.calcularScore("FILME", [
        { fonte: "omdb", rating: 100, media_fonte: 5, desvio_fonte: 0.1 }, // z=950
        { fonte: "tmdb", rating: 100, media_fonte: 5, desvio_fonte: 0.1 },
        { fonte: "metacritic", rating: 100, media_fonte: 5, desvio_fonte: 0.1 },
      ]);
      expect(result.score).toBe(100); // clipped
    });

    it("pesos aplicados corretamente — filme usa omdb:0.3, tmdb:0.4, metacritic:0.3", () => {
      const result = svc.calcularScore("FILME", [
        { fonte: "omdb", rating: 8, media_fonte: 6, desvio_fonte: 1 }, // z=2, contrib=0.6
        { fonte: "tmdb", rating: 7, media_fonte: 6, desvio_fonte: 1 }, // z=1, contrib=0.4
        { fonte: "metacritic", rating: 60, media_fonte: 50, desvio_fonte: 10 }, // z=1, contrib=0.3
      ]);
      // somaPonderada = 0.6 + 0.4 + 0.3 = 1.3
      // somaPesos = 0.3 + 0.4 + 0.3 = 1.0
      // zMedio = 1.3
      // score = 50 + 1.3 * 25 = 82.5
      expect(result.score).toBe(82.5);
      expect(result.pesos_usados).toEqual({
        omdb: 0.3,
        tmdb: 0.4,
        metacritic: 0.3,
      });
    });

    it("games usam pesos diferentes (igdb:0.5, rawg:0.5)", () => {
      const result = svc.calcularScore("GAME", [
        { fonte: "igdb", rating: 90, media_fonte: 70, desvio_fonte: 10 }, // z=2
        { fonte: "rawg", rating: 80, media_fonte: 70, desvio_fonte: 10 }, // z=1
      ]);
      // somaPonderada = 2*0.5 + 1*0.5 = 1.5
      // somaPesos = 1.0
      // zMedio = 1.5
      // score = 50 + 1.5*25 = 87.5
      expect(result.score).toBe(87.5);
      expect(result.pesos_usados).toEqual({
        igdb: 0.5,
        rawg: 0.5,
      });
    });

    it("livros usam openlibrary:0.6, goodreads:0.4", () => {
      const result = svc.calcularScore("LIVRO", [
        { fonte: "openlibrary", rating: 5, media_fonte: 3, desvio_fonte: 1 }, // z=2
        { fonte: "goodreads", rating: 4, media_fonte: 3, desvio_fonte: 1 }, // z=1
      ]);
      // somaPonderada = 2*0.6 + 1*0.4 = 1.6
      // somaPesos = 1.0
      // zMedio = 1.6
      // score = 50 + 1.6*25 = 90
      expect(result.score).toBe(90);
    });

    it("fonte sem peso para o tipo é ignorada", () => {
      const result = svc.calcularScore("GAME", [
        { fonte: "omdb", rating: 9, media_fonte: 5, desvio_fonte: 1 }, // sem peso para GAME
        { fonte: "igdb", rating: 8, media_fonte: 6, desvio_fonte: 1 }, // z=2
      ]);
      expect(result.num_fontes).toBe(1); // só igdb
      expect(result.detalhes).toHaveLength(1);
      expect(result.detalhes[0]!.fonte).toBe("igdb");
    });

    it("desvio_fonte = 0 trata como desvio 1 (evita divisão por zero)", () => {
      const result = svc.calcularScore("FILME", [
        { fonte: "omdb", rating: 7, media_fonte: 7, desvio_fonte: 0 },
      ]);
      // z = (7-7)/1 = 0, score = 50
      expect(result.score).toBe(50);
    });

    it("confiança: 1 fonte = 0.3, 2 fontes = 0.6, 3+ = 0.9", () => {
      const r1 = svc.calcularScore("FILME", [
        { fonte: "omdb", rating: 7, media_fonte: 7, desvio_fonte: 1 },
      ]);
      expect(r1.confianca).toBe(0.3);

      const r2 = svc.calcularScore("FILME", [
        { fonte: "omdb", rating: 7, media_fonte: 7, desvio_fonte: 1 },
        { fonte: "tmdb", rating: 7, media_fonte: 7, desvio_fonte: 1 },
      ]);
      expect(r2.confianca).toBe(0.6);

      const r3 = svc.calcularScore("FILME", [
        { fonte: "omdb", rating: 7, media_fonte: 7, desvio_fonte: 1 },
        { fonte: "tmdb", rating: 7, media_fonte: 7, desvio_fonte: 1 },
        { fonte: "metacritic", rating: 70, media_fonte: 70, desvio_fonte: 10 },
      ]);
      expect(r3.confianca).toBe(0.9);
    });

    it("confiança penalizada se z-scores divergem muito entre fontes", () => {
      const result = svc.calcularScore("FILME", [
        { fonte: "omdb", rating: 9, media_fonte: 5, desvio_fonte: 1 }, // z=4
        { fonte: "tmdb", rating: 1, media_fonte: 5, desvio_fonte: 1 }, // z=-4
        { fonte: "metacritic", rating: 50, media_fonte: 50, desvio_fonte: 10 }, // z=0
      ]);
      // stdDev alto (>1.5) → penalização 30% → confianca = 0.9 * 0.7 = 0.63
      expect(result.confianca).toBeLessThan(0.7);
      expect(result.confianca).toBeGreaterThanOrEqual(0.6);
    });

    it("detalhes incluem z_score, peso e contribuição por fonte", () => {
      const result = svc.calcularScore("FILME", [
        { fonte: "omdb", rating: 8, media_fonte: 6, desvio_fonte: 1 },
        { fonte: "tmdb", rating: 7, media_fonte: 6, desvio_fonte: 1 },
      ]);
      expect(result.detalhes).toHaveLength(2);
      const omdb = result.detalhes.find((d) => d.fonte === "omdb");
      expect(omdb).toBeDefined();
      expect(omdb!.z_score).toBe(2);
      expect(omdb!.peso).toBe(0.3);
      expect(omdb!.contribuicao).toBe(0.6);
      expect(omdb!.rating_original).toBe(8);
    });

    it("score tem 1 casa decimal (arredondado)", () => {
      const result = svc.calcularScore("FILME", [
        { fonte: "omdb", rating: 7.5, media_fonte: 6, desvio_fonte: 1 }, // z=1.5
        { fonte: "tmdb", rating: 7, media_fonte: 6, desvio_fonte: 1 }, // z=1
      ]);
      // somaPonderada = 1.5*0.3 + 1*0.4 = 0.85
      // somaPesos = 0.7
      // zMedio = 0.85/0.7 = 1.2142857...
      // score = 50 + 1.2143*25 = 80.357 → 80.4
      expect(result.score).toBe(80.4);
    });
  });

  describe("calcularScoreV2() — classificação Crítica vs Público (CRIT-02)", () => {
    it("Zelda BotW: crítica (metacritic 97 + igdb 92) vs público (igdb 85 + rawg + steam)", () => {
      const result = svc.calcularScoreV2("GAME", [
        // crítica
        { fonte: "metacritic", rating: 97, media_fonte: 70, desvio_fonte: 15 }, // z=1.8, peso 0.2
        { fonte: "igdb", rating: 92, media_fonte: 70, desvio_fonte: 15 }, // z=1.4667, peso 0.5
        // público
        { fonte: "igdb_publico", rating: 85, media_fonte: 70, desvio_fonte: 15 }, // z=1.0, peso 0.25
        { fonte: "rawg", rating: 4.5, media_fonte: 3.5, desvio_fonte: 0.6 }, // z=1.6667, peso 0.35
        { fonte: "steam", rating: 0.9, media_fonte: 0.75, desvio_fonte: 0.2 }, // z=0.75, peso 0.15
      ]);
      // crítica: zMedio = (1.8*0.2 + 1.4667*0.5)/0.7 = 1.5619 → 50+1.5619*25 = 89.0
      expect(result.criticosScore).toBe(89);
      // público: zMedio = (1.0*0.25 + 1.6667*0.35 + 0.75*0.15)/0.75 = 1.2611 → 50+1.2611*25 = 81.5
      expect(result.publicoScore).toBe(81.5);
      expect(result.consenso).toBe(7.5); // |89.0 - 81.5|
      expect(result.score).toBe(85.3); // 0.5*89 + 0.5*81.5
      expect(result.num_fontes).toBe(5);
      expect(result.confianca).toBe(0.9);
    });

    it("só crítica: publicoScore null e score = crítica; consenso null", () => {
      const result = svc.calcularScoreV2("FILME", [
        { fonte: "metacritic", rating: 90, media_fonte: 70, desvio_fonte: 15 }, // z=1.3333
        { fonte: "rottentomatoes", rating: 80, media_fonte: 70, desvio_fonte: 15 }, // z=0.6667
      ]);
      // zMedio = (1.3333*0.6 + 0.6667*0.4)/1.0 = 1.0667 → 50+26.67 = 76.7
      expect(result.criticosScore).toBe(76.7);
      expect(result.publicoScore).toBeNull();
      expect(result.consenso).toBeNull();
      expect(result.score).toBe(76.7);
    });

    it("normaliza rating para 0–100 (fator da escala)", () => {
      const result = svc.calcularScoreV2("FILME", [
        { fonte: "tmdb", rating: 8.0, media_fonte: 7.0, desvio_fonte: 1.5 }, // 0-10 → ×10
      ]);
      const tmdb = result.detalhes.find((d) => d.fonte === "tmdb");
      expect(tmdb).toBeDefined();
      expect(tmdb!.rating_100).toBe(80);
      expect(tmdb!.classificacao).toBe("publico");
      expect(result.publicoScore).not.toBeNull();
    });

    it("SERIE usa tvmaze no bucket público", () => {
      const result = svc.calcularScoreV2("SERIE", [
        { fonte: "tmdb", rating: 8.0, media_fonte: 7.0, desvio_fonte: 1.5 }, // z=0.6667, peso 0.3
        { fonte: "tvmaze", rating: 9.0, media_fonte: 7.0, desvio_fonte: 1.5 }, // z=1.3333, peso 0.25
      ]);
      const tvmaze = result.detalhes.find((d) => d.fonte === "tvmaze");
      expect(tvmaze).toBeDefined();
      expect(tvmaze!.classificacao).toBe("publico");
      // zMedio = (0.6667*0.3 + 1.3333*0.25)/0.55 = 0.9697 → 74.2
      expect(result.publicoScore).toBe(74.2);
    });

    it("fonte fora do registro é ignorada (score neutro 50)", () => {
      const result = svc.calcularScoreV2("FILME", [
        { fonte: "fonte_inventada", rating: 99, media_fonte: 50, desvio_fonte: 10 },
      ]);
      expect(result.num_fontes).toBe(0);
      expect(result.score).toBe(50);
      expect(result.detalhes).toEqual([]);
      expect(result.confianca).toBe(0);
    });

    it("fonte de outro domínio sem peso para o tipo é ignorada", () => {
      const result = svc.calcularScoreV2("LIVRO", [
        { fonte: "igdb", rating: 90, media_fonte: 70, desvio_fonte: 15 }, // peso só em GAME
      ]);
      expect(result.num_fontes).toBe(0);
    });
  });

  describe("recalcularEPersistir() — v2 com upsert (T4.7 + coleta admin)", () => {
    function mockPrisma(avaliacoes: unknown[], existingScore?: unknown) {
      const upsert = vi.fn().mockResolvedValue({});
      const prisma = {
        midia: {
          findUnique: vi.fn().mockResolvedValue({
            id: "m1",
            tipo: "GAME",
            avaliacoes,
            scores: existingScore ? [{ ...existingScore }] : [],
          }),
        },
        mediaScore: { upsert },
      };
      return { prisma, upsert };
    }

    it("retorna null quando mídia não existe", async () => {
      const { prisma } = mockPrisma([]);
      prisma.midia.findUnique.mockResolvedValue(null);
      const service = new MediaScoreService(prisma as unknown as PrismaService);
      expect(await service.recalcularEPersistir("m1")).toBeNull();
    });

    it("recalcula a partir das avaliações persistidas e faz upsert com campos v2", async () => {
      const { prisma, upsert } = mockPrisma([
        { fonte: "igdb", rating: 92, media_fonte: 70, desvio_fonte: 15 },
        { fonte: "igdb_publico", rating: 85, media_fonte: 70, desvio_fonte: 15 },
      ]);
      const service = new MediaScoreService(prisma as unknown as PrismaService);
      const result = await service.recalcularEPersistir("m1");

      expect(result).not.toBeNull();
      expect(result!.criticosScore).toBeDefined();
      expect(result!.publicoScore).toBeDefined();
      expect(result!.calculado_em).toBeInstanceOf(Date);

      const call = upsert.mock.calls[0]![0];
      expect(call.where).toEqual({ midia_id: "m1" });
      expect(call.create.midia_id).toBe("m1");
      expect(call.update.score_critica).toBe(result!.criticosScore);
      expect(call.update.score_publico).toBe(result!.publicoScore);
      expect(call.update.consenso).toBe(result!.consenso);
      expect(call.update.confianca).toBe(result!.confianca);
      expect(call.update.detalhes).toHaveLength(2);
      expect(call.update.num_fontes).toBe(2);
    });

    it("sem avaliações → upsert neutro (score 50, num_fontes 0)", async () => {
      const { prisma, upsert } = mockPrisma([]);
      const service = new MediaScoreService(prisma as unknown as PrismaService);
      const result = await service.recalcularEPersistir("m1");

      expect(result).not.toBeNull();
      expect(result!.score).toBe(50);
      expect(result!.num_fontes).toBe(0);
      expect(result!.criticosScore).toBeNull();
      expect(result!.publicoScore).toBeNull();

      const call = upsert.mock.calls[0]![0];
      expect(call.update.score).toBe(50);
      expect(call.update.num_fontes).toBe(0);
      expect(call.update.detalhes).toEqual([]);
    });

    it("fonte fora do registro nas avaliações persistidas é ignorada", async () => {
      const { prisma, upsert } = mockPrisma([
        { fonte: "fonte_inventada", rating: 99, media_fonte: 50, desvio_fonte: 10 },
      ]);
      const service = new MediaScoreService(prisma as unknown as PrismaService);
      const result = await service.recalcularEPersistir("m1");

      expect(result!.num_fontes).toBe(0);
      expect(result!.score).toBe(50);
      expect(upsert.mock.calls[0]![0].update.num_fontes).toBe(0);
    });
  });
});
