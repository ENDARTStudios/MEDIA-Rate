import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { Midia } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service.js";
import type { ConsultaMedia } from "./adapters/fonte-adapter.interface.js";
import { ColetaService, type ResultadoColeta } from "./coleta.service.js";
import { MediaScoreService, type MediaScoreV3Result } from "./media-score.service.js";

type MidiaParaColeta = Pick<
  Midia,
  "id" | "tipo" | "titulo" | "ano_lancamento" | "fonte" | "fonte_id"
>;

export interface ResultadoColetaEPersistir {
  coletadas: ResultadoColeta["nota"][];
  score: (MediaScoreV3Result & { calculado_em: Date }) | null;
  resultados: ResultadoColeta[];
}

/**
 * Job diário do MEDIA Score (T4.7): coleta avaliações das fontes e recalcula
 * o score (v3) de TODAS as mídias do catálogo, com throttle entre mídias para
 * respeitar os limites de taxa das APIs externas (OMDb ~1k/dia, Trakt, etc.).
 *
 * - Agenda a próxima execução para MEDIA_SCORE_JOB_TIME (default 03:05, hora
 *   local) e re-agenda ao final de cada run.
 * - Ativo apenas em produção (NODE_ENV=production); desative com
 *   MEDIA_SCORE_JOB_ENABLED=false. Run sob demanda: POST /api/v1/midias/score-job
 *   (admin) ou chamando `executar()`.
 * - Guard anti-concorrência: uma segunda execução durante um run é ignorada.
 */
@Injectable()
export class MediaScoreJobService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaScoreJobService.name);
  private timer: NodeJS.Timeout | undefined;
  private emExecucao = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly coleta: ColetaService,
    private readonly mediaScore: MediaScoreService,
  ) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV !== "production" || process.env.MEDIA_SCORE_JOB_ENABLED === "false") {
      this.logger.log("Job diário do MEDIA Score desativado (fora de produção ou via env).");
      return;
    }
    this.agendarProxima();
  }

  onModuleDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  private agendarProxima(): void {
    const [hh, mm] = (process.env.MEDIA_SCORE_JOB_TIME ?? "03:05").split(":").map(Number);
    const agora = new Date();
    const proxima = new Date(agora);
    proxima.setHours(hh || 3, mm || 5, 0, 0);
    if (proxima.getTime() <= agora.getTime()) proxima.setDate(proxima.getDate() + 1);
    const delay = proxima.getTime() - agora.getTime();
    this.timer = setTimeout(() => {
      void this.executar().finally(() => this.agendarProxima());
    }, delay);
    this.logger.log(`Job diário do MEDIA Score agendado para ${proxima.toISOString()}.`);
  }

  /**
   * Coleta + recálculo de todas as mídias do catálogo.
   * @returns contagem de mídias processadas e com erro.
   */
  async executar(): Promise<{ processadas: number; comErro: number }> {
    if (this.emExecucao) {
      this.logger.warn("Job já em execução — execução ignorada.");
      return { processadas: 0, comErro: 0 };
    }
    this.emExecucao = true;
    const delayMs = Math.max(0, Number(process.env.MEDIA_SCORE_JOB_DELAY_MS ?? 1200));
    const take = 25;
    let processadas = 0;
    let comErro = 0;
    const inicio = Date.now();
    this.logger.log("Job diário do MEDIA Score iniciado.");
    try {
      let cursor: string | undefined;
      let pagina: MidiaParaColeta[];
      do {
        pagina = await this.prisma.midia.findMany({
          orderBy: { id: "asc" },
          take,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          select: {
            id: true,
            tipo: true,
            titulo: true,
            ano_lancamento: true,
            fonte: true,
            fonte_id: true,
          },
        });
        for (const midia of pagina) {
          try {
            await this.coletarEPersistir(midia);
            processadas++;
          } catch (erro) {
            comErro++;
            this.logger.warn(
              `Falha na coleta de "${midia.titulo}" (${midia.id}): ${(erro as Error).message}`,
            );
          }
          if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        cursor = pagina.length > 0 ? pagina[pagina.length - 1]?.id : undefined;
        if ((processadas + comErro) % 50 === 0 && processadas + comErro > 0) {
          this.logger.log(`Job diário: ${processadas + comErro} mídias processadas até agora...`);
        }
      } while (pagina.length === take && cursor);
    } finally {
      this.emExecucao = false;
      const segundos = ((Date.now() - inicio) / 1000).toFixed(0);
      this.logger.log(
        `Job diário concluído: ${processadas} processadas, ${comErro} com erro em ${segundos}s.`,
      );
    }
    return { processadas, comErro };
  }

  /**
   * Coleta as avaliações das fontes de uma mídia, persiste em
   * `avaliacao_fonte` (idempotente) e recalcula o MEDIA Score v3.
   */
  async coletarEPersistir(midia: MidiaParaColeta): Promise<ResultadoColetaEPersistir> {
    const consulta: ConsultaMedia = {
      tipo: midia.tipo,
      titulo: midia.titulo,
      ano: midia.ano_lancamento ?? undefined,
      ...(midia.fonte && midia.fonte_id ? { idsExternos: { [midia.fonte]: midia.fonte_id } } : {}),
    };

    const resultados = await this.coleta.coletarTudo(consulta);
    const coletadas = resultados.filter(
      (r): r is typeof r & { nota: NonNullable<(typeof r)["nota"]> } =>
        r.status === "ok" && !!r.nota,
    );

    await this.prisma.avaliacaoFonte.deleteMany({ where: { midia_id: midia.id } });
    if (coletadas.length > 0) {
      await this.prisma.avaliacaoFonte.createMany({
        data: coletadas.map((r) => ({
          midia_id: midia.id,
          fonte: r.nota.fonte,
          rating: r.nota.rating,
          media_fonte: r.nota.media_fonte,
          desvio_fonte: r.nota.desvio_fonte,
          votos: r.nota.votos ?? null,
          url: r.nota.url ?? null,
        })),
      });
    }
    await this.prisma.midia.update({
      where: { id: midia.id },
      data: { avaliacoes_atualizadas_em: new Date() },
    });

    const score = await this.mediaScore.recalcularEPersistir(midia.id);
    return { coletadas: coletadas.map((r) => r.nota), score, resultados };
  }
}
