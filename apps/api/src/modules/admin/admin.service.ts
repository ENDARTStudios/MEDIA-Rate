import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { CacheService } from "../../common/cache.service.js";
import type { AdminStatsResponse } from "./dto/stats-response.dto.js";

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
  ) {}

  /** Retorna as stats com status do cache (X-Cache para o controller). */
  async getStats(): Promise<{ value: AdminStatsResponse; hit: boolean }> {
    return this.cache.readThroughWithStatus("admin:stats", STATS_TTL, () => this.calcular());
  }

  private async calcular(): Promise<AdminStatsResponse> {
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
      this.prisma.usuario.count({ where: { dados_para_exclusao_at: null } }),
      this.prisma.usuario.count({
        where: { ultimo_login_em: { gte: seteDias }, dados_para_exclusao_at: null },
      }),
      this.prisma.midia.count({ where: { deleted_at: null } }),
      this.prisma.midia.groupBy({
        by: ["tipo"],
        where: { deleted_at: null },
        _count: { _all: true },
      }),
      this.prisma.watchlistEntry.count(),
      this.prisma.watchlistEntry
        .groupBy({ by: ["usuario_id"], _count: { _all: true } })
        .then((r) => r.length),
      this.prisma.sessao.count({
        where: { expires_at: { gt: agora }, revoked_at: null },
      }),
      this.prisma.usuarioPlano.groupBy({
        by: ["plano"],
        where: { status: "ATIVA" },
        _count: { _all: true },
      }),
      this.prisma.discoveryEvent.count(),
      this.prisma.discoveryEvent
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
  }
}
