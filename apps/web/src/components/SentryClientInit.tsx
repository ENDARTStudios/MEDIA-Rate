"use client";

import { useEffect } from "react";

/**
 * T315 — garante a inicialização do SDK do Sentry no BROWSER.
 * O auto-load de `sentry.client.config.ts` pelo @sentry/nextjs v10 não é
 * injetado no bundle client em Next 16/Turbopack — este componente importa
 * o config DINAMICAMENTE no useEffect (só executa no browser, nunca no SSR).
 * Sem DSN (dev), o config é NO-OP por design.
 */
export function SentryClientInit() {
  useEffect(() => {
    void import("../../sentry.client.config").catch(() => undefined);
  }, []);
  return null;
}
