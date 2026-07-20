import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Reflector precisa ser import como valor para NestJS DI
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- PrismaService precisa ser import como valor para NestJS DI
import { PrismaService } from "../../prisma/prisma.service.js";
import { PLAN_KEY, PLAN_RANK } from "../decorators/require-plan.decorator.js";
import type { AuthenticatedUser } from "./auth.guard.js";

/**
 * Cache em memória do plano do usuário (T3.7 — "Cache curto (60s) em
 * memória do processo, nunca Redis").
 *
 * Chave: usuario_id. Valor: { plano, expires_at }.
 * TTL: 60s. Em casos de upgrade/downgrade, usuário pode ver plano antigo
 * por até 60s — aceitável para Beta.
 */
interface PlanCacheEntry {
  plano: string;
  status: string;
  expires_at: number; // epoch ms
}
const PLAN_CACHE_TTL_MS = 60 * 1000;

/**
 * Guard de plano (T3.7).
 *
 * - Lê @RequirePlan('PLUS'|'PREMIUM') metadata.
 * - Carrega usuario_plano do banco (com cache 60s em memória).
 * - Compara rank do plano do usuário com o exigido.
 * - Se insuficiente, retorna 402 Payment Required (convite para upgrade).
 *
 * Hierarquia: FREE (0) < PLUS (1) < PREMIUM (2).
 * Rota @RequirePlan('PLUS') exige PLUS ou PREMIUM.
 * Rota @RequirePlan('PREMIUM') exige PREMIUM.
 */
@Injectable()
export class PlanGuard implements CanActivate {
  private readonly cache = new Map<string, PlanCacheEntry>();

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPlan = this.reflector.getAllAndOverride<string>(PLAN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPlan) {
      return true; // rota não exige plano específico
    }

    const request = context.switchToHttp().getRequest<
      FastifyRequest & {
        user?: AuthenticatedUser;
      }
    >();
    const user = request.user;
    if (!user) {
      // Sem usuário autenticado = AuthGuard permitiu passar (rota pública
      // ou em test). PlanGuard só aplica se há usuário autenticado.
      return true;
    }

    const userPlan = await this.getUserPlan(user.id);
    const userRank = PLAN_RANK[userPlan.plano] ?? 0;
    const requiredRank = PLAN_RANK[requiredPlan] ?? 0;

    if (userRank < requiredRank) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          error: "Payment Required",
          message: `Esta funcionalidade exige plano ${requiredPlan} ou superior. Seu plano atual: ${userPlan.plano}.`,
          current_plan: userPlan.plano,
          required_plan: requiredPlan,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    return true;
  }

  private async getUserPlan(usuario_id: string): Promise<{ plano: string; status: string }> {
    // Verifica cache.
    const cached = this.cache.get(usuario_id);
    if (cached && cached.expires_at > Date.now()) {
      return { plano: cached.plano, status: cached.status };
    }

    // Busca no banco.
    const usuarioPlano = await this.prisma.usuarioPlano.findUnique({
      where: { usuario_id },
      select: { plano: true, status: true },
    });
    if (!usuarioPlano) {
      // Sem registro de plano = FREE (defensivo, não deveria acontecer).
      return { plano: "FREE", status: "ATIVA" };
    }

    // Atualiza cache.
    this.cache.set(usuario_id, {
      plano: usuarioPlano.plano,
      status: usuarioPlano.status,
      expires_at: Date.now() + PLAN_CACHE_TTL_MS,
    });
    return { plano: usuarioPlano.plano, status: usuarioPlano.status };
  }

  /**
   * Limpa cache de um usuário (chamar após upgrade/downgrade).
   */
  invalidateCache(usuario_id: string): void {
    this.cache.delete(usuario_id);
  }
}
