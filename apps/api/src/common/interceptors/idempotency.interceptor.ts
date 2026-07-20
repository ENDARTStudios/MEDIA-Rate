import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  BadRequestException,
} from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Reflector precisa ser import como valor para NestJS DI
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";

import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- PrismaService precisa ser import como valor para NestJS DI
import { PrismaService } from "../../prisma/prisma.service.js";
import { IDEMPOTENT_KEY } from "../decorators/idempotent.decorator.js";

/**
 * Cache em memória para idempotência (T4.3).
 *
 * Em produção multi-instância, migrar para PostgreSQL (tabela
 * `idempotencia_registro`) ou Redis (excluído por Restrição #1).
 * Para Beta single-instance, Map em memória é suficiente.
 *
 * TTL: 24h (conforme RFC draft-ietf-httpapi-idempotency-key-header).
 */
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

interface IdempotencyCacheEntry {
  response: unknown;
  expires_at: number;
}

/**
 * Interceptor de idempotência (T4.3).
 *
 * - Lê metadata @Idempotent() via Reflector.
 * - Se rota é idempotente, exige header `Idempotency-Key`.
 * - Verifica cache em memória; se hit, retorna resposta cacheada.
 * - Se miss, executa handler e cacheia resposta.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly cache = new Map<string, IdempotencyCacheEntry>();

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const isIdempotent = this.reflector.getAllAndOverride<boolean>(IDEMPOTENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!isIdempotent) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const idempotencyKey = request.headers["idempotency-key"] as string | undefined;

    if (!idempotencyKey || idempotencyKey.length === 0) {
      throw new BadRequestException({
        statusCode: 400,
        error: "Bad Request",
        message: "Header 'Idempotency-Key' é obrigatório para esta rota.",
      });
    }

    // Chave de cache composta: método + path + idempotency-key + user_id.
    const userId = (request as unknown as { user?: { id: string } }).user?.id ?? "anonymous";
    const cacheKey = `${request.method}:${request.url}:${userId}:${idempotencyKey}`;

    // Verifica cache.
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires_at > Date.now()) {
      // Retorna resposta cacheada — handler não executa.
      // Observable.of está deprecated; usamos new Observable.
      return new Observable<unknown>((subscriber) => {
        subscriber.next(cached.response);
        subscriber.complete();
      });
    }

    // Executa handler e cacheia resposta.
    return next.handle().pipe(
      tap((response) => {
        this.cache.set(cacheKey, {
          response,
          expires_at: Date.now() + IDEMPOTENCY_TTL_MS,
        });
        // Cleanup periódico (lazy).
        if (this.cache.size > 1000) {
          this.cleanup();
        }
      }),
    );
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.expires_at < now) {
        this.cache.delete(key);
      }
    }
  }
}
