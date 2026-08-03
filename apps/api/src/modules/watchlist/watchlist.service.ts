import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { AddToWatchlistDto } from "./dto/watchlist.dto.js";
import type { WatchlistColuna } from "@prisma/client";

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

    return this.prisma.watchlistEntry.create({
      data: {
        usuario_id: usuarioId,
        midia_id: midiaId,
        coluna: dto.coluna ?? "WANT",
      },
    });
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
