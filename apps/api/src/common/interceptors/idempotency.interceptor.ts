import {
  CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  BadRequestException,
} from "@nestjs/common";

import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";

import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

import { IDEMPOTENT_KEY } from "../decorators/idempotent.decorator.js";
import { IdempotencyStore } from "../idempotency/idempotency.store.js";

/** Métodos que mudam estado — só esses fazem sentido para idempotência. */
const METODOS_MUTAVEIS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * T326 — Interceptor de idempotência (header `Idempotency-Key`).
 *
 * - Só atua em métodos mutantes e APÓS autenticação (req.user presente).
 * - Rota marcada com @Idempotent(): a chave é OBRIGATÓRIA (400 se ausente).
 * - Demais rotas mutantes autenticadas: se a chave ESTIVER presente, o replay
 *   da mesma chave retorna a resposta cacheada sem re-executar o caso de uso;
 *   sem chave, segue sem idempotência (contrato HTTP inalterado).
 * - A chave de cache é composta por user_id + método + URL + chave, e é
 *   hasheada no store (nunca guardamos a chave crua nem o corpo).
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly store: IdempotencyStore,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const method = (request.method ?? "GET").toUpperCase();
    if (!METODOS_MUTAVEIS.has(method)) {
      return next.handle();
    }

    const isIdempotent = this.reflector.getAllAndOverride<boolean>(IDEMPOTENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const raw = request.headers["idempotency-key"];
    const key = Array.isArray(raw) ? raw[0] : raw;

    // Rota @Idempotent() exige a chave (contrato preservado).
    if (isIdempotent && (!key || key.length === 0)) {
      throw new BadRequestException({
        statusCode: 400,
        error: "Bad Request",
        message: "Header 'Idempotency-Key' é obrigatório para esta rota.",
      });
    }

    const userId = (request as unknown as { user?: { id: string } }).user?.id;
    // Sem autenticação ou sem chave → sem idempotência (passa direto).
    if (!userId || !key || key.length === 0) {
      return next.handle();
    }
    if (key.length > 256) {
      throw new BadRequestException({
        statusCode: 400,
        error: "Bad Request",
        message: "Header 'Idempotency-Key' muito longo.",
      });
    }

    const composite = `${userId}:${method}:${request.url}:${key}`;

    const cached = this.store.get(composite);
    if (cached !== undefined) {
      // Replay: retorna a resposta cacheada sem re-executar o handler.
      return new Observable<unknown>((subscriber) => {
        subscriber.next(cached);
        subscriber.complete();
      });
    }

    return next.handle().pipe(
      tap((response) => {
        // Só cacheia resposta de sucesso — erro propaga sem gravar (tap não roda no erro).
        this.store.set(composite, response);
      }),
    );
  }
}
