/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { HttpException, NotFoundException } from "@nestjs/common";
import { ColetaProdController } from "../src/modules/fontes/coleta-prod.controller.js";
import type { ResultadoColeta } from "../src/modules/media-score/coleta.service.js";

function mockReq(token?: string) {
  return {
    raw: {
      headers: token ? { "x-admin-token": token } : {},
    },
    headers: token ? { "x-admin-token": token } : {},
  } as any;
}

function nota(
  fonte: string,
  rating = 85,
  media = 70,
  desvio = 15,
): ResultadoColeta & { nota: NonNullable<ResultadoColeta["nota"]> } {
  return {
    fonte,
    status: "ok",
    nota: {
      fonte,
      rating,
      media_fonte: media,
      desvio_fonte: desvio,
      url: `https://exemplo/${fonte}`,
    },
  };
}

describe("ColetaProdController (coleta em produção)", () => {
  let controller: ColetaProdController;
  let mockPrisma: any;
  let mockColeta: { coletarTudo: ReturnType<typeof vi.fn> };
  let mockScore: { recalcularEPersistir: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    process.env.ADMIN_TOKEN = "test-admin-token";
    mockPrisma = {
      midia: {
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
      },
      avaliacaoFonte: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    mockColeta = { coletarTudo: vi.fn() };
    mockScore = { recalcularEPersistir: vi.fn() };
    controller = new ColetaProdController(mockPrisma, mockColeta as any, mockScore as any);
  });

  afterEach(() => {
    delete process.env.ADMIN_TOKEN;
  });

  it("sem x-admin-token — 401", async () => {
    await expect(controller.coletar(mockReq(), "m1")).rejects.toThrow(HttpException);
  });

  it("token inválido — 401", async () => {
    await expect(controller.coletar(mockReq("token-errado"), "m1")).rejects.toThrow(HttpException);
    expect(mockPrisma.midia.findUnique).not.toHaveBeenCalled();
  });

  it("mídia não encontrada — 404", async () => {
    mockPrisma.midia.findUnique.mockResolvedValue(null);
    await expect(controller.coletar(mockReq("test-admin-token"), "m1")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("coleta, persiste avaliações ok e recalcula score", async () => {
    mockPrisma.midia.findUnique.mockResolvedValue({
      id: "m1",
      tipo: "GAME",
      titulo: "Zelda",
      ano_lancamento: 2017,
      fonte: "igdb",
      fonte_id: "1905",
    });
    mockColeta.coletarTudo.mockResolvedValue([
      nota("igdb"),
      nota("igdb_publico", 84),
      { fonte: "opencritic", status: "erro", motivo: "resposta inválida" },
    ]);
    mockScore.recalcularEPersistir.mockResolvedValue({
      score: 81.2,
      criticosScore: 88,
      publicoScore: 74.4,
      consenso: 13.6,
      num_fontes: 2,
      confianca: 0.6,
      pesos_usados: {},
      detalhes: [],
      calculado_em: new Date(),
    });

    const result = await controller.coletar(mockReq("test-admin-token"), "m1");

    expect(mockColeta.coletarTudo).toHaveBeenCalledWith({
      tipo: "GAME",
      titulo: "Zelda",
      ano: 2017,
      idsExternos: { igdb: "1905" },
    });
    expect(mockPrisma.avaliacaoFonte.deleteMany).toHaveBeenCalledWith({
      where: { midia_id: "m1" },
    });
    const createMany = mockPrisma.avaliacaoFonte.createMany.mock.calls[0]![0];
    expect(createMany.data).toHaveLength(2); // só as "ok"; erro/fora é ignorado
    expect(createMany.data[0]).toMatchObject({
      midia_id: "m1",
      fonte: "igdb",
      rating: 85,
      media_fonte: 70,
      desvio_fonte: 15,
      url: "https://exemplo/igdb",
    });
    expect(mockPrisma.midia.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: expect.objectContaining({ avaliacoes_atualizadas_em: expect.any(Date) }),
    });
    expect(mockScore.recalcularEPersistir).toHaveBeenCalledWith("m1");
    expect(result.coletadas).toHaveLength(2);
    expect(result.score.score).toBe(81.2);
    expect(result.resultados).toHaveLength(3);
  });

  it("coleta sem nenhuma fonte ok — persiste vazio e recalcula mesmo assim", async () => {
    mockPrisma.midia.findUnique.mockResolvedValue({
      id: "m1",
      tipo: "LIVRO",
      titulo: "Duna",
      ano_lancamento: 1965,
      fonte: "tmdb",
      fonte_id: "x",
    });
    mockColeta.coletarTudo.mockResolvedValue([
      { fonte: "goodreads", status: "erro", motivo: "timeout" },
    ]);
    mockScore.recalcularEPersistir.mockResolvedValue({ score: 50, num_fontes: 0 });

    const result = await controller.coletar(mockReq("test-admin-token"), "m1");

    expect(mockPrisma.avaliacaoFonte.createMany).not.toHaveBeenCalled();
    expect(result.coletadas).toHaveLength(0);
    expect(mockScore.recalcularEPersistir).toHaveBeenCalledWith("m1");
  });
});
