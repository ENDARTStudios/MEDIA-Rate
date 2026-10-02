import { FastifyRateLimitOptions } from "@fastify/rate-limit";
import type { FastifyRequest } from "fastify";
import { createHash } from "node:crypto";

export interface RateLimitConfigOptions {
  apiPerMinute?: number;
  loginPerMinute?: number;
  /** Fábrica do cliente Redis (ioredis) — resolvida tardiamente pelo main.ts. */
  redisFactory?: () => unknown;
  /** Injetável para testes (relógio). */
  now?: () => number;
}

/**
 * Boas práticas de rate limiting (review Operador, 2026-09-27; D-558):
 * 1. Chave por SESSÃO (cookie `sess`, hasheado) quando presente; IP só para anônimos —
 *    o `req.user` não existe no hook onRequest (guard roda depois), por isso a
 *    identidade vem do cookie, com hash para não persistir token cru na chave.
 * 2. Limites diferenciados nas rotas críticas de auth: login/forgot/reset/resend 6/min,
 *    refresh 10/min, register 5/min (faixa recomendada 5-10/min).
 * 3. Algoritmo: SLIDING WINDOW (log ZSET no Redis; fallback em memória local quando
 *    Redis indisponível — nunca fail-open silencioso). A dívida técnica da store
 *    custom (T020/T021: "Store is not a constructor") foi resolvida: o plugin v11
 *    aceita `store:` como CONSTRUTOR e a classe abaixo honra `incr(key, cb, window, max)`
 *    + `child(routeOptions)` (chaves já incluem a rota, então child retorna `this`).
 * 4. 429 com envelope padronizado (correlationId/timestamp) e header `Retry-After`
 *    (setado pelo próprio plugin quando o limite é excedido).
 */

/** Janela deslizante: log de timestamps por chave em ZSET Redis + fallback memória. */
export class SlidingWindowRateLimitStore {
  private readonly redisFactory?: () => unknown;
  private readonly now: () => number;
  private readonly memoria = new Map<string, number[]>();

  constructor(opcoes: { redis?: () => unknown; now?: () => number } = {}) {
    this.redisFactory = opcoes.redis;
    this.now = opcoes.now ?? (() => Date.now());
  }

  // Assinatura exigida pelo @fastify/rate-limit v11 (store custom).
  incr(
    key: string,
    callback: (error: Error | null, result?: { current: number; ttl: number }) => void,
    timeWindow: number,
    _max: number,
  ): void {
    const agora = this.now();
    const redis = this.redisFactory?.() ?? null;
    void this.incrRedis(redis, key, agora, timeWindow)
      .then((current) => callback(null, { current, ttl: timeWindow }))
      .catch(() =>
        callback(null, { current: this.incrMemoria(key, agora, timeWindow), ttl: timeWindow }),
      );
  }

  // As chaves já incluem a rota (keyGenerator), então todas as rotas compartilham a store.
  child(_routeOptions: { path: string; prefix: string }): SlidingWindowRateLimitStore {
    return this;
  }

  private async incrRedis(
    redis: unknown,
    key: string,
    agora: number,
    timeWindow: number,
  ): Promise<number> {
    if (!redis || typeof (redis as { multi?: unknown }).multi !== "function") {
      throw new Error("sem cliente redis compatível");
    }
    const membro = `${agora}:${Math.random().toString(36).slice(2, 10)}`;
    // Pipeline: limpa fora da janela → adiciona → TTL de segurança → conta.
    interface ZsetPipeline {
      zremrangebyscore(key: string, min: number, max: number): ZsetPipeline;
      zadd(key: string, score: number, member: string): ZsetPipeline;
      pexpire(key: string, ms: number): ZsetPipeline;
      zcard(key: string): ZsetPipeline;
      exec(): Promise<[Error | null, unknown][]>;
    }
    const res = (await (redis as { multi: () => ZsetPipeline })
      .multi()
      .zremrangebyscore(key, 0, agora - timeWindow)
      .zadd(key, agora, membro)
      .pexpire(key, timeWindow + 60_000)
      .zcard(key)
      .exec()) as [Error | null, unknown][];
    const atual = (res?.[3]?.[1] ?? 0) as number;
    if (!Number.isFinite(atual)) throw new Error("resposta zcard inesperada");
    return atual;
  }

  private incrMemoria(key: string, agora: number, timeWindow: number): number {
    const janelaMinima = agora - timeWindow;
    const entradas = (this.memoria.get(key) ?? []).filter((t) => t > janelaMinima);
    entradas.push(agora);
    this.memoria.set(key, entradas);
    if (this.memoria.size > 50_000) {
      // Higiene: sem Redis, evita crescimento sem limite em ataques de chave única.
      for (const [k, v] of this.memoria) {
        if (v.every((t) => t <= janelaMinima)) this.memoria.delete(k);
      }
    }
    return entradas.length;
  }
}

function envInt(key: string, fallback: number): number {
  const value = process.env[key];
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Constroi opcoes de rate limit para @fastify/rate-limit (D-558).
 *
 * - Global 100/min (RATE_LIMIT_API_PER_MIN); per-route: login/forgot/reset/resend
 *   6/min, refresh 10/min, register 5/min, upload 10/min, discover/watchlist 30/min,
 *   interacoes 60/min.
 * - Store: sliding window (Redis ZSET + fallback memória). Sem `redisFactory`,
 *   o fallback em memória é usado (dev/test).
 * - skipOnError irrelevante: a store nunca rejeita (fallback interno conta igual).
 */
export function buildRateLimitOptions(
  overrides: Partial<RateLimitConfigOptions> = {},
): FastifyRateLimitOptions {
  const apiPerMinute = overrides.apiPerMinute ?? envInt("RATE_LIMIT_API_PER_MIN", 100);

  const opcoes: FastifyRateLimitOptions = {
    global: true,
    max: apiPerMinute,
    timeWindow: 60_000,
    keyGenerator: (req: FastifyRequest) => {
      const ip = req.ip ?? "unknown";
      const rawUrl = (req as unknown as Record<string, unknown>).raw
        ? (((req as unknown as Record<string, unknown>).raw as Record<string, string>).url ?? "/")
        : (req.url ?? "/");
      const route = rawUrl.split("?")[0] ?? "/";
      // Sessão via cookie (disponível no onRequest via @fastify/cookie) — o
      // req.user só é anexado pelo AuthGuard DEPOIS do rate limit.
      const sess = (req as unknown as { cookies?: Record<string, string> }).cookies?.sess;
      if (sess) {
        const hash = createHash("sha256").update(sess).digest("hex").slice(0, 32);
        return `rl:u:${hash}:${route}`;
      }
      return `rl:ip:${ip}:${route}`;
    },
    errorResponseBuilder: (req: FastifyRequest, context: { max: number; ttl: number }) => {
      return {
        statusCode: 429,
        error: "Too Many Requests",
        message: `Limite de ${context.max} requisicoes por ${Math.round((context.ttl ?? 60_000) / 1000)}s atingido. Tente novamente em breve.`,
        correlationId: (req as unknown as { id?: string }).id,
        timestamp: new Date().toISOString(),
      };
    },
  };

  // D-558: sliding window com fallback em memória (a store nunca falha o request).
  // O plugin espera o CONSTRUTOR (`new Store(globalParams)`) — uma função que
  // RETORNA o objeto já satisfaz o `new` (constructor-return) e devolve a
  // instância real com redis/now injetados (a dívida T020/T021 era shape errado:
  // instância ≠ classe/fábrica).
  const redisFactory = overrides.redisFactory;
  const nowOverride = overrides.now;
  function slidingWindowStorePlugin(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _globalParams: unknown,
  ): SlidingWindowRateLimitStore {
    return new SlidingWindowRateLimitStore({ redis: redisFactory, now: nowOverride });
  }
  return { ...opcoes, store: slidingWindowStorePlugin } as unknown as FastifyRateLimitOptions;
}

export function loginRateLimit(): { max: number; timeWindow: string } {
  const loginPerMinute = envInt("RATE_LIMIT_LOGIN_PER_MIN", 6);
  return { max: loginPerMinute, timeWindow: "1 minute" };
}

/** Cadastro (rota crítica): 5/min por sessão/IP — faixa recomendada 5-10/min. */
export function registerRateLimit(): { max: number; timeWindow: string } {
  const registerPerMinute = envInt("RATE_LIMIT_REGISTER_PER_MIN", 5);
  return { max: registerPerMinute, timeWindow: "1 minute" };
}

export function uploadRateLimit(): { max: number; timeWindow: string } {
  return { max: 10, timeWindow: "1 minute" };
}

export function discoverRateLimit(): { max: number; timeWindow: string } {
  return { max: 30, timeWindow: "1 minute" };
}

/**
 * T207 — watchlist (CRUD por usuário): 30 req/min por rota (o keyGenerator
 * global já chaveia por sessão+rota).
 */
export function watchlistRateLimit(): { max: number; timeWindow: string } {
  return { max: 30, timeWindow: "1 minute" };
}

/**
 * T212 — POST /auth/refresh (público): 10 req/min por IP.
 */
export function refreshRateLimit(): { max: number; timeWindow: string } {
  return { max: 10, timeWindow: "1 minute" };
}

/**
 * T198 — PUT /interacoes por usuário: escrita de sinal é operação de alta
 * fricção proibida de ser spammada (o keyGenerator global já chaveia por
 * sessão+rota — aqui só apertamos a janela por rota).
 */
export function interacoesRateLimit(): { max: number; timeWindow: string } {
  return { max: 60, timeWindow: "1 minute" };
}

/**
 * T473 (auditoria 2026-09-04, P1) — GET /user/data: exportação LGPD agrega
 * 9 relações por chamada; limite dedicado mais apertado que o global
 * (o keyGenerator global já chaveia por user+rota).
 */
export function userRightsRateLimit(): { max: number; timeWindow: string } {
  const userRightsPerMinute = envInt("RATE_LIMIT_USER_RIGHTS_PER_MIN", 6);
  return { max: userRightsPerMinute, timeWindow: "1 minute" };
}
