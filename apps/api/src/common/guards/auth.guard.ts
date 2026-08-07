import {
  CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { FastifyRequest } from "fastify";

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
      // Rotas públicas não exigem autenticação.
      if (this.isDefaultPublicPath(request.url, request.method)) return true;
      throw new UnauthorizedException({
        statusCode: 401,
        error: "Unauthorized",
        message: "Autenticação necessária.",
      });
    }

    const result = await this.sessionService.validateToken(token);
    if (!result) {
      // Token presente mas inválido/expirado: em rotas públicas, trata como
      // visitante anônimo (senão usuário com cookie velho ficaria preso
      // sem conseguir logar/registrar); em rotas protegidas, 401.
      if (this.isDefaultPublicPath(request.url, request.method)) return true;
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

  private isDefaultPublicPath(url: string, method?: string): boolean {
    const m = method?.toUpperCase() ?? "GET";
    if (
      url === "/health" ||
      url === "/metrics" ||
      url.startsWith("/api/v1/auth/register") ||
      url.startsWith("/api/v1/auth/login") ||
      url.startsWith("/api/v1/auth/forgot-password") ||
      url.startsWith("/api/v1/auth/reset-password") ||
      url.startsWith("/api/v1/auth/refresh") || // T212: público (cookie refresh + rate limit)
      url.startsWith("/api/v1/echo") || // T1.4 rota de exemplo, não exige auth
      url.startsWith("/api/v1/waitlist-notify") || // T185 lead capture público (rate limit + zod)
      url.startsWith("/api/v1/_force-error") || // T1.6 rota de debug (dev apenas)
      url.startsWith("/api/v1/_debug/coletar") || // auditoria de fontes (gate ENABLE_DEBUG_ROUTES, dev)
      url.startsWith("/api/v1/webhooks/") || // webhooks usam assinatura própria
      url.startsWith("/api/docs") || // Swagger UI (T4.2)
      url.startsWith("/api/docs-json") // Swagger JSON (T4.2)
    ) {
      return true;
    }
    // Catálogo de leitura é público (frontend consome sem login).
    if (m === "GET" && url.startsWith("/api/v1/midias")) return true;
    // Busca/descoberta pública (frontend de catálogo).
    if (
      m === "GET" &&
      (url.startsWith("/api/v1/search") ||
        url.startsWith("/api/v1/discover") ||
        url.startsWith("/api/v1/trending"))
    ) {
      return true;
    }
    // Coleta admin via x-admin-token — validado no próprio controller
    // (comparação timing-safe), sem depender de cookie de sessão.
    if (m === "POST" && /^\/api\/v1\/midias\/[^/]+\/coletar$/.test(url)) return true;
    // Job diário do MEDIA Score (gatilho admin via x-admin-token).
    if (m === "POST" && /^\/api\/v1\/midias\/score-job$/.test(url)) return true;
    // Listas colaborativas: a visualização por slug é pública (compartilhável).
    if (m === "GET" && /^\/api\/v1\/listas\/[^/]+$/.test(url)) return true;
    return false;
  }
}
