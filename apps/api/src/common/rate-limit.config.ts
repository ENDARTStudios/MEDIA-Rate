import { FastifyRateLimitOptions } from "@fastify/rate-limit";
import type { FastifyRequest } from "fastify";

export interface RateLimitConfigOptions {
  apiPerMinute?: number;
  loginPerMinute?: number;
  redis?: unknown;
}

/**
 * Interface minima para o cliente ioredis usado pelo @fastify/rate-limit.
 * O plugin usa incr + pexpire como store nativa de Redis. Basta um objeto
 * com esses metodos — sem precisar de constructable class.
 */
interface RateLimitRedisClient {
  incr(key: string): Promise<number>;
  pexpire(key: string, ms: number): Promise<number>;
}

function isRateLimitRedis(obj: unknown): obj is RateLimitRedisClient {
  if (!obj || typeof obj !== "object") return false;
  const r = obj as Record<string, unknown>;
  return typeof r.incr === "function" && typeof r.pexpire === "function";
}

function envInt(key: string, fallback: number): number {
  const value = process.env[key];
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Constroi opcoes de rate limit para @fastify/rate-limit.
 *
 * T020/7.3 + T035:
 * - Store: Redis nativo do @fastify/rate-limit (INCR + PEXPIRE, janela fixa).
 *   DIVIDA TECNICA: O sliding window via ZSET foi removido (T020/T021) porque a
 *   store custom (RedisSlidingWindowStore) nao era compativel com a API v11 do
 *   @fastify/rate-limit (Store is not a constructor). Reintroduzir sliding window
 *   quando o plugin suportar store como instancia ou migrar para outro rate-limiter.
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
      const rawUrl = (req as unknown as Record<string, unknown>).raw
        ? (((req as unknown as Record<string, unknown>).raw as Record<string, string>).url ?? "/")
        : (req.url ?? "/");
      const route = rawUrl.split("?")[0] ?? "/";
      const userId = (req as unknown as { user?: { id: string } }).user?.id;
      if (userId) {
        return `rl:${userId}:${route}`;
      }
      return `rl:${ip}:${route}`;
    },
    errorResponseBuilder: (_req: FastifyRequest, context: { max: number; ttl: number }) => {
      return {
        statusCode: 429,
        error: "Too Many Requests",
        message: `Limite de ${context.max} requisicoes por ${Math.round((context.ttl ?? 60_000) / 1000)}s atingido. Tente novamente em breve.`,
      };
    },
    ...(redis && isRateLimitRedis(redis) ? { redis: redis as RateLimitRedisClient } : {}),
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

/**
 * T207 — watchlist (CRUD por usuário): 30 req/min por rota (o keyGenerator
 * global já chaveia por user+rota).
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
 * user+rota — aqui só apertamos a janela por rota).
 */
export function interacoesRateLimit(): { max: number; timeWindow: string } {
  return { max: 60, timeWindow: "1 minute" };
}
