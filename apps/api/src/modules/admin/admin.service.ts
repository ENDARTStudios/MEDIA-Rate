import { BadRequestException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { CacheService } from "../../common/cache.service.js";
import { comContextoRls, DEFAULT_TENANT } from "../../common/rls-context.js";
import { AuditLogService } from "../../common/audit-log.service.js";
import {
  MIDIA_INTERACAO_SELECT,
  mapearInteracaoResponse,
} from "../interacoes/interacoes.mapper.js";
import type { AdminStatsResponse } from "./dto/stats-response.dto.js";

export type PlanoAdmin = "FREE" | "PLUS" | "PREMIUM";

const USUARIOS_PAGE_SIZE = 25;

/** Item da listagem de usuários (Onda 1 admin). Não expõe PII além do
 * necessário à gestão (nome/email/plano/status) — nunca hash/sessões. */
export interface UsuarioAdminItem {
  id: string;
  nome: string | null;
  email: string;
  plano: PlanoAdmin;
  origem: string;
  banido: boolean;
  criado_em: Date;
}

const STATS_TTL = 60; // segundos (T210 — chave admin:stats)

/**
 * AdminService (T221, 4.7) — métricas reais de operação para o dashboard
 * admin. Read-only; apenas contagens agregadas (nunca PII). Cache 60s
 * via CacheService (readThrough) — invalidação em escrita não é necessária.
 * Banco vazio → zeros (não erro).
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    @Optional() private readonly auditLog?: AuditLogService,
  ) {}

  /**
   * Onda 2 admin (P0b): histórico de atividade do usuário — interações
   * (status/reação, mais recentes primeiro) + entradas da watchlist.
   * Fonte da moderação: o admin vê exatamente o que o usuário produziu.
   */
  async atividadeDoUsuario(usuarioId: string): Promise<{
    usuario: { id: string; email: string };
    interacoes: ReturnType<typeof mapearInteracaoResponse>[];
    watchlist: { id: string; midia_id: string; coluna: string; criado_em: Date | null }[];
  }> {
    return comContextoRls(this.prisma, { tenantId: DEFAULT_TENANT, role: "ADMIN" }, async (tx) => {
      const usuario = await tx.usuario.findUnique({
        where: { id: usuarioId },
        select: { id: true, email: true },
      });
      if (!usuario) {
        throw new NotFoundException("Usuário não encontrado.");
      }
      const [interacoes, watchlist] = await Promise.all([
        tx.usuarioMidiaInteracao.findMany({
          where: { usuario_id: usuarioId },
          orderBy: { atualizado_em: "desc" as const },
          take: 100,
          include: { midia: { select: MIDIA_INTERACAO_SELECT } },
        }),
        tx.watchlistEntry.findMany({
          where: { usuario_id: usuarioId },
          orderBy: { created_at: "desc" as const },
          take: 100,
          select: { id: true, midia_id: true, coluna: true, created_at: true },
        }),
      ]);
      return {
        usuario,
        interacoes: interacoes.map(mapearInteracaoResponse),
        watchlist: watchlist.map((w) => ({
          id: w.id,
          midia_id: w.midia_id,
          coluna: w.coluna,
          criado_em: w.created_at,
        })),
      };
    });
  }

  /**
   * Onda 2 admin (P0b): moderação — remove a interação de QUALQUER usuário
   * (conteúdo inadequado/spam). Auditado com o motivo do admin.
   */
  async removerInteracaoUsuario(
    adminId: string,
    usuarioId: string,
    midiaId: string,
    motivo: string,
  ): Promise<{ usuarioId: string; midiaId: string }> {
    return comContextoRls(this.prisma, { tenantId: DEFAULT_TENANT, role: "ADMIN" }, async (tx) => {
      const existente = await tx.usuarioMidiaInteracao.findUnique({
        where: { usuario_id_midia_id: { usuario_id: usuarioId, midia_id: midiaId } },
        select: { id: true },
      });
      if (!existente) {
        throw new NotFoundException("Interação não encontrada para este usuário.");
      }
      await tx.usuarioMidiaInteracao.delete({
        where: { usuario_id_midia_id: { usuario_id: usuarioId, midia_id: midiaId } },
      });
      await this.auditLog
        ?.log({
          entidade: "UsuarioMidiaInteracao",
          entidadeId: existente.id,
          acao: "ADMIN_MODERACAO_INTERACAO_REMOVIDA",
          usuarioId: adminId,
          dadosDepois: { alvo: usuarioId, midiaId, motivo },
        })
        .catch(() => undefined);
      return { usuarioId, midiaId };
    });
  }

  /**
   * Onda 2 admin (P0b): moderação — remove entrada da watchlist de
   * QUALQUER usuário. Auditado.
   */
  async removerWatchlistUsuario(
    adminId: string,
    usuarioId: string,
    entryId: string,
    motivo: string,
  ): Promise<{ usuarioId: string; entryId: string }> {
    return comContextoRls(this.prisma, { tenantId: DEFAULT_TENANT, role: "ADMIN" }, async (tx) => {
      const existente = await tx.watchlistEntry.findFirst({
        where: { id: entryId, usuario_id: usuarioId },
        select: { id: true },
      });
      if (!existente) {
        throw new NotFoundException("Entrada da watchlist não encontrada para este usuário.");
      }
      await tx.watchlistEntry.delete({ where: { id: entryId } });
      await this.auditLog
        ?.log({
          entidade: "watchlist_entry",
          entidadeId: entryId,
          acao: "ADMIN_MODERACAO_WATCHLIST_REMOVIDA",
          usuarioId: adminId,
          dadosDepois: { alvo: usuarioId, motivo },
        })
        .catch(() => undefined);
      return { usuarioId, entryId };
    });
  }

  /**
   * Onda 1 admin (P0): lista usuários com busca por nome/email e filtro por
   * plano, paginada. Sob contexto RLS ADMIN — enxerga todos os usuários.
   */
  async listarUsuarios(filtros: {
    q?: string;
    plano?: PlanoAdmin;
    page: number;
  }): Promise<{ items: UsuarioAdminItem[]; total: number; page: number; pageSize: number }> {
    return comContextoRls(this.prisma, { tenantId: DEFAULT_TENANT, role: "ADMIN" }, async (tx) => {
      const where: Record<string, unknown> = {};
      if (filtros.q) {
        where.OR = [
          { nome: { contains: filtros.q, mode: "insensitive" } },
          { email: { contains: filtros.q, mode: "insensitive" } },
        ];
      }
      if (filtros.plano) {
        where.usuarioPlano = { plano: filtros.plano };
      }
      const [usuarios, total] = await Promise.all([
        tx.usuario.findMany({
          where,
          select: {
            id: true,
            nome: true,
            email: true,
            banido_em: true,
            created_at: true,
            plano: { select: { plano: true, origem: true } },
          },
          orderBy: { created_at: "desc" as const },
          skip: filtros.page * USUARIOS_PAGE_SIZE,
          take: USUARIOS_PAGE_SIZE,
        }),
        tx.usuario.count({ where }),
      ]);
      const items: UsuarioAdminItem[] = usuarios.map((u) => ({
        id: u.id,
        nome: u.nome,
        email: u.email,
        plano: (u.plano?.plano ?? "FREE") as PlanoAdmin,
        origem: u.plano?.origem ?? "STRIPE",
        banido: u.banido_em != null,
        criado_em: u.created_at,
      }));
      return { items, total, page: filtros.page, pageSize: USUARIOS_PAGE_SIZE };
    });
  }

  /**
   * Onda 1 admin (P0): altera o plano criando exceção MANUAL — o sync de
   * renovação Stripe não sobrescreve (payment.service, origem MANUAL).
   */
  async alterarPlano(
    adminId: string,
    usuarioId: string,
    plano: PlanoAdmin,
  ): Promise<{ usuarioId: string; plano: PlanoAdmin; origem: "MANUAL" }> {
    return comContextoRls(this.prisma, { tenantId: DEFAULT_TENANT, role: "ADMIN" }, async (tx) => {
      const alvo = await tx.usuario.findUnique({
        where: { id: usuarioId },
        select: { id: true },
      });
      if (!alvo) {
        throw new NotFoundException("Usuário não encontrado.");
      }
      await tx.usuarioPlano.upsert({
        where: { usuario_id: usuarioId },
        create: { usuario_id: usuarioId, plano, status: "ATIVA", origem: "MANUAL" },
        update: { plano, origem: "MANUAL" },
      });
      await this.auditLog
        ?.log({
          entidade: "UsuarioPlano",
          entidadeId: usuarioId,
          acao: "ADMIN_PLANO_ALTERADO",
          usuarioId: adminId,
          dadosDepois: { alvo: usuarioId, plano, origem: "MANUAL" },
        })
        .catch(() => undefined);
      return { usuarioId, plano, origem: "MANUAL" as const };
    });
  }

  /**
   * Onda 1 admin (P0): bane o usuário (banido_em setado + TODAS as sessões
   * ativas revogadas — o efeito é imediato; login bloqueado no auth.service).
   * Admin não pode banir a si mesmo. Motivo registrado na auditoria.
   */
  async banir(
    adminId: string,
    usuarioId: string,
    motivo: string,
  ): Promise<{ usuarioId: string; banido_em: Date; sessoesRevogadas: number }> {
    if (adminId === usuarioId) {
      throw new BadRequestException("Você não pode banir a sua própria conta.");
    }
    return comContextoRls(this.prisma, { tenantId: DEFAULT_TENANT, role: "ADMIN" }, async (tx) => {
      const alvo = await tx.usuario.findUnique({
        where: { id: usuarioId },
        select: { id: true },
      });
      if (!alvo) {
        throw new NotFoundException("Usuário não encontrado.");
      }
      const banido_em = new Date();
      await tx.usuario.update({ where: { id: usuarioId }, data: { banido_em } });
      const sessoes = await tx.sessao.updateMany({
        where: { usuario_id: usuarioId, revoked_at: null },
        data: { revoked_at: new Date() },
      });
      await this.auditLog
        ?.log({
          entidade: "Usuario",
          entidadeId: usuarioId,
          acao: "ADMIN_USUARIO_BANIDO",
          usuarioId: adminId,
          dadosDepois: { alvo: usuarioId, motivo, sessoesRevogadas: sessoes.count },
        })
        .catch(() => undefined);
      return { usuarioId, banido_em, sessoesRevogadas: sessoes.count };
    });
  }

  /** Onda 1 admin (P0): revoga o ban (banido_em volta a null). */
  async desbanir(
    adminId: string,
    usuarioId: string,
  ): Promise<{ usuarioId: string; banido: false }> {
    return comContextoRls(this.prisma, { tenantId: DEFAULT_TENANT, role: "ADMIN" }, async (tx) => {
      const alvo = await tx.usuario.findUnique({
        where: { id: usuarioId },
        select: { id: true },
      });
      if (!alvo) {
        throw new NotFoundException("Usuário não encontrado.");
      }
      await tx.usuario.update({ where: { id: usuarioId }, data: { banido_em: null } });
      await this.auditLog
        ?.log({
          entidade: "Usuario",
          entidadeId: usuarioId,
          acao: "ADMIN_USUARIO_DESBANIDO",
          usuarioId: adminId,
          dadosDepois: { alvo: usuarioId },
        })
        .catch(() => undefined);
      return { usuarioId, banido: false as const };
    });
  }

  /** Retorna as stats com status do cache (X-Cache para o controller). */
  async getStats(): Promise<{ value: AdminStatsResponse; hit: boolean }> {
    return this.cache.readThroughWithStatus("admin:stats", STATS_TTL, () => this.calcular());
  }

  private async calcular(): Promise<AdminStatsResponse> {
    return comContextoRls(this.prisma, { tenantId: DEFAULT_TENANT, role: "ADMIN" }, async (tx) => {
      const agora = new Date();
      const seteDias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [
        totalUsuarios,
        ativos7d,
        totalMidias,
        porTipo,
        totalEntries,
        usuariosComWatchlist,
        sessoesAtivas,
        planos,
        totalDiscoveryEvents,
        usuariosComDiscovery,
      ] = await Promise.all([
        // Usuários: exclui soft-delete agendado (LGPD).
        tx.usuario.count({ where: { dados_para_exclusao_at: null } }),
        tx.usuario.count({
          where: { ultimo_login_em: { gte: seteDias }, dados_para_exclusao_at: null },
        }),
        tx.midia.count({ where: { deleted_at: null } }),
        tx.midia.groupBy({
          by: ["tipo"],
          where: { deleted_at: null },
          _count: { _all: true },
        }),
        tx.watchlistEntry.count(),
        tx.watchlistEntry
          .groupBy({ by: ["usuario_id"], _count: { _all: true } })
          .then((r) => r.length),
        tx.sessao.count({
          where: { expires_at: { gt: agora }, revoked_at: null },
        }),
        tx.usuarioPlano.groupBy({
          by: ["plano"],
          where: { status: "ATIVA" },
          _count: { _all: true },
        }),
        tx.discoveryEvent.count(),
        tx.discoveryEvent
          .groupBy({ by: ["usuario_id"], _count: { _all: true } })
          .then((r) => r.length),
      ]);

      const porTipoMap: Record<string, number> = {};
      for (const g of porTipo) porTipoMap[g.tipo] = g._count._all;

      const planosMap: AdminStatsResponse["planos"] = { free: 0, plus: 0, premium: 0 };
      for (const g of planos) {
        const chave = g.plano.toLowerCase() as keyof AdminStatsResponse["planos"];
        if (chave in planosMap) planosMap[chave] = g._count._all;
      }

      return {
        usuarios: { total: totalUsuarios, ativos_7d: ativos7d },
        midias: { total: totalMidias, por_tipo: porTipoMap },
        watchlists: { total_entries: totalEntries, usuarios_com_watchlist: usuariosComWatchlist },
        sessoes: { ativas: sessoesAtivas },
        planos: planosMap,
        descobertas: {
          total_eventos: totalDiscoveryEvents,
          usuarios_com_evento: usuariosComDiscovery,
        },
      };
    });
  }
}
