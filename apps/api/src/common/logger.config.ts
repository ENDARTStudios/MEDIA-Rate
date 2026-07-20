import type { Params } from "nestjs-pino";

/**
 * Configuracao do logger estruturado (T1.8).
 *
 * - Usa pino (mais rapido que winston, JSON nativo).
 * - Nivel controlado por LOG_LEVEL (default 'info').
 * - redact: lista de chaves cujo valor e substituido por '[Redacted]'
 *   antes de serializar. Cobertura: cookies, authorization, password*,
 *   password_hash, secret*, token*, sessionId, stripe*.
 * - Em producao: transport='stdio' (JSON puro, fast). Em dev: transport
 *   'pino-pretty' para legibilidade.
 * - Exclui rotas de healthcheck do log de request (ruido).
 */
export function buildLoggerConfig(): Params {
  const isProduction = process.env.NODE_ENV === "production";
  const logLevel = process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug");

  return {
    pinoHttp: {
      level: logLevel,
      transport: isProduction
        ? undefined
        : {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
              ignore: "pid,hostname",
            },
          },
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "req.headers['x-api-key']",
          'req.headers["authorization"]',
          'req.headers["cookie"]',
          "req.body.password",
          "req.body.password_hash",
          "req.body.newPassword",
          "req.body.currentPassword",
          "req.body.sessionSecret",
          "req.body.secret",
          "req.body.token",
          "req.body.refreshToken",
          "req.body.accessToken",
          "req.body.stripe_secret_key",
          "req.body.session_secret",
          "req.body.column_encryption_key",
          'req.body["password"]',
          'req.body["stripe_secret_key"]',
          "res.headers['set-cookie']",
          'res.headers["set-cookie"]',
          "*.password",
          "*.password_hash",
          "*.secret",
          "*.token",
          "*.sessionSecret",
          "*.stripe_secret_key",
        ],
        censor: "[Redacted]",
      },
      // Nao logar /health (ruido em monitoramento ativo)
      autoLogging: {
        ignore: (req) => {
          const url = (req as { url?: string }).url ?? "";
          return url.startsWith("/health");
        },
      },
      // Custom serializers para reduzir ruido
      serializers: {
        req(req: { id?: string; method?: string; url?: string; remoteAddress?: string }) {
          return {
            id: req.id,
            method: req.method,
            url: req.url,
            remoteAddress: req.remoteAddress,
          };
        },
        res(res: { statusCode?: number }) {
          return { statusCode: res.statusCode };
        },
      },
    },
  };
}

/**
 * Lista de chaves redacted — exportada para teste (T1.8 verif).
 */
export const REDACTED_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.body.password",
  "req.body.password_hash",
  "req.body.token",
  "req.body.stripe_secret_key",
  "*.password",
  "*.password_hash",
  "*.secret",
  "*.token",
];
