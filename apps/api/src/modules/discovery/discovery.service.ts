import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { comContextoRls } from "../../common/rls-context.js";
import type { EventoReacaoRegistrada } from "../watchlist/watchlist.service.js";

/** Limite máximo do feed (paginação por cursor). */
const LIMITE_MAX = 50;

/**
 * T286 (Addenda 3/4) — transforma o grafo RelacaoObra em superfície de
 * produto: reação GOSTEI numa obra CONCLUÍDA gera eventos de descoberta
 * cross-mídia idempotentes (UNIQUE usuario_id+to_media_id), que alimentam o
 * feed "Descobertas".
 */
@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger("DiscoveryService");

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assinatura do hook onReacaoRegistrada (T285). Só GOSTEI gera evento;
   * nunca lança (o PATCH de reação não pode quebrar por falha do feed).
   */
  async processarReacao(evento: EventoReacaoRegistrada): Promise<void> {
    if (evento.reacao !== "GOSTEI") return;
    try {
      await this.gerarEventosParaObra(evento.usuarioId, evento.midiaId);
    } catch (err) {
      this.logger.warn(
        `[discovery] falha ao gerar eventos (sem quebrar o PATCH): ${String(err).slice(0, 200)}`,
      );
    }
  }

  private async gerarEventosParaObra(usuarioId: string, midiaId: string): Promise<void> {
    await comContextoRls(this.prisma, { usuarioId, role: "USER" }, async (tx) => {
      const relacoes = await tx.relacaoObra.findMany({
        where: {
          OR: [{ origem_id: midiaId }, { destino_id: midiaId }],
        },
        select: {
          id: true,
          tipo: true,
          origem_id: true,
          destino_id: true,
        },
      });
      if (relacoes.length === 0) return;

      for (const r of relacoes) {
        // "to" = a obra relacionada (o outro lado da aresta).
        const toMediaId = r.origem_id === midiaId ? r.destino_id : r.origem_id;
        // upsert idempotente: primeiro evento da obra vence; não duplica.
        await tx.discoveryEvent.upsert({
          where: {
            usuario_id_to_media_id: { usuario_id: usuarioId, to_media_id: toMediaId },
          },
          create: {
            usuario_id: usuarioId,
            from_media_id: midiaId,
            to_media_id: toMediaId,
            relation_type: r.tipo,
          },
          update: {},
        });
      }
    });
  }

  /** Feed paginado do usuário (cursor por created_em+id). */
  async listar(usuarioId: string, opts: { cursor?: string | null; limit?: number } = {}) {
    const limit = Math.min(opts.limit ?? 20, LIMITE_MAX);
    const events = await this.prisma.discoveryEvent.findMany({
      where: { usuario_id: usuarioId },
      orderBy: [{ created_em: "desc" }, { id: "asc" }],
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      take: limit + 1,
      select: {
        id: true,
        relation_type: true,
        created_em: true,
        from_media: {
          select: { id: true, titulo: true, tipo: true, imagem_url: true, score: true },
        },
        to_media: {
          select: { id: true, titulo: true, tipo: true, imagem_url: true, score: true },
        },
      },
    });

    const temMais = events.length > limit;
    const pagina = temMais ? events.slice(0, limit) : events;
    const ultimo = pagina[pagina.length - 1];

    const itens = pagina.map((e) => ({
      id: e.id,
      relation_type: e.relation_type,
      created_em: e.created_em.toISOString(),
      de: e.from_media,
      para: e.to_media,
    }));

    return {
      itens,
      proximo_cursor: temMais && ultimo ? ultimo.id : null,
    };
  }
}
