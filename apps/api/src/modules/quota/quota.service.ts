import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { comContextoRls } from "../../common/rls-context.js";

/**
 * Quotas diárias por plano (D-132 — limites Free).
 *
 * Padrão: `usar(usuarioId, recurso, limite)` incrementa o contador do dia e
 * lança 429 quando o limite é excedido — mesmo formato do limite da watchlist
 * (402), para o frontend mostrar o upsell do plano.
 */
@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Plano do usuário (FREE quando sem registro — defensivo). */
  async planoDe(usuarioId: string): Promise<string> {
    const registro = await comContextoRls(this.prisma, { usuarioId, role: "USER" }, (tx) =>
      tx.usuarioPlano.findUnique({
        where: { usuario_id: usuarioId },
        select: { plano: true },
      }),
    );
    return registro?.plano ?? "FREE";
  }

  /**
   * Consome 1 unidade da cota do recurso no dia de hoje.
   * Lança 429 quando count > limite (chamada anterior já ultrapassou).
   */
  async usar(usuarioId: string, recurso: string, limite: number): Promise<void> {
    const hoje = new Date().toISOString().slice(0, 10);
    const row = await this.prisma.usoDiario.upsert({
      where: {
        usuario_id_recurso_dia: { usuario_id: usuarioId, recurso, dia: hoje },
      },
      create: { usuario_id: usuarioId, recurso, dia: hoje, count: 1 },
      update: { count: { increment: 1 } },
    });
    if (row.count > limite) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: "Too Many Requests",
          message: `O plano Free permite até ${limite} ${recurso} por dia. Faça upgrade para o Plus para acesso ilimitado.`,
          current_plan: "FREE",
          required_plan: "PLUS",
          recurso,
          limite,
          retry_after_seconds: SEGUNDOS_ATE_MEIA_NOITE,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}

/** Segundos até a meia-noite local (reset da cota diária). */
const SEGUNDOS_ATE_MEIA_NOITE = (() => {
  const agora = new Date();
  const meiaNoite = new Date(agora);
  meiaNoite.setHours(24, 0, 0, 0);
  return Math.max(60, Math.floor((meiaNoite.getTime() - agora.getTime()) / 1000));
})();
