import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * Guard global para redirect HTTP -> HTTPS em producao (T1.1).
 *
 * Implementado como CanActivate (Guard) global porque o NestJS 11
 * envolve o router Fastify de forma que hooks onRequest/preHandler
 * registrados fora do Nest sao sobrescritos. Guard roda dentro do
 * pipeline Nest com garantia de execucao.
 *
 * Estrategia:
 * - Verifica o header x-forwarded-proto (setado por reverse proxies como
 *  Vercel, Render, Cloudflare). Se for 'http', responde 308 (Permanent
 *  Redirect) para a mesma URL em HTTPS.
 * - Em desenvolvimento (NODE_ENV != production), nao faz nada.
 * - Em producao, se o reverse proxy nao setar x-forwarded-proto, o
 *  redirect nao acontece.
 */
@Injectable()
export class HttpsRedirectGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const isProduction = process.env.NODE_ENV === "production";
    if (!isProduction) {
      return true;
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const reply = context.switchToHttp().getResponse<FastifyReply>();

    const forwardedProto = request.headers["x-forwarded-proto"];
    const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;

    if (protocol === "http") {
      const host = request.headers.host;
      if (typeof host === "string" && host.length > 0) {
        const httpsUrl = `https://${host}${request.url}`;
        void reply.redirect(httpsUrl, 308);
        return false; // interrompe pipeline, redirect ja foi enviado
      }
    }
    return true;
  }
}
