import {
  Injectable,
  ConflictException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { AddToWatchlistDto } from "./dto/watchlist.dto.js";
import type { WatchlistColuna } from "@prisma/client";

/**
 * Limite de itens na watchlist do plano FREE (D-132 monetização).
 * Plus/Premium (incluindo trial) não têm limite.
 */
export const FREE_WATCHLIST_LIMIT = 20;

@Injectable()
export class WatchlistService {
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

    return this.prisma.watchlistEntry.create({
      data: {
        usuario_id: usuarioId,
        midia_id: midiaId,
        coluna: dto.coluna ?? "WANT",
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
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          error: "Payment Required",
          message: `O plano Free permite até ${FREE_WATCHLIST_LIMIT} itens na watchlist. Faça upgrade para o Plus para itens ilimitados.`,
          current_plan: "FREE",
          required_plan: "PLUS",
          watchlist_limit: FREE_WATCHLIST_LIMIT,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

  async list(usuarioId: string, coluna?: WatchlistColuna) {
    return this.prisma.watchlistEntry.findMany({
      where: { usuario_id: usuarioId, ...(coluna ? { coluna } : {}) },
      orderBy: { created_at: "desc" },
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
