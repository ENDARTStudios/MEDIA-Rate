import type { FastifyCorsOptions } from "@fastify/cors";

export interface CorsConfigOptions {
  /**
   * Lista de origens permitidas. Em producao, sem wildcard.
   * Em desenvolvimento, defaults para http://localhost:3000 e 3001.
   */
  allowedOrigins?: string[];
  /**
   * Quando true (producao), permite credenciais (cookies) e exige
   * origem explicita. Em desenvolvimento, permite credentials para
   * testar cookies de sessao localmente.
   */
  allowCredentials?: boolean;
}

function parseAllowedOrigins(envValue: string | undefined): string[] {
  if (!envValue || envValue.trim().length === 0) {
    return ["http://localhost:3000", "http://localhost:3001"];
  }
  return envValue
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Constroi opcoes de CORS para @fastify/cors.
 *
 * Regras:
 * - Origem verificada por allowlist explicita (sem wildcard em producao).
 * - Em producao (NODE_ENV=production), se ALLOWED_ORIGINS estiver vazio ou
 *   '*', a funcao lanca erro — CORS aberto em producao e falha de
 *   seguranca (Restricao #1 do PROTOCOLO_MESTRE.md).
 * - allowCredentials=true para cookies de sessao funcionarem.
 * - Methods restritos ao que a API usa.
 */
export function buildCorsOptions(overrides: Partial<CorsConfigOptions> = {}): FastifyCorsOptions {
  const isProduction = process.env.NODE_ENV === "production";
  const allowedOrigins =
    overrides.allowedOrigins ?? parseAllowedOrigins(process.env.ALLOWED_ORIGINS);

  if (isProduction) {
    if (allowedOrigins.length === 0) {
      throw new Error(
        "ALLOWED_ORIGINS deve estar definido e nao-vazio em producao (CORS restrito exigido pelo T1.5).",
      );
    }
    if (allowedOrigins.includes("*")) {
      throw new Error(
        "ALLOWED_ORIGINS nao pode conter '*' em producao (CORS aberto e falha de seguranca).",
      );
    }
  }

  return {
    origin: (origin, cb) => {
      // Requisicoes sem header Origin (curl, server-to-server) sao permitidas.
      if (origin === undefined || origin.length === 0) {
        cb(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(new Error(`CORS: origem ${origin} nao permitida`), false);
    },
    credentials: overrides.allowCredentials ?? true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "Idempotency-Key", "X-CSRF-Token"],
    exposedHeaders: ["X-Request-Id"],
    maxAge: 600,
  };
}
