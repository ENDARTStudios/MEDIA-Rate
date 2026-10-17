import { Logger } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MediaScoreJobService } from "../src/modules/media-score/media-score-job.service.js";

/**
 * T-DADOS-18 — agendamento resiliente do score-job.
 *
 * Bug medido: um setTimeout de 7 dias era re-armado a cada deploy, então o job
 * nunca disparava. Agora o boot arma um 1º tique curto (~2 min) e tica a cada
 * 1 h; a cadência semanal é definida pelo filtro de vencimento em `executar()`.
 */

const DIA_MS = 24 * 60 * 60 * 1000;
const ENV_KEYS = [
  "NODE_ENV",
  "MEDIA_SCORE_JOB_ENABLED",
  "MEDIA_SCORE_JOB_FIRST_TICK_MS",
  "MEDIA_SCORE_JOB_INTERVAL_MS",
] as const;

interface FiltroArgs {
  where: {
    OR: [{ avaliacoes_atualizadas_em: null }, { avaliacoes_atualizadas_em: { lt: Date } }];
  };
}

function mockDependencias() {
  const prisma = {
    midia: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
    avaliacaoFonte: {
      count: vi.fn().mockResolvedValue(0),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
  const coleta = { coletarTudo: vi.fn().mockResolvedValue([]) };
  const mediaScore = {
    recalcularEPersistir: vi
      .fn()
      .mockResolvedValue({ score: 70, num_fontes: 0, calculado_em: new Date() }),
  };
  const notificacoes = {
    gerarAlertasDeScore: vi.fn().mockResolvedValue(undefined),
    gerarAlertasDeGenero: vi.fn().mockResolvedValue(undefined),
  };
  const job = new MediaScoreJobService(
    prisma as never,
    coleta as never,
    mediaScore as never,
    notificacoes as never,
  );
  return { prisma, coleta, mediaScore, notificacoes, job };
}

const midia = (
  id: string,
  titulo: string,
  avaliacoes_atualizadas_em: Date | null,
): Record<string, unknown> => ({
  id,
  tipo: "FILME",
  titulo,
  ano_lancamento: 2000,
  fonte: "tmdb",
  fonte_id: `ext-${id}`,
  avaliacoes_atualizadas_em,
});

describe("MediaScoreJobService — T-DADOS-18 agendamento resiliente", () => {
  const originais = new Map<string, string | undefined>();
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    for (const chave of ENV_KEYS) originais.set(chave, process.env[chave]);
    process.env.NODE_ENV = "production";
    delete process.env.MEDIA_SCORE_JOB_ENABLED;
    delete process.env.MEDIA_SCORE_JOB_FIRST_TICK_MS;
    delete process.env.MEDIA_SCORE_JOB_INTERVAL_MS;
    process.env.MEDIA_SCORE_JOB_DELAY_MS = "0";

    logSpy = vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    warnSpy = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    errorSpy = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    for (const chave of ENV_KEYS) {
      const valor = originais.get(chave);
      if (valor === undefined) Reflect.deleteProperty(process.env, chave);
      else process.env[chave] = valor;
    }
    delete process.env.MEDIA_SCORE_JOB_DELAY_MS;
    originais.clear();
  });

  it("MEDIA_SCORE_JOB_ENABLED=false não agenda nenhum timer e loga desativado", () => {
    process.env.MEDIA_SCORE_JOB_ENABLED = "false";
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const { job } = mockDependencias();

    job.onModuleInit();

    expect(setTimeoutSpy).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    expect(logSpy.mock.calls.flat().join(" ")).toMatch(/desativado/);
  });

  it("sem overrides: 1º tique em ~2 min e os seguintes a cada 1 h", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const { job } = mockDependencias();
    const executarSpy = vi.spyOn(job, "executar").mockResolvedValue({
      processadas: 0,
      comErro: 0,
    });

    job.onModuleInit();

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 120_000);
    expect(logSpy.mock.calls.flat().join(" ")).toMatch(/1º tique em 2 min.*ticks de 1 h/);

    await vi.advanceTimersByTimeAsync(120_000);

    expect(executarSpy).toHaveBeenCalledTimes(1);
    // O próximo tick é re-armado no disparo, com o intervalo de 1 h.
    expect(setTimeoutSpy).toHaveBeenCalledTimes(2);
    expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 3_600_000);
  });

  it("executar() processa só vencidos: fresca sai do filtro, 8 dias entra", async () => {
    const { prisma, coleta, job } = mockDependencias();
    const fresca = midia("fresca", "Fresca", new Date(Date.now() - DIA_MS));
    const vencida = midia("vencida", "Vencida", new Date(Date.now() - 8 * DIA_MS));
    const nunca = midia("nunca", "Nunca coletada", null);
    const todas = [fresca, vencida, nunca];
    prisma.midia.count.mockResolvedValue(todas.length);
    prisma.midia.findMany.mockImplementation(async (args: FiltroArgs) => {
      const cutoff = args.where.OR[1].avaliacoes_atualizadas_em.lt;
      return todas.filter((m) => {
        const atualizada = m.avaliacoes_atualizadas_em as Date | null;
        return atualizada === null || atualizada < cutoff;
      });
    });

    const resultado = await job.executar();

    expect(resultado).toEqual({ processadas: 2, comErro: 0 });
    expect(coleta.coletarTudo).toHaveBeenCalledTimes(2);
    const titulos = coleta.coletarTudo.mock.calls.map(
      ([consulta]) => (consulta as { titulo: string }).titulo,
    );
    expect(titulos).toEqual(["Vencida", "Nunca coletada"]);
    expect(titulos).not.toContain("Fresca");

    const args = prisma.midia.findMany.mock.calls[0]?.[0] as FiltroArgs | undefined;
    const cutoff = args?.where.OR[1].avaliacoes_atualizadas_em.lt;
    expect(cutoff).toBeInstanceOf(Date);
    expect(Math.abs((cutoff as Date).getTime() - (Date.now() - 7 * DIA_MS))).toBeLessThan(1_000);
  });

  it("emExecucao: segundo executar() concorrente retorna 0 e loga 'já em execução'", async () => {
    const { prisma, job } = mockDependencias();
    let liberar!: (pagina: unknown[]) => void;
    prisma.midia.findMany.mockReturnValueOnce(
      new Promise((resolve) => {
        liberar = resolve;
      }),
    );

    const primeira = job.executar();
    const segunda = await job.executar();

    expect(segunda).toEqual({ processadas: 0, comErro: 0 });
    expect(warnSpy.mock.calls.flat().join(" ")).toMatch(/já em execução/);

    liberar([]);
    await expect(primeira).resolves.toEqual({ processadas: 0, comErro: 0 });
  });

  it("MEDIA_SCORE_JOB_INTERVAL_MS respeita o mínimo de 5 min", async () => {
    process.env.MEDIA_SCORE_JOB_FIRST_TICK_MS = "1000"; // abaixo do mínimo (30 s)
    process.env.MEDIA_SCORE_JOB_INTERVAL_MS = "60000"; // abaixo do mínimo (5 min)
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const { job } = mockDependencias();
    vi.spyOn(job, "executar").mockResolvedValue({ processadas: 0, comErro: 0 });

    job.onModuleInit();

    expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 30_000);

    await vi.advanceTimersByTimeAsync(30_000);

    expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 300_000);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
