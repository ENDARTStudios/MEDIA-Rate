import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- SessionService precisa ser import como valor para NestJS DI
import { SessionService } from "../../modules/auth/session.service.js";

/**
 * Contexto de usuário autenticado (anexado a request.user).
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  nome: string | null;
  sessao_id: string;
}

/**
 * Guard global de autenticação (T3.4 — parte auth).
 *
 * - Extrai cookie 'sess' da request.
 * - Valida token opaco via SessionService.
 * - Anexa usuário a request.user (AuthenticatedUser).
 * - Se rota NÃO exige auth (sem @Public ou qualquer rota não-protegida),
 *   permite passar sem user.
 * - Se rota exige auth (qualquer controller que não seja /auth/register,
 *   /auth/login, /health), retorna 401 Unauthorized se user ausente.
 *
 * Implementação: este Guard é global. Rotas públicas usam @Public()
 * decorator para pular verificação.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      FastifyRequest & {
        user?: AuthenticatedUser;
      }
    >();

    // Extrai token do cookie.
    const cookieName = "sess";
    const cookies = (request as unknown as { cookies?: Record<string, string> }).cookies;
    const token = cookies?.[cookieName];

    if (!token) {
      // Rotas /auth/register, /auth/login, /health são públicas por padrão.
      if (this.isDefaultPublicPath(request.url)) return true;
      throw new UnauthorizedException({
        statusCode: 401,
        error: "Unauthorized",
        message: "Autenticação necessária.",
      });
    }

    const result = await this.sessionService.validateToken(token);
    if (!result) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: "Unauthorized",
        message: "Sessão inválida ou expirada.",
      });
    }

    request.user = {
      id: result.usuario.id,
      email: result.usuario.email,
      nome: result.usuario.nome,
      sessao_id: result.sessao.id,
    };

    return true;
  }

  private isDefaultPublicPath(url: string): boolean {
    return (
      url === "/health" ||
      url.startsWith("/api/v1/auth/register") ||
      url.startsWith("/api/v1/auth/login") ||
      url.startsWith("/api/v1/echo") || // T1.4 rota de exemplo, não exige auth
      url.startsWith("/api/v1/_force-error") || // T1.6 rota de debug
      url.startsWith("/api/v1/webhooks/") || // webhooks usam assinatura própria
      url.startsWith("/api/docs") || // Swagger UI (T4.2)
      url.startsWith("/api/docs-json") // Swagger JSON (T4.2)
    );
  }
}
