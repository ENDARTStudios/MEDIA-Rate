/* eslint-disable no-console */
import * as Sentry from "@sentry/node";

/**
 * T293 — integração Sentry (free tier) na API.
 *
 * - initSentry(): inicializa quando SENTRY_DSN existe (NO-OP em dev sem DSN).
 * - capturarSentry(): captura exceção com correlationId/user/path/method.
 * - redactEvent(): beforeSend que redige Authorization/cookie/password/token
 *   antes do envio (mesma política de redação do Pino logger).
 *
 * SDK @sentry/node v10 — tracing embutido (tracesSampleRate).
 */

const HEADERS_SENSITIVE = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "proxy-authorization",
]);

const KEY_SENSITIVE =
  /password|passwd|secret|token|authorization|cookie|api[-_]?key|stripe[-_]?key|refresh/i;

export function sentryDsn(): string | undefined {
  return process.env.SENTRY_DSN?.trim() || undefined;
}

export function isSentryEnabled(): boolean {
  return Boolean(sentryDsn());
}

export function initSentry(): boolean {
  const dsn = sentryDsn();
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    sampleRate: 1.0,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    beforeSend: (event) => redactEvent(event) as Sentry.ErrorEvent,
  });
  console.log("[sentry] inicializado (API)");
  return true;
}

/** Redige valores cuja chave é sensível; recursivo em objetos/arrays. */
function redactValue(value: unknown, key?: string): unknown {
  if (typeof value === "string") {
    if (key && KEY_SENSITIVE.test(key)) return "[REDACTED]";
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => redactValue(v));
  if (value && typeof value === "object") return redactObject(value as Record<string, unknown>);
  return value;
}

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (HEADERS_SENSITIVE.has(k.toLowerCase())) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = redactValue(v, k);
    }
  }
  return out;
}

/**
 * beforeSend do Sentry: redige PII (Authorization/cookie/password/token) em
 * headers, body (request.data JSON) e extra, e limita event.user a `id`.
 * Testado em test/sentry-redact.spec.ts.
 */
export function redactEvent(event: unknown): unknown {
  if (!event || typeof event !== "object") return event;
  const e = event as Record<string, unknown>;
  const out: Record<string, unknown> = { ...e };

  const req = e.request as Record<string, unknown> | undefined;
  if (req) {
    const headers = req.headers as Record<string, unknown> | undefined;
    let data = req.data;
    if (typeof data === "string") {
      try {
        data = JSON.stringify(redactValue(JSON.parse(data)));
      } catch {
        // não-JSON — mantém como está
      }
    } else {
      data = redactValue(data);
    }
    out.request = { ...req, headers: headers ? redactObject(headers) : headers, data };
  }

  if (e.extra && typeof e.extra === "object") {
    out.extra = redactObject(e.extra as Record<string, unknown>);
  }

  const user = e.user as Record<string, unknown> | undefined;
  if (user) {
    out.user = { id: typeof user.id === "string" ? user.id : undefined };
  }

  return out;
}

export interface SentryContexto {
  correlationId?: string;
  userId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  error?: string;
}

/**
 * Captura a exceção no Sentry com o contexto de correlação. Retorna o
 * eventId (ou undefined se Sentry não está habilitado).
 */
export function capturarSentry(exception: unknown, ctx: SentryContexto): string | undefined {
  if (!isSentryEnabled()) return undefined;
  const eventId = Sentry.captureException(exception, {
    tags: {
      correlation_id: ctx.correlationId,
      http_path: ctx.path,
      http_method: ctx.method,
      http_status: ctx.statusCode !== undefined ? String(ctx.statusCode) : undefined,
    },
    user: ctx.userId ? { id: ctx.userId } : undefined,
    extra: { correlation_id: ctx.correlationId, error: ctx.error },
  });
  return eventId;
}
