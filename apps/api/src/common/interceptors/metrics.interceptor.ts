import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
  HttpException,
} from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";
import { Observable, tap, catchError, throwError } from "rxjs";
import { MetricsService } from "../../modules/metrics/metrics.service.js";

/**
 * MetricsInterceptor (T217, 9.5.2) — coleta automática de métricas HTTP:
 * http_requests_total, http_request_duration_seconds e http_errors_total
 * (5xx), por {método, rota, status}. Sem corpo/headers sensíveis.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const res = context.switchToHttp().getResponse<FastifyReply>();
    const inicio = process.hrtime.bigint();

    const registrar = (status: number) => {
      const duracao = Number(process.hrtime.bigint() - inicio) / 1e9;
      const rota =
        (req as unknown as { routeOptions?: { url?: string } }).routeOptions?.url ??
        req.url ??
        "unknown";
      this.metrics.registrarRequisicao({
        method: req.method ?? "GET",
        route: rota,
        status,
        duracaoSegundos: duracao,
      });
    };

    return next.handle().pipe(
      tap(() => registrar(res.statusCode)),
      catchError((err: unknown) => {
        const status = err instanceof HttpException ? err.getStatus() : 500;
        registrar(status);
        return throwError(() => err);
      }),
    );
  }
}
