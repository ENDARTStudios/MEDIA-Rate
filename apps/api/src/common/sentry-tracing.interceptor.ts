import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { tap, type Observable } from "rxjs";
import { iniciarTransacaoHttp } from "./sentry.js";

/**
 * T452 — transações HTTP no Sentry (performance tracing server-side).
 *
 * Abre uma transação `http.server` por requisição (nome = método + rota) e a
 * encerra no finalize do observable, registrando o status code. É no-op quando
 * o Sentry está desabilitado (sem SENTRY_DSN) — `iniciarTransacaoHttp` devolve
 * null e o handler segue sem overhead.
 */
@Injectable()
export class SentryTracingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<FastifyRequest>();
    const route =
      (req as FastifyRequest & { routeOptions?: { url?: string } }).routeOptions?.url ?? req.url;
    const span = iniciarTransacaoHttp(req.method, route);
    if (!span) return next.handle();
    return next.handle().pipe(
      tap({
        finalize: () => {
          const reply = http.getResponse<FastifyReply>();
          span.setAttribute("http.status_code", reply.statusCode);
          span.end();
        },
      }),
    );
  }
}
