import { describe, it, expect, beforeEach, vi } from "vitest";
import { MediaScoreJobService } from "../src/modules/media-score/media-score-job.service.js";
import type { Midia } from "@prisma/client";

/**
 * T426 / D-410 — cadência semanal do score-job.
 * - Mídias frescas (avaliacoes_atualizadas_em recente) NÃO são re-consultadas
 *   (0 chamadas externas); o findMany filtra por obsolescência.
 * - Se a coleta volta 0 fontes e a mídia JÁ tem avaliações, mantém o último
 *   score (falha graciosa — não apaga avaliacoes nem regride para o prior).
 */

function midiaStub(over: Partial<Midia> = {}): Midia {
  return {
    id: "m1",
    tipo: "MANGA" as Midia["tipo"],
    titulo: "Gantz",
    ano_lancamento: 2000,
    fonte: "mal",
    fonte_id: "564",
    ...over,
  } as Midia;
}

describe("MediaScoreJobService — cadência semanal (D-410/T426)", () => {
  const prisma = {
    midia: { count: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    avaliacaoFonte: { count: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
  };
  const coleta = { coletarTudo: vi.fn() };
  const mediaScore = { recalcularEPersistir: vi.fn() };
  const notificacoes = { gerarAlertasDeScore: vi.fn(), gerarAlertasDeGenero: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    // acelera o teste (delay entre mídias = 0)
    process.env.MEDIA_SCORE_JOB_DELAY_MS = "0";
    prisma.midia.count.mockResolvedValue(100);
    prisma.midia.update.mockResolvedValue({});
    prisma.avaliacaoFonte.count.mockResolvedValue(1);
    prisma.avaliacaoFonte.deleteMany.mockResolvedValue({ count: 1 });
    prisma.avaliacaoFonte.createMany.mockResolvedValue({ count: 1 });
    coleta.coletarTudo.mockResolvedValue([
      {
        fonte: "mal",
        status: "ok",
        nota: { fonte: "mal", rating: 8.08, media_fonte: 7, desvio_fonte: 1.5, votos: 125158 },
      },
    ]);
    mediaScore.recalcularEPersistir.mockResolvedValue({ score: 67.9, num_fontes: 1 });
    notificacoes.gerarAlertasDeScore.mockResolvedValue(undefined);
    notificacoes.gerarAlertasDeGenero.mockResolvedValue(undefined);
  });

  it("findMany filtra por obsolescência (avaliacoes_atualizadas_em NULL ou < cutoff)", async () => {
    prisma.midia.findMany.mockResolvedValueOnce([midiaStub()]);
    const job = new MediaScoreJobService(
      prisma as never,
      coleta as never,
      mediaScore as never,
      notificacoes as never,
    );
    await job.executar();
    const call = prisma.midia.findMany.mock.calls[0];
    const where = (call?.[0] as { where?: { OR?: unknown[] } })?.where;
    expect(where).toBeDefined();
    expect(where.OR).toEqual([
      { avaliacoes_atualizadas_em: null },
      expect.objectContaining({
        avaliacoes_atualizadas_em: expect.objectContaining({ lt: expect.any(Date) }),
      }),
    ]);
  });

  it("mídia obsoleta → 1 coleta por mídia (0 para as frescas, que não retornam)", async () => {
    prisma.midia.findMany.mockResolvedValueOnce([midiaStub({ id: "obsoleta" })]);
    const job = new MediaScoreJobService(
      prisma as never,
      coleta as never,
      mediaScore as never,
      notificacoes as never,
    );
    await job.executar();
    // só a mídia obsoleta volta do findMany → 1 coleta.
    expect(coleta.coletarTudo).toHaveBeenCalledTimes(1);
    expect(prisma.avaliacaoFonte.deleteMany).toHaveBeenCalledTimes(1);
  });

  it("falha graciosa: 0 fontes + avaliações existentes → mantém score (não apaga)", async () => {
    prisma.midia.findMany.mockResolvedValueOnce([midiaStub()]);
    coleta.coletarTudo.mockResolvedValue([]);
    prisma.avaliacaoFonte.count.mockResolvedValue(3); // já tem fontes
    const job = new MediaScoreJobService(
      prisma as never,
      coleta as never,
      mediaScore as never,
      notificacoes as never,
    );
    await job.executar();
    expect(prisma.avaliacaoFonte.deleteMany).not.toHaveBeenCalled();
    expect(mediaScore.recalcularEPersistir).not.toHaveBeenCalled();
  });

  it("sobrescreve REFRESH_INTERVAL_DAYS via env", async () => {
    process.env.REFRESH_INTERVAL_DAYS = "7";
    const { REFRESH_INTERVAL_DAYS, REFRESH_INTERVAL_MS } =
      await import("../src/common/refresh.config.js");
    expect(REFRESH_INTERVAL_DAYS).toBe(7);
    expect(REFRESH_INTERVAL_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
