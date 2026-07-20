/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach } from "vitest";
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
});
