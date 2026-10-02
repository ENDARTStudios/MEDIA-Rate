import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";

import { PrismaService } from "../../prisma/prisma.service.js";
import { comContextoRls, DEFAULT_TENANT, ROLE_SERVICE } from "../../common/rls-context.js";

export interface PurgeResultado {
  /** Usuários encontrados com a carência de 30 dias expirada (no lote). */
  verificados: number;
  /** Deletes executados com sucesso (cascata conforme MATRIZ-PROPAGACAO). */
  purgados: number;
  /** Falhas isoladas (o lote continua — um erro não aborta os demais). */
  falhas: number;
}

/** Lote máximo por execução — a diária seguinte retoma o restante. */
const LOTE_PADRAO = 100;

/**
 * T156/J-002-A — worker de ELIMINAÇÃO DEFINITIVA pós-carenência LGPD.
 *
 * Fecha o P0-02 da auditoria jurídica: a Política promete eliminação após os
 * 30 dias de carência (MATRIZ-PROPAGACAO-OPERADORES.md, passo 4); este worker
 * é o executor que faltava (`lgpd.service.solicitarExclusao` apenas agenda).
 *
 * - Cron diário 03:00 UTC + gatilho manual admin (`POST /api/v1/admin/lgpd/purge`).
 * - O DELETE em `usuario` cascata o dado pessoal (33 FKs `onDelete: Cascade`)
 *   e SetNull o que tem retenção legal/anonimizada (EventoPagamento,
 *   ConsentLog, MediaScoreView) — exatamente a matriz.
 * - Cascata em tabelas FORCE RLS (watchlist_entry/discovery_event) exige o
 *   contexto da POLICY: cada delete roda em `comContextoRls` com o próprio
 *   `usuario_id` purgado + role SERVICE (mesmo padrão do auth.register).
 * - Idempotente e em lotes: um erro não aborta o lote; o restante vai na
 *   execução seguinte.
 */
@Injectable()
export class LgpdPurgeService {
  private readonly logger = new Logger(LgpdPurgeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Diário, 03:00 UTC — janela de menor tráfego. */
  @Cron("0 3 * * *")
  async purgeDiaria(): Promise<PurgeResultado> {
    return this.purgeExpirados();
  }

  async purgeExpirados(limite: number = LOTE_PADRAO): Promise<PurgeResultado> {
    const expirados = await this.prisma.usuario.findMany({
      where: { dados_para_exclusao_at: { lte: new Date() } },
      select: { id: true },
      orderBy: { dados_para_exclusao_at: "asc" },
      take: limite,
    });

    let purgados = 0;
    let falhas = 0;
    for (const { id } of expirados) {
      try {
        await comContextoRls(
          this.prisma,
          { usuarioId: id, tenantId: DEFAULT_TENANT, role: ROLE_SERVICE },
          (tx) => tx.usuario.delete({ where: { id } }),
        );
        purgados += 1;
      } catch (erro) {
        falhas += 1;
        const motivo = erro instanceof Error ? erro.message : String(erro);
        this.logger.error(`Purga LGPD falhou para usuário ${id}: ${motivo}`);
      }
    }

    this.logger.log(
      `Purga LGPD: ${purgados} eliminado(s), ${falhas} falha(s) em lote de ${expirados.length}.`,
    );
    return { verificados: expirados.length, purgados, falhas };
  }
}
