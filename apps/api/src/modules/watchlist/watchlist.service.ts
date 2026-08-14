import {
  Injectable,
  ConflictException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { comContextoRls } from "../../common/rls-context.js";
import { COLUNA_PARA_STATUS } from "../../common/status-coluna.js";
import type { Prisma } from "@prisma/client";
import type { AddToWatchlistDto, RegistrarReacaoDto } from "./dto/watchlist.dto.js";
import type { WatchlistColuna, ReacaoConsumo, MotivoAbandono } from "@prisma/client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    return comContextoRls(this.prisma, { usuarioId, role: "USER" }, async (tx) => {
      const midiaId = dto.midia_id;
      const existing = await tx.watchlistEntry.findUnique({
        where: { usuario_id_midia_id: { usuario_id: usuarioId, midia_id: midiaId } },
      });
      if (existing) {
        throw new ConflictException("Esta mídia já está na sua watchlist.");
      }

      await this.verificarLimiteFree(tx, usuarioId);

      // T190: guarda o score da obra no momento da adição.
      const midia = await tx.midia.findUnique({
        where: { id: midiaId },
        select: { score: true },
      });

      const coluna = (dto.coluna ?? "WANT") as WatchlistColuna;

      // T320/D-309: fonte única de verdade — a coluna dirige o status da
      // interação no MESMO transaction (o card aparece no Kanban com o status
      // correto). Só sincroniza quando midia_id é UUID (interação tem FK).
      if (UUID_RE.test(midiaId)) {
        const status = COLUNA_PARA_STATUS[coluna];
        await tx.usuarioMidiaInteracao.upsert({
          where: { usuario_id_midia_id: { usuario_id: usuarioId, midia_id: midiaId } },
          create: {
            usuario_id: usuarioId,
            midia_id: midiaId,
            status,
            atualizado_em: new Date(),
          },
          update: { status, atualizado_em: new Date() },
        });
      }

      return tx.watchlistEntry
        .create({
          data: {
            usuario_id: usuarioId,
            midia_id: midiaId,
            coluna,
            score_at_add: midia?.score ?? null,
          },
        })
        .then((e) => this.semTenant(e));
    });
  }

  /** T289: tenant_id é infraestrutura — nunca exposto na resposta. */
  private semTenant(entry: Record<string, unknown>) {
    const { tenant_id: _tenantId, ...resto } = entry;
    return resto;
  }

  /**
   * D-132: plano FREE limitado a FREE_WATCHLIST_LIMIT itens.
   * Sem registro de plano = FREE (defensivo).
   */
  private async verificarLimiteFree(
    tx: Prisma.TransactionClient,
    usuarioId: string,
  ): Promise<void> {
    const usuarioPlano = await tx.usuarioPlano.findUnique({
      where: { usuario_id: usuarioId },
      select: { plano: true },
    });
    if (usuarioPlano && usuarioPlano.plano !== "FREE") {
      return;
    }

    const count = await tx.watchlistEntry.count({
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
    return comContextoRls(this.prisma, { usuarioId, role: "USER" }, async (tx) => {
      const entries = await tx.watchlistEntry.findMany({
        where: { usuario_id: usuarioId, ...(coluna ? { coluna } : {}) },
        orderBy: { created_at: "desc" },
      });
      if (entries.length === 0) return entries;

      const midiaIds = entries.map((e) => e.midia_id).filter((id) => UUID_RE.test(id));
      if (midiaIds.length === 0) {
        return entries.map((entry) => ({ ...entry, media: null }));
      }
      const midias = await tx.midia.findMany({
        where: { id: { in: midiaIds } },
        select: {
          id: true,
          titulo: true,
          titulo_original: true,
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
        // T289: tenant_id é infraestrutura — nunca exposto na resposta.
        const { tenant_id: _tenantId, ...entryPublico } = entry;
        if (!midia) {
          // T310: entrada sem mídia resolvível (id externo não-UUID ou órfã).
          // NUNCA expor o id cru como título — a UI aplica a fallback chain
          // (título → original → id humanizado → i18n "título indisponível").
          return {
            ...entryPublico,
            media: {
              id: entry.midia_id,
              title: null,
              tituloOriginal: null,
              type: undefined,
              year: null,
              posterUrl: null,
              score: null,
              genres: [],
              dados_parciais: true,
            },
          };
        }
        return {
          ...entryPublico,
          media: {
            id: midia.id,
            title: midia.titulo,
            tituloOriginal: midia.titulo_original,
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
            // T310: flag para "re-sincronizar" — dados parciais quando não há
            // título original (proxy de localização até T311).
            dados_parciais: !midia.titulo_original,
          },
        };
      });
    });
  }

  async move(usuarioId: string, entryId: string, coluna: WatchlistColuna) {
    return comContextoRls(this.prisma, { usuarioId, role: "USER" }, async (tx) => {
      const entry = await tx.watchlistEntry.findFirst({
        where: { id: entryId, usuario_id: usuarioId },
      });
      if (!entry) {
        throw new NotFoundException("Entrada da watchlist não encontrada.");
      }

      // T320/D-309: fonte única de verdade — a coluna dirige o status da
      // interação no MESMO transaction (drag e select nunca divergem).
      if (UUID_RE.test(entry.midia_id)) {
        const status = COLUNA_PARA_STATUS[coluna];
        await tx.usuarioMidiaInteracao.upsert({
          where: { usuario_id_midia_id: { usuario_id: usuarioId, midia_id: entry.midia_id } },
          create: {
            usuario_id: usuarioId,
            midia_id: entry.midia_id,
            status,
            atualizado_em: new Date(),
          },
          update: { status, atualizado_em: new Date() },
        });
      }

      return tx.watchlistEntry
        .update({
          where: { id: entryId },
          data: { coluna },
        })
        .then((e) => this.semTenant(e));
    });
  }

  /**
   * T285 (Addendum 4): registra reação/motivo/progresso em uma entrada do
   * usuário autenticado. Owner-only: entrada alheia → 404 (não vaza
   * existência). Quando `reacao` é GOSTEI/NAO_GOSTEI numa obra concluída,
   * dispara o hook `onReacaoRegistrada` (a T286 deriva DiscoveryEvents).
   */
  async registrarReacao(usuarioId: string, entryId: string, dto: RegistrarReacaoDto) {
    return comContextoRls(this.prisma, { usuarioId, role: "USER" }, async (tx) => {
      const entry = await tx.watchlistEntry.findFirst({
        where: { id: entryId, usuario_id: usuarioId },
        select: { id: true, midia_id: true, coluna: true },
      });
      if (!entry) {
        throw new NotFoundException("Entrada da watchlist não encontrada.");
      }

      const atualizada = await tx.watchlistEntry.update({
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

      return this.semTenant(atualizada);
    });
  }

  async remove(usuarioId: string, entryId: string) {
    return comContextoRls(this.prisma, { usuarioId, role: "USER" }, async (tx) => {
      const entry = await tx.watchlistEntry.findFirst({
        where: { id: entryId, usuario_id: usuarioId },
      });
      if (!entry) {
        throw new NotFoundException("Entrada da watchlist não encontrada.");
      }

      await tx.watchlistEntry.delete({ where: { id: entryId } });
    });
  }
}
