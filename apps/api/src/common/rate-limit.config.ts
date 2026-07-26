import type { FastifyRateLimitOptions } from "@fastify/rate-limit";
import type { FastifyRequest } from "fastify";

export interface RateLimitConfigOptions {
  apiPerMinute?: number;
  loginPerMinute?: number;
  redis?: unknown;
}

interface RedisSliding {
  multi(): RedisSliding;
  zremrangebyscore(key: string, min: number, max: number): RedisSliding;
  zadd(key: string, score: string, member: string): RedisSliding;
  zcard(key: string): RedisSliding;
  pexpire(key: string, ms: number): RedisSliding;
  exec(): Promise<Array<[Error | null, unknown]>>;
}

function isRedisSliding(obj: unknown): obj is RedisSliding {
  if (!obj || typeof obj !== "object") return false;
  const r = obj as Record<string, unknown>;
  return typeof r.multi === "function" && typeof r.zadd === "function";
}

function envInt(key: string, fallback: number): number {
  const value = process.env[key];
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

let memberCounter = 0;

/**
 * Store Redis com sliding window via sorted set (ZADD + ZREMRANGEBYSCORE + ZCARD).
 * T020/7.3 — True sliding window: cada requisicao e registrada como entrada no ZSET
 * com timestamp como score. Entradas fora da janela sao removidas antes da contagem.
 *
 * Fallback: se Redis nao disponivel, @fastify/rate-limit usa store em memoria padrao.
 */
class RedisSlidingWindowStore {
  constructor(private readonly redis: RedisSliding) {}

  incr(
    key: string,
    cb: (err: Error | null, current: number, ttl: number, max: number) => void,
    max: number,
    timeWindow: number,
  ): void {
    const now = Date.now();
    const cutoff = now - timeWindow;
    const member = `${now}:${(memberCounter++).toString(36)}`;

    void this.redis
      .multi()
      .zremrangebyscore(key, 0, cutoff)
      .zadd(key, now.toString(), member)
      .zcard(key)
      .pexpire(key, timeWindow)
      .exec()
      .then((results) => {
        const current = (results?.[2]?.[1] as number) ?? 0;
        cb(null, current, Math.ceil(timeWindow / 1000), max);
      })
      .catch(() => {
        cb(null, 0, Math.ceil(timeWindow / 1000), max);
      });
  }

  child(
    _routeOptions: FastifyRateLimitOptions,
    cb: (err: Error | null, current: number, ttl: number, max: number, newKey: string) => void,
  ): void {
    cb(null, 0, 60, 100, "");
  }
}

/**
 * Constroi opcoes de rate limit para @fastify/rate-limit.
 *
 * T020/7.3 — Rate limit avancado (revisado T021):
 * - Sliding window real via Redis ZSET (ZADD + ZREMRANGEBYSCORE + ZCARD).
 *   Cada requisicao registra timestamp no sorted set; entradas expiradas sao removidas.
 * - Store: Redis (ioredis) quando disponivel; fallback para memoria local.
 * - Key generator: rl:{userId}:{rota} autenticado, rl:{ip}:{rota} anonimo.
 * - Per-route: loginRateLimit() 6/min, uploadRateLimit() 10/min, discoverRateLimit() 30/min.
 * - Global: 100/min via RATE_LIMIT_API_PER_MIN.
 */
export function buildRateLimitOptions(
  overrides: Partial<RateLimitConfigOptions> = {},
): FastifyRateLimitOptions {
  const apiPerMinute = overrides.apiPerMinute ?? envInt("RATE_LIMIT_API_PER_MIN", 100);
  const redis = overrides.redis;

  return {
    global: true,
    max: apiPerMinute,
    timeWindow: 60_000,
    keyGenerator: (req: FastifyRequest) => {
      const ip = req.ip ?? "unknown";
      const rawUrl = (req as Record<string, unknown>).raw
        ? ((req as Record<string, unknown>).raw as Record<string, string>).url ?? "/"
        : (req.url ?? "/");
      const route = rawUrl.split("?")[0]!;
      const userId = (req as unknown as { user?: { id: string } }).user?.id;
      if (userId) {
        return `rl:${userId}:${route}`;
      }
      return `rl:${ip}:${route}`;
    },
    errorResponseBuilder: (_req, context) => {
      return {
        statusCode: 429,
        error: "Too Many Requests",
        message: `Limite de ${context.max} requisicoes por ${Math.round((context.ttl ?? 60_000) / 1000)}s atingido. Tente novamente em breve.`,
      };
    },
    ...(redis && isRedisSliding(redis)
      ? { store: new RedisSlidingWindowStore(redis as RedisSliding) }
      : {}),
  };
}

export function loginRateLimit(): { max: number; timeWindow: string } {
  const loginPerMinute = envInt("RATE_LIMIT_LOGIN_PER_MIN", 6);
  return { max: loginPerMinute, timeWindow: "1 minute" };
}

export function uploadRateLimit(): { max: number; timeWindow: string } {
  return { max: 10, timeWindow: "1 minute" };
}

export function discoverRateLimit(): { max: number; timeWindow: string } {
  return { max: 30, timeWindow: "1 minute" };
}
