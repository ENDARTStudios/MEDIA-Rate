/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { HttpException, NotFoundException } from "@nestjs/common";
import { ColetaProdController } from "../src/modules/fontes/coleta-prod.controller.js";

function mockReq(token?: string) {
  return {
    raw: {
      headers: token ? { "x-admin-token": token } : {},
    },
    headers: token ? { "x-admin-token": token } : {},
  } as any;
}

const MIDIA = {
  id: "m1",
  tipo: "GAME",
  titulo: "Zelda",
  ano_lancamento: 2017,
  fonte: "igdb",
  fonte_id: "1905",
};

describe("ColetaProdController (coleta em produção)", () => {
  let controller: ColetaProdController;
  let mockPrisma: any;
  let mockJob: { coletarEPersistir: ReturnType<typeof vi.fn>; executar: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    process.env.ADMIN_TOKEN = "test-admin-token";
    mockPrisma = {
      midia: { findUnique: vi.fn() },
    };
    mockJob = {
      coletarEPersistir: vi.fn(),
      executar: vi.fn().mockResolvedValue({ processadas: 0, comErro: 0 }),
    };
    controller = new ColetaProdController(mockPrisma, mockJob as any);
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

  it("coleta e recalcula via MediaScoreJobService, repassando o resultado", async () => {
    mockPrisma.midia.findUnique.mockResolvedValue(MIDIA);
    mockJob.coletarEPersistir.mockResolvedValue({
      coletadas: [{ fonte: "igdb", rating: 85, media_fonte: 70, desvio_fonte: 15 }],
      score: { score: 81.2, criticosScore: 88, publicoScore: 74.4, num_fontes: 2 },
      resultados: [
        { fonte: "igdb", status: "ok" },
        { fonte: "opencritic", status: "erro", motivo: "resposta inválida" },
      ],
    });

    const result = await controller.coletar(mockReq("test-admin-token"), "m1");

    expect(mockPrisma.midia.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "m1" } }),
    );
    expect(mockJob.coletarEPersistir).toHaveBeenCalledWith(MIDIA);
    expect(result.midia_id).toBe("m1");
    expect(result.coletadas).toHaveLength(1);
    expect(result.score.score).toBe(81.2);
    expect(result.resultados).toHaveLength(2);
  });

  it("coleta sem nenhuma fonte ok — repassa coletadas vazias e recalcula mesmo assim", async () => {
    mockPrisma.midia.findUnique.mockResolvedValue(MIDIA);
    mockJob.coletarEPersistir.mockResolvedValue({
      coletadas: [],
      score: { score: 50, num_fontes: 0 },
      resultados: [{ fonte: "goodreads", status: "erro", motivo: "timeout" }],
    });

    const result = await controller.coletar(mockReq("test-admin-token"), "m1");

    expect(result.coletadas).toHaveLength(0);
    expect(mockJob.coletarEPersistir).toHaveBeenCalled();
  });

  it("dispararJob sem token — 401", async () => {
    await expect(controller.dispararJob(mockReq())).rejects.toThrow(HttpException);
    expect(mockJob.executar).not.toHaveBeenCalled();
  });

  it("dispararJob — dispara o run em segundo plano e responde iniciado", async () => {
    const result = await controller.dispararJob(mockReq("test-admin-token"));
    expect(result).toEqual({ iniciado: true });
    expect(mockJob.executar).toHaveBeenCalledTimes(1);
  });
});
