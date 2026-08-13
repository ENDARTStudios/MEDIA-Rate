/**
 * T293 — redação de PII antes do envio ao Sentry (beforeSend) no web.
 * Mesma política do Pino logger (API): Authorization/cookie/password/token
 * nunca saem do runtime.
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

export function sentryRedact(event: unknown): unknown {
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
