import {
  Injectable,
  ConflictException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { AddToWatchlistDto, RegistrarReacaoDto } from "./dto/watchlist.dto.js";
import type { WatchlistColuna, ReacaoConsumo, MotivoAbandono } from "@prisma/client";

/**
 * Limite de itens na watchlist do plano FREE (D-132 monetização; T207: 50).
 * Plus/Premium (incluindo trial) não têm limite.
 */
export const FREE_WATCHLIST_LIMIT = 50;

/** Evento de reação registrada (T285) — consumido pela T286 (DiscoveryEvent). */
export interface EventoReacaoRegistrada {
  usuarioId: string;
  entryId: string;
  midiaId: string;
  reacao: ReacaoConsumo;
  motivoAbandono?: MotivoAbandono | null;
}

@Injectable()
export class WatchlistService {
  /** Hook de domínio (T285): a T286 assina para derivar DiscoveryEvents. */
  onReacaoRegistrada?: (evento: EventoReacaoRegistrada) => Promise<void> | void;

  constructor(private readonly prisma: PrismaService) {}

  async add(usuarioId: string, dto: AddToWatchlistDto) {
    const midiaId = dto.midia_id;
    const existing = await this.prisma.watchlistEntry.findUnique({
      where: { usuario_id_midia_id: { usuario_id: usuarioId, midia_id: midiaId } },
    });
    if (existing) {
      throw new ConflictException("Esta mídia já está na sua watchlist.");
    }

    await this.verificarLimiteFree(usuarioId);

    // T190: guarda o score da obra no momento da adição (indicador ↑/↓).
    const midia = await this.prisma.midia.findUnique({
      where: { id: midiaId },
      select: { score: true },
    });

    return this.prisma.watchlistEntry.create({
      data: {
        usuario_id: usuarioId,
        midia_id: midiaId,
        coluna: dto.coluna ?? "WANT",
        score_at_add: midia?.score ?? null,
      },
    });
  }

  /**
   * D-132: plano FREE limitado a FREE_WATCHLIST_LIMIT itens.
   * Sem registro de plano = FREE (defensivo).
   */
  private async verificarLimiteFree(usuarioId: string): Promise<void> {
    const usuarioPlano = await this.prisma.usuarioPlano.findUnique({
      where: { usuario_id: usuarioId },
      select: { plano: true },
    });
    if (usuarioPlano && usuarioPlano.plano !== "FREE") {
      return;
    }

    const count = await this.prisma.watchlistEntry.count({
      where: { usuario_id: usuarioId },
    });
    if (count >= FREE_WATCHLIST_LIMIT) {
      // T207: 403 Forbidden (plano não permite) com mensagem clara de upsell.
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          error: "Forbidden",
          message: `O plano Free permite até ${FREE_WATCHLIST_LIMIT} itens na watchlist. Faça upgrade para o Plus para itens ilimitados.`,
          current_plan: "FREE",
          required_plan: "PLUS",
          watchlist_limit: FREE_WATCHLIST_LIMIT,
        },
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async list(usuarioId: string, coluna?: WatchlistColuna) {
    const entries = await this.prisma.watchlistEntry.findMany({
      where: { usuario_id: usuarioId, ...(coluna ? { coluna } : {}) },
      orderBy: { created_at: "desc" },
    });
    if (entries.length === 0) return entries;

    // Join manual: watchlist.midia_id é VarChar sem FK — busca as mídias
    // do catálogo (quando existem) com score e gêneros para o frontend.
    // Entradas legadas com ids não-UUID (ex.: mock "g1") são ignoradas
    // (o cast UUID falharia).
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const midiaIds = entries.map((e) => e.midia_id).filter((id) => UUID_RE.test(id));
    if (midiaIds.length === 0) {
      return entries.map((entry) => ({ ...entry, media: null }));
    }
    const midias = await this.prisma.midia.findMany({
      where: { id: { in: midiaIds } },
      select: {
        id: true,
        titulo: true,
        tipo: true,
        ano_lancamento: true,
        imagem_url: true,
        scores: { select: { score: true }, take: 1, orderBy: { calculado_em: "desc" } },
        generos: { select: { genero: { select: { nome: true } } }, take: 5 },
      },
    });
    const porId = new Map(midias.map((m) => [m.id, m]));

    return entries.map((entry) => {
      const midia = porId.get(entry.midia_id);
      return {
        ...entry,
        media: midia
          ? {
              id: midia.id,
              title: midia.titulo,
              posterUrl: midia.imagem_url,
              type:
                midia.tipo === "FILME"
                  ? "movie"
                  : midia.tipo === "SERIE"
                    ? "series"
                    : midia.tipo === "GAME"
                      ? "game"
                      : midia.tipo.toLowerCase(),
              year: midia.ano_lancamento,
              score: midia.scores[0]?.score ?? null,
              genres: midia.generos.map((g) => g.genero.nome),
            }
          : null,
      };
    });
  }

  async move(usuarioId: string, entryId: string, coluna: WatchlistColuna) {
    const entry = await this.prisma.watchlistEntry.findFirst({
      where: { id: entryId, usuario_id: usuarioId },
    });
    if (!entry) {
      throw new NotFoundException("Entrada da watchlist não encontrada.");
    }

    return this.prisma.watchlistEntry.update({
      where: { id: entryId },
      data: { coluna },
    });
  }

  /**
   * T285 (Addendum 4): registra reação/motivo/progresso em uma entrada do
   * usuário autenticado. Owner-only: entrada alheia → 404 (não vaza
   * existência). Quando `reacao` é GOSTEI/NAO_GOSTEI numa obra concluída,
   * dispara o hook `onReacaoRegistrada` (a T286 deriva DiscoveryEvents).
   */
  async registrarReacao(usuarioId: string, entryId: string, dto: RegistrarReacaoDto) {
    const entry = await this.prisma.watchlistEntry.findFirst({
      where: { id: entryId, usuario_id: usuarioId },
      select: { id: true, midia_id: true, coluna: true },
    });
    if (!entry) {
      throw new NotFoundException("Entrada da watchlist não encontrada.");
    }

    const atualizada = await this.prisma.watchlistEntry.update({
      where: { id: entry.id },
      data: {
        reacao: dto.reacao ?? null,
        motivo_abandono: dto.motivo_abandono ?? null,
        progresso_detalhe: dto.progresso_detalhe ?? null,
      },
    });

    if (dto.reacao && this.onReacaoRegistrada) {
      await this.onReacaoRegistrada({
        usuarioId,
        entryId: entry.id,
        midiaId: entry.midia_id,
        reacao: dto.reacao,
        motivoAbandono: dto.motivo_abandono ?? null,
      });
    }

    return atualizada;
  }

  async remove(usuarioId: string, entryId: string) {
    const entry = await this.prisma.watchlistEntry.findFirst({
      where: { id: entryId, usuario_id: usuarioId },
    });
    if (!entry) {
      throw new NotFoundException("Entrada da watchlist não encontrada.");
    }

    await this.prisma.watchlistEntry.delete({ where: { id: entryId } });
  }
}
