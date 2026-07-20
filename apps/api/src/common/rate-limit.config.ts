import type { FastifyRateLimitOptions } from "@fastify/rate-limit";

export interface RateLimitConfigOptions {
  /**
   * Limite global (janela 60s) para APIs gerais.
   * Default: 100 req/min por IP.
   */
  apiPerMinute?: number;
  /**
   * Limite para rotas de autenticacao (login, reset password).
   * Default: 6 tentativas/min por IP.
   */
  loginPerMinute?: number;
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
 * Estrategia:
 * - Limite global (key generator por IP) de 100 req/min para APIs gerais.
 * - Rotas de autenticacao marcam `config.rateLimit.login=true` para
 *   receberem limite de 6 req/min (brute force protection).
 * - trustProxy habilitado (ja no FastifyAdapter) para ler X-Forwarded-For
 *   corretamente quando atras de reverse proxy.
 */
export function buildRateLimitOptions(
  overrides: Partial<RateLimitConfigOptions> = {},
): FastifyRateLimitOptions {
  const apiPerMinute = overrides.apiPerMinute ?? envInt("RATE_LIMIT_API_PER_MIN", 100);

  return {
    global: true,
    max: apiPerMinute,
    timeWindow: "1 minute",
    keyGenerator: (req) => {
      // Em producao atras de reverse proxy, req.ip ja vem do trustProxy.
      // Fallback para socket se req.ip ausente (nao deveria acontecer).
      return req.ip ?? req.socket?.remoteAddress ?? "unknown";
    },
    errorResponseBuilder: (_req, context) => {
      return {
        statusCode: 429,
        error: "Too Many Requests",
        message: `Limite de ${context.max} requisicoes por ${context.after} atingido. Tente novamente em ${Math.ceil((context.ttl as number) / 1000)} segundos.`,
      };
    },
    // Hook para permitir rotas com limite customizado (login).
    // Rotas com { config: { rateLimit: { max: 6, timeWindow: '1 minute' } } }
    // sobrescrevem o global.
    onExceeded: undefined,
  };
}

/**
 * Config de rate limit para rotas de autenticacao (login).
 * Use como `@Controller('auth', { get rateLimit() { return loginRateLimit(); } })`
 * ou via decorator.
 */
export function loginRateLimit(): { max: number; timeWindow: string } {
  const loginPerMinute = envInt("RATE_LIMIT_LOGIN_PER_MIN", 6);
  return { max: loginPerMinute, timeWindow: "1 minute" };
}
