/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { MediaScoreJobService } from "../src/modules/media-score/media-score-job.service.js";

function mockDependencias() {
  const prisma = {
    midia: {
      findMany: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    avaliacaoFonte: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
  const coleta = { coletarTudo: vi.fn().mockResolvedValue([]) };
  const mediaScore = {
    recalcularEPersistir: vi.fn().mockResolvedValue({
      score: 70,
      criticosScore: null,
      publicoScore: null,
      consenso: null,
      indiceConsenso: null,
      s: null,
      c: 70,
      votosTotal: 0,
      num_fontes: 0,
      confianca: 0,
      pesos_usados: {},
      detalhes: [],
      calculado_em: new Date(),
    }),
  };
  const job = new MediaScoreJobService(prisma as never, coleta as never, mediaScore as never);
  return { prisma, coleta, mediaScore, job };
}

function midia(id: string) {
  return {
    id,
    tipo: "FILME",
    titulo: `Filme ${id}`,
    ano_lancamento: 2000,
    fonte: "tmdb",
    fonte_id: `ext-${id}`,
  };
}

describe("MediaScoreJobService — job diário (T4.7)", () => {
  const delayOriginal = process.env.MEDIA_SCORE_JOB_DELAY_MS;

  beforeEach(() => {
    process.env.MEDIA_SCORE_JOB_DELAY_MS = "0";
  });

  afterEach(() => {
    if (delayOriginal === undefined) delete process.env.MEDIA_SCORE_JOB_DELAY_MS;
    else process.env.MEDIA_SCORE_JOB_DELAY_MS = delayOriginal;
  });

  it("executa a coleta + recálculo de todas as mídias paginado", async () => {
    const { prisma, job } = mockDependencias();
    const pagina1 = Array.from({ length: 25 }, (_, i) => midia(`m${i + 1}`));
    const pagina2 = [midia("m26"), midia("m27"), midia("m28")];
    prisma.midia.findMany
      .mockResolvedValueOnce(pagina1)
      .mockResolvedValueOnce(pagina2)
      .mockResolvedValueOnce([]);

    const resultado = await job.executar();

    expect(resultado).toEqual({ processadas: 28, comErro: 0 });
    // 2 páginas consultadas (25 + 3); o loop encerra quando a página vem
    // menor que o take (sem consulta extra de página vazia).
    expect(prisma.midia.findMany).toHaveBeenCalledTimes(2);
    const chamada2 = prisma.midia.findMany.mock.calls[1]![0] as Record<string, unknown>;
    expect(chamada2.cursor).toEqual({ id: "m25" });
    expect(chamada2.skip).toBe(1);
  });

  it("falha em uma mídia não interrompe o run (conta comErro)", async () => {
    const { prisma, coleta, job } = mockDependencias();
    prisma.midia.findMany
      .mockResolvedValueOnce([midia("m1"), midia("m2")])
      .mockResolvedValueOnce([]);
    coleta.coletarTudo
      .mockRejectedValueOnce(new Error("API externa fora"))
      .mockResolvedValueOnce([]);

    const resultado = await job.executar();

    expect(resultado).toEqual({ processadas: 1, comErro: 1 });
  });

  it("guard anti-concorrência: segunda execução durante o run é ignorada", async () => {
    const { prisma, job } = mockDependencias();
    let resolvePrimeira!: (v: unknown) => void;
    prisma.midia.findMany.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePrimeira = resolve;
      }),
    );

    const primeira = job.executar();
    const segunda = await job.executar();
    expect(segunda).toEqual({ processadas: 0, comErro: 0 });

    resolvePrimeira([]);
    expect(await primeira).toEqual({ processadas: 0, comErro: 0 });
  });

  it("coletarEPersistir: consulta com idsExternos, persistência idempotente e recálculo v3", async () => {
    const { prisma, coleta, mediaScore, job } = mockDependencias();
    coleta.coletarTudo.mockResolvedValue([
      {
        fonte: "tmdb",
        status: "ok",
        nota: {
          fonte: "tmdb",
          rating: 8.5,
          media_fonte: 7,
          desvio_fonte: 1.5,
          votos: 1000,
          url: "https://themoviedb.org/movie/238",
        },
      },
      { fonte: "fonte_errada", status: "erro", motivo: "timeout" },
    ]);

    const resultado = await job.coletarEPersistir({
      id: "m1",
      tipo: "FILME",
      titulo: "The Godfather",
      ano_lancamento: 1972,
      fonte: "tmdb",
      fonte_id: "238",
    });

    expect(coleta.coletarTudo).toHaveBeenCalledWith({
      tipo: "FILME",
      titulo: "The Godfather",
      ano: 1972,
      idsExternos: { tmdb: "238" },
    });
    expect(prisma.avaliacaoFonte.deleteMany).toHaveBeenCalledWith({ where: { midia_id: "m1" } });
    const createCall = prisma.avaliacaoFonte.createMany.mock.calls[0]![0] as {
      data: Record<string, unknown>[];
    };
    expect(createCall.data).toHaveLength(1);
    expect(createCall.data[0]).toMatchObject({
      midia_id: "m1",
      fonte: "tmdb",
      votos: 1000,
    });
    expect(prisma.midia.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: { avaliacoes_atualizadas_em: expect.any(Date) },
    });
    expect(mediaScore.recalcularEPersistir).toHaveBeenCalledWith("m1");
    expect(resultado.coletadas).toHaveLength(1);
    expect(resultado.score.score).toBe(70);
    expect(resultado.resultados).toHaveLength(2);
  });

  it("coletarEPersistir sem fonte_id não monta idsExternos", async () => {
    const { coleta, job } = mockDependencias();
    await job.coletarEPersistir({
      id: "m2",
      tipo: "GAME",
      titulo: "Baldur's Gate 3",
      ano_lancamento: 2023,
      fonte: null,
      fonte_id: null,
    });
    expect(coleta.coletarTudo).toHaveBeenCalledWith({
      tipo: "GAME",
      titulo: "Baldur's Gate 3",
      ano: 2023,
    });
  });
});
