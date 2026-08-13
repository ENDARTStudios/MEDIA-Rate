import * as Sentry from "@sentry/nextjs";
import { sentryRedact } from "./src/lib/sentry-redact";

/**
 * T293 — Sentry client (browser). Sem NEXT_PUBLIC_SENTRY_DSN (dev), NO-OP:
 * o build e o dev server continuam funcionando sem SDK ativo.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    sampleRate: 1.0,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    beforeSend: (event) => sentryRedact(event) as Sentry.ErrorEvent,
  });
}
