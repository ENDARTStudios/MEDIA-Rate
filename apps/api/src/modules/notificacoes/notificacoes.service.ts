import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";

/** Variação mínima de score que dispara o alerta "score mudou". */
const VARIACAO_MINIMA = 5;

/**
 * Notificações in-app (D-132 — alertas por mídia da watchlist).
 *
 * `gerarAlertasDeScore()` é chamado ao fim do job diário do MEDIA Score:
 * para cada item da watchlist cujo score atual mudou ≥ VARIACAO_MINIMA
 * desde a última notificação (ou a primeira vez que há score), cria uma
 * notificação SCORE_MUDOU com o antes/depois.
 */
@Injectable()
export class NotificacoesService {
  private readonly logger = new Logger(NotificacoesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Lista as notificações do usuário (mais recentes primeiro). */
  async listar(usuarioId: string, limite = 30): Promise<unknown[]> {
    return this.prisma.notificacao.findMany({
      where: { usuario_id: usuarioId },
      orderBy: { created_at: "desc" },
      take: Math.min(limite, 100),
    });
  }

  async naoLidas(usuarioId: string): Promise<number> {
    return this.prisma.notificacao.count({
      where: { usuario_id: usuarioId, lida_at: null },
    });
  }

  async marcarLida(usuarioId: string, id: string): Promise<void> {
    await this.prisma.notificacao.updateMany({
      where: { id, usuario_id: usuarioId },
      data: { lida_at: new Date() },
    });
  }

  async marcarTodasLidas(usuarioId: string): Promise<void> {
    await this.prisma.notificacao.updateMany({
      where: { usuario_id: usuarioId, lida_at: null },
      data: { lida_at: new Date() },
    });
  }

  /**
   * Varre as watchlists e cria alertas SCORE_MUDOU quando o score atual
   * difere ≥ VARIACAO_MINIMA do último notificado (primeira notificação
   * usa o score atual como baseline).
   */
  async gerarAlertasDeScore(): Promise<number> {
    const entradas = await this.prisma.watchlistEntry.findMany({
      select: { id: true, usuario_id: true, midia_id: true },
    });
    if (entradas.length === 0) return 0;

    // Watchlist legada pode ter ids não-UUID (ex.: mock "g1") — o cast UUID
    // falharia; ignora essas entradas no vínculo com o catálogo.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const midiaIds = [...new Set(entradas.map((e) => e.midia_id))].filter((id) =>
      UUID_RE.test(id),
    );
    if (midiaIds.length === 0) return 0;
    const scores = await this.prisma.mediaScore.findMany({
      where: { midia_id: { in: midiaIds } },
      select: { midia_id: true, score: true },
    });
    const scorePorMidia = new Map(scores.map((s) => [s.midia_id, s.score]));

    let criadas = 0;
    for (const entrada of entradas) {
      const scoreAtual = scorePorMidia.get(entrada.midia_id);
      if (scoreAtual == null) continue;

      const ultima = await this.prisma.notificacao.findFirst({
        where: {
          usuario_id: entrada.usuario_id,
          midia_id: entrada.midia_id,
          tipo: "SCORE_MUDOU",
        },
        orderBy: { created_at: "desc" },
        select: { dados: true },
      });
      const scoreAnterior = (ultima?.dados as { score?: number } | null)?.score;

      if (scoreAnterior == null) {
        // Primeira notificação — baseline do score atual.
        await this.criar(entrada.usuario_id, entrada.midia_id, scoreAtual, scoreAtual);
        criadas++;
        continue;
      }
      if (Math.abs(scoreAtual - scoreAnterior) >= VARIACAO_MINIMA) {
        await this.criar(entrada.usuario_id, entrada.midia_id, scoreAtual, scoreAnterior);
        criadas++;
      }
    }
    this.logger.log(`Alertas de score gerados: ${criadas}`);
    return criadas;
  }

  private async criar(
    usuarioId: string,
    midiaId: string,
    scoreAtual: number,
    scoreAnterior: number,
  ): Promise<void> {
    const midia = await this.prisma.midia.findUnique({
      where: { id: midiaId },
      select: { titulo: true },
    });
    const tituloMidia = midia?.titulo ?? "título";
    const variacao = scoreAtual - scoreAnterior;
    await this.prisma.notificacao.create({
      data: {
        usuario_id: usuarioId,
        tipo: "SCORE_MUDOU",
        titulo: `MEDIA Score de "${tituloMidia}" mudou`,
        mensagem:
          variacao >= 0
            ? `O score subiu de ${scoreAnterior.toFixed(1)} para ${scoreAtual.toFixed(1)}.`
            : `O score caiu de ${scoreAnterior.toFixed(1)} para ${scoreAtual.toFixed(1)}.`,
        midia_id: midiaId,
        dados: { score: scoreAtual, score_anterior: scoreAnterior },
      },
    });
  }
}
