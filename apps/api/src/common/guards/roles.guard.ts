import {
  CanActivate,
  type ExecutionContext,
  Injectable,
  ForbiddenException,
} from "@nestjs/common";

import { Reflector } from "@nestjs/core";
import { FastifyRequest } from "fastify";

import { PrismaService } from "../../prisma/prisma.service.js";
import { ROLES_KEY } from "../decorators/roles.decorator.js";
import type { AuthenticatedUser } from "./auth.guard.js";

/**
 * Guard de RBAC (T3.4 + T3.5).
 *
 * - Lê @Roles(...) metadata da rota via Reflector.
 * - Carrega papéis do usuário do banco a cada request (sem cache —
 *   privilégios revogados têm efeito imediato).
 * - Se usuário não tem nenhum dos papéis exigidos, retorna 403 Forbidden.
 * - Se a rota não tem @Roles(), permite passar (apenas auth é exigida).
 *
 * Uso:
 *   @Roles('ADMIN')
 *   @Get('admin-only')
 *   adminOnly() { ... }
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // rota não exige papéis específicos
    }

    const request = context.switchToHttp().getRequest<
      FastifyRequest & {
        user?: AuthenticatedUser;
      }
    >();
    const user = request.user;
    if (!user) {
      // Sem usuário autenticado = AuthGuard permitiu passar (rota pública
      // ou em test). RolesGuard só aplica se há usuário autenticado.
      return true;
    }

    // Carrega papéis do banco.
    const usuarioPapeis = await this.prisma.usuarioPapel.findMany({
      where: { usuario_id: user.id },
      include: { papel: { select: { nome: true } } },
    });
    const userRoles = usuarioPapeis.map((up) => up.papel.nome);

    const hasRole = requiredRoles.some((role) => userRoles.includes(role as never));
    if (!hasRole) {
      throw new ForbiddenException({
        statusCode: 403,
        error: "Forbidden",
        message: "Você não tem permissão para acessar este recurso.",
      });
    }
    return true;
  }
}
