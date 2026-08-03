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

  describe("calcularScoreV3() — estimador Bayesiano por mídia (MET-03)", () => {
    it("Zelda BotW GAME: S ponderado + pull Bayesiano + CS 0–100", () => {
      const result = svc.calcularScoreV3(
        "GAME",
        [
          // crítica
          { fonte: "metacritic", rating: 97, media_fonte: 70, desvio_fonte: 15 }, // z=1.8, peso 0.2
          { fonte: "igdb", rating: 92, media_fonte: 70, desvio_fonte: 15 }, // z=1.4667, peso 0.5
          // público
          { fonte: "igdb_publico", rating: 85, media_fonte: 70, desvio_fonte: 15 }, // z=1.0, peso 0.35
          { fonte: "steam", rating: 0.9, media_fonte: 0.75, desvio_fonte: 0.2 }, // z=0.75, peso 0.25
        ],
        { votosTotal: 1300, mediaCatalogo: 70 },
      );
      expect(result.criticosScore).toBe(89);
      expect(result.publicoScore).toBe(72.4);
      expect(result.consenso).toBe(16.6); // gap informativo
      expect(result.indiceConsenso).toBe(83.4); // I = 100 − 16.6 — REALIMENTA
      // S = 0.55·89 + 0.35·72.4 + 0.1·83.4 = 82.63
      expect(result.s).toBe(82.6);
      // MEDIA = (1300/2315)·82.63 + (1015/2315)·70 = 77.1
      expect(result.score).toBe(77.1);
      expect(result.votosTotal).toBe(1300);
      expect(result.c).toBe(70);
      expect(result.num_fontes).toBe(4);
      // CS = 40·min(1,4/5) + 30·min(1,1300/1015) + 20·(1−std/2.5) + 0 = 79
      expect(result.confianca).toBe(79);
    });

    it("v=0 sem dados de votos → score = S (pull Bayesiano exige votos)", () => {
      const result = svc.calcularScoreV3(
        "FILME",
        [{ fonte: "tmdb", rating: 8.0, media_fonte: 7.0, desvio_fonte: 1.5 }],
        { mediaCatalogo: 70 },
      );
      expect(result.publicoScore).toBe(66.7);
      expect(result.score).toBe(66.7); // v=0 → S direto (anti-colapso do catálogo)
      expect(result.s).toBe(66.7);
    });

    it("v alto reflete as fontes (S domina o pull)", () => {
      const result = svc.calcularScoreV3(
        "FILME",
        [{ fonte: "tmdb", rating: 8.0, media_fonte: 7.0, desvio_fonte: 1.5 }], // z=0.6667 → 66.7
        { votosTotal: 1000, mediaCatalogo: 70 },
      );
      // S renorm (só público) = 66.7 → (1000/1060)·66.7 + (60/1060)·70 = 66.9
      expect(result.score).toBe(66.9);
    });

    it("LIVRO: curva de inflação ativa quando C > 85 (80 → 70, 90 → 75)", () => {
      const base = [
        { fonte: "goodreads", rating: 4.2, media_fonte: 3.8, desvio_fonte: 0.5 }, // ×20 → z=0.8 → 70
      ];
      const inflado = svc.calcularScoreV3("LIVRO", base, { votosTotal: 500, mediaCatalogo: 90 });
      // S=70 → curva min(70, 65) = 65 → (500/600)·65 + (100/600)·90 = 69.2
      expect(inflado.score).toBe(69.2);

      const normal = svc.calcularScoreV3("LIVRO", base, { votosTotal: 500, mediaCatalogo: 84 });
      // C ≤ 85 → S=70 → (500/600)·70 + (100/600)·84 = 72.3
      expect(normal.score).toBe(72.3);
    });

    it("ANIME: polarização bimodal penaliza o consenso", () => {
      const fontes = [
        { fonte: "jikan", rating: 9.0, media_fonte: 7.5, desvio_fonte: 1.0 }, // z=1.5 → 87.5
        { fonte: "anilist", rating: 90, media_fonte: 75, desvio_fonte: 10 }, // z=1.5 → 87.5
      ];
      const bimodal = svc.calcularScoreV3("ANIME", fontes, {
        votosTotal: 800,
        mediaCatalogo: 70,
        distribuicaoNotas: [
          { nota: 1, votos: 400 },
          { nota: 10, votos: 600 },
        ],
      });
      expect(bimodal.indiceConsenso).toBe(0); // 100% extremas → I=0
      // S = (0.45·87.5 + 0.1·0)/0.55 = 71.6 → (800/1300)·71.6 + (500/1300)·70 = 71.0
      expect(bimodal.s).toBe(71.6);
      expect(bimodal.score).toBe(71.0);

      const centrada = svc.calcularScoreV3("ANIME", fontes, {
        votosTotal: 800,
        mediaCatalogo: 70,
        distribuicaoNotas: [
          { nota: 5, votos: 500 },
          { nota: 6, votos: 500 },
        ],
      });
      expect(centrada.indiceConsenso).toBe(100);
      // S = (0.45·87.5 + 0.1·100)/0.55 = 89.8 → (800/1300)·89.8 + (500/1300)·70 = 82.2
      expect(centrada.s).toBe(89.8);
      expect(centrada.score).toBe(82.2);

      const semDistribuicao = svc.calcularScoreV3("ANIME", fontes, {
        votosTotal: 800,
        mediaCatalogo: 70,
      });
      // sem distribuição: sem crítica → I null → S = público puro
      expect(semDistribuicao.indiceConsenso).toBeNull();
      expect(semDistribuicao.s).toBe(87.5);
      expect(semDistribuicao.score).toBe(80.8);
    });

    it("HQ: consenso entre editoras substitui a crítica", () => {
      const fontes = [
        { fonte: "comicvine", rating: 9, media_fonte: 8, desvio_fonte: 1 }, // z=1 → 75
      ];
      const divergente = svc.calcularScoreV3("HQ", fontes, {
        votosTotal: 500,
        mediaCatalogo: 70,
        mediaPorEditora: [
          { editora: "Marvel", media: 8 },
          { editora: "DC", media: 5 },
        ],
      });
      // I = 1 − min(1, 1.5/2.5) = 0.4 → 40 (0–100) → S = 0.6·75 + 0.4·40 = 61
      expect(divergente.indiceConsenso).toBe(40);
      expect(divergente.s).toBe(61);
      expect(divergente.score).toBe(64); // (500/750)·61 + (250/750)·70

      const convergente = svc.calcularScoreV3("HQ", fontes, {
        votosTotal: 500,
        mediaCatalogo: 70,
        mediaPorEditora: [
          { editora: "Marvel", media: 8 },
          { editora: "DC", media: 8 },
        ],
      });
      expect(convergente.indiceConsenso).toBe(100);
      expect(convergente.s).toBe(85);
      expect(convergente.score).toBe(80); // (500/750)·85 + (250/750)·70
    });

    it("sem fontes → score = C (prior) e confiança 0", () => {
      const result = svc.calcularScoreV3("FILME", []);
      expect(result.score).toBe(70);
      expect(result.num_fontes).toBe(0);
      expect(result.confianca).toBe(0);
      expect(result.criticosScore).toBeNull();
      expect(result.publicoScore).toBeNull();
      expect(result.indiceConsenso).toBeNull();
      expect(result.s).toBeNull();
    });

    it("fonte fora do registro é ignorada (sem fontes válidas → C)", () => {
      const result = svc.calcularScoreV3("FILME", [
        { fonte: "fonte_inventada", rating: 99, media_fonte: 50, desvio_fonte: 10 },
      ]);
      expect(result.num_fontes).toBe(0);
      expect(result.score).toBe(70);
    });
  });

  describe("recalcularEPersistir() — v3 com upsert (T4.7 + coleta admin)", () => {
    function mockPrisma(avaliacoes: unknown[], existingScore?: unknown, mediaCatalogo = 70) {
      const upsert = vi.fn().mockResolvedValue({});
      const prisma = {
        midia: {
          findUnique: vi.fn().mockResolvedValue({
            id: "m1",
            tipo: "GAME",
            avaliacoes,
            avaliacoes_atualizadas_em: null,
            scores: existingScore ? [{ ...existingScore }] : [],
          }),
        },
        mediaScore: {
          upsert,
          aggregate: vi.fn().mockResolvedValue({ _avg: { score: mediaCatalogo } }),
        },
      };
      return { prisma, upsert };
    }

    it("retorna null quando mídia não existe", async () => {
      const { prisma } = mockPrisma([]);
      prisma.midia.findUnique.mockResolvedValue(null);
      const service = new MediaScoreService(prisma as unknown as PrismaService);
      expect(await service.recalcularEPersistir("m1")).toBeNull();
    });

    it("recalcula a partir das avaliações persistidas e faz upsert com campos v3", async () => {
      const { prisma, upsert } = mockPrisma([
        { fonte: "metacritic", rating: 97, media_fonte: 70, desvio_fonte: 15, votos: 800 },
        { fonte: "igdb", rating: 92, media_fonte: 70, desvio_fonte: 15, votos: 400 },
        { fonte: "igdb_publico", rating: 85, media_fonte: 70, desvio_fonte: 15, votos: 300 },
        { fonte: "steam", rating: 0.9, media_fonte: 0.75, desvio_fonte: 0.2, votos: 100 },
      ]);
      const service = new MediaScoreService(prisma as unknown as PrismaService);
      const result = await service.recalcularEPersistir("m1");

      expect(result).not.toBeNull();
      expect(result!.criticosScore).toBe(89);
      expect(result!.publicoScore).toBe(72.4);
      expect(result!.indiceConsenso).toBe(83.4);
      expect(result!.votosTotal).toBe(1600);
      // (1600/2615)·82.63 + (1015/2615)·70 = 77.7
      expect(result!.score).toBe(77.7);
      expect(result!.calculado_em).toBeInstanceOf(Date);

      const call = upsert.mock.calls[0]![0];
      expect(call.where).toEqual({ midia_id: "m1" });
      expect(call.create.midia_id).toBe("m1");
      expect(call.update.score_critica).toBe(result!.criticosScore);
      expect(call.update.score_publico).toBe(result!.publicoScore);
      expect(call.update.consenso).toBe(result!.consenso);
      expect(call.update.indice_consenso).toBe(83.4);
      expect(call.update.votos_total).toBe(1600);
      expect(call.update.confianca).toBe(result!.confianca);
      expect(call.update.detalhes).toHaveLength(4);
      expect(call.update.num_fontes).toBe(4);
    });

    it("sem avaliações → upsert com prior C (score 70, num_fontes 0)", async () => {
      const { prisma, upsert } = mockPrisma([]);
      const service = new MediaScoreService(prisma as unknown as PrismaService);
      const result = await service.recalcularEPersistir("m1");

      expect(result).not.toBeNull();
      expect(result!.score).toBe(70);
      expect(result!.num_fontes).toBe(0);
      expect(result!.confianca).toBe(0);
      expect(result!.criticosScore).toBeNull();
      expect(result!.publicoScore).toBeNull();
      expect(result!.indiceConsenso).toBeNull();
      expect(result!.votosTotal).toBe(0);

      const call = upsert.mock.calls[0]![0];
      expect(call.update.score).toBe(70);
      expect(call.update.num_fontes).toBe(0);
      expect(call.update.votos_total).toBe(0);
      expect(call.update.detalhes).toEqual([]);
    });

    it("usa a média do catálogo da categoria como prior C", async () => {
      const { prisma } = mockPrisma([], undefined, 55);
      const service = new MediaScoreService(prisma as unknown as PrismaService);
      const result = await service.recalcularEPersistir("m1");
      expect(result!.c).toBe(55);
      expect(result!.score).toBe(55);
    });

    it("fonte fora do registro nas avaliações persistidas é ignorada", async () => {
      const { prisma, upsert } = mockPrisma([
        { fonte: "fonte_inventada", rating: 99, media_fonte: 50, desvio_fonte: 10 },
      ]);
      const service = new MediaScoreService(prisma as unknown as PrismaService);
      const result = await service.recalcularEPersistir("m1");

      expect(result!.num_fontes).toBe(0);
      expect(result!.score).toBe(70);
      expect(upsert.mock.calls[0]![0].update.num_fontes).toBe(0);
    });
  });
});
