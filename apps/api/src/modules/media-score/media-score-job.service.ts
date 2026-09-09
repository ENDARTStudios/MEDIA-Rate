import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { Midia } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service.js";
import { REFRESH_INTERVAL_MS, REFRESH_INTERVAL_DAYS } from "../../common/refresh.config.js";
import { NotificacoesService } from "../notificacoes/notificacoes.service.js";
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
 * Job do MEDIA Score (T4.7 / D-410 / T426): coleta avaliações das fontes e
 * recalcula o score (v3) SOMENTE de mídias OBSOLETAS (nunca coletadas ou com
 * `avaliacoes_atualizadas_em` anterior a REFRESH_INTERVAL_DAYS — default 7).
 * Mídias frescas são puladas (0 chamadas externas desnecessárias).
 *
 * - Cadência SEMANAL: agenda o próximo run em MEDIA_SCORE_JOB_TIME (default
 *   03:05 local) a REFRESH_INTERVAL_DAYS dias à frente (ver refresh.config.ts).
 * - Ativo apenas em produção (NODE_ENV=production); desative com
 *   MEDIA_SCORE_JOB_ENABLED=false. Run sob demanda: POST /api/v1/midias/score-job
 *   (admin) ou chamando `executar()`.
 * - Guard anti-concorrência: uma segunda execução durante um run é ignorada.
 * - Falha graciosa: se uma coleta retorna 0 fontes para uma mídia que JÁ tem
 *   avaliações, mantém o último score (não regride para o prior Bayesiano).
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
    private readonly notificacoes: NotificacoesService,
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
    // D-410/T426: cadência SEMANAL — próximo run ao menos REFRESH_INTERVAL_DAYS
    // à frente (mesmo horário local), em vez de diária.
    const alvo = agora.getTime() + REFRESH_INTERVAL_MS;
    while (proxima.getTime() < alvo) proxima.setDate(proxima.getDate() + 1);
    const delay = proxima.getTime() - agora.getTime();
    this.timer = setTimeout(() => {
      void this.executar().finally(() => this.agendarProxima());
    }, delay);
    this.logger.log(
      `Job semanal do MEDIA Score (${REFRESH_INTERVAL_DAYS}d) agendado para ${proxima.toISOString()}.`,
    );
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
    let totalMidias = 0;
    this.logger.log("Job do MEDIA Score iniciado.");
    try {
      let cursor: string | undefined;
      let pagina: MidiaParaColeta[];
      const now = Date.now();
      const cutoff = new Date(now - REFRESH_INTERVAL_MS);
      // D-410/T426: só re-consulta mídias OBSOLETAS (nunca coletadas ou com
      // `avaliacoes_atualizadas_em` anterior ao intervalo semanal).
      totalMidias = await this.prisma.midia.count({ where: { deleted_at: null } });
      do {
        pagina = await this.prisma.midia.findMany({
          where: {
            OR: [
              { avaliacoes_atualizadas_em: null },
              { avaliacoes_atualizadas_em: { lt: cutoff } },
            ],
          },
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
      const puladas = Math.max(0, totalMidias - processadas);
      this.logger.log(
        `Job concluído: ${processadas} processadas (obsoletas), ${comErro} com erro, ${puladas} puladas (frescas) de ${totalMidias} mídias em ${segundos}s.`,
      );
    }
    // D-132: alertas de "score mudou" e de "novo título nota alta no seu
    // gênero" (pós-recálculo).
    try {
      await this.notificacoes.gerarAlertasDeScore();
    } catch (erro) {
      this.logger.warn(`Falha ao gerar alertas de score: ${(erro as Error).message}`);
    }
    try {
      await this.notificacoes.gerarAlertasDeGenero();
    } catch (erro) {
      this.logger.warn(`Falha ao gerar alertas de gênero: ${(erro as Error).message}`);
    }
    // T447/D-441: gatilho on-demand do ISR da home (que agora é horário).
    // Fire-and-forget limitado: nunca quebra o job; sem env, só loga e pula
    // (testes e dev seguem sem configurar nada).
    await this.dispararRevalidateWeb();
    return { processadas, comErro };
  }

  /**
   * T447/D-441 — invalida o cache ISR da home no web após cada run.
   * Requer WEB_REVALIDATE_URL + REVALIDATE_SECRET (mesmo secret da rota
   * POST /api/revalidate no web). Timeout 10s; falha = warn, nunca throw.
   */
  private async dispararRevalidateWeb(): Promise<void> {
    const baseUrl = (process.env.WEB_REVALIDATE_URL ?? "").replace(/\/$/, "");
    const secret = process.env.REVALIDATE_SECRET ?? "";
    if (!baseUrl || !secret) {
      this.logger.log("Revalidate web pulado (WEB_REVALIDATE_URL/REVALIDATE_SECRET ausentes).");
      return;
    }
    try {
      const res = await fetch(`${baseUrl}/api/revalidate`, {
        method: "POST",
        headers: { "x-revalidate-token": secret },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        this.logger.warn(`Revalidate web respondeu ${res.status} (ISR segue horário).`);
        return;
      }
      this.logger.log("Revalidate web disparado (home será re-renderizada).");
    } catch (erro) {
      this.logger.warn(`Revalidate web falhou: ${(erro as Error).message} (ISR segue horário).`);
    }
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

    // D-410/T426: falha graciosa — se a coleta não obteve NENHUMA fonte mas a
    // mídia JÁ tem avaliações, mantém o score anterior (não apaga nem regride
    // para o prior). Evita perda de score em queda momentânea de APIs externas.
    const existentes = await this.prisma.avaliacaoFonte.count({
      where: { midia_id: midia.id },
    });
    if (coletadas.length === 0 && existentes > 0) {
      this.logger.warn(
        `Coleta sem fontes para "${midia.titulo}" (${midia.id}) — mantendo score anterior.`,
      );
      return { coletadas: [], score: null, resultados };
    }

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
