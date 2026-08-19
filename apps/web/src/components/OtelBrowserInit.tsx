"use client";

import { useEffect } from "react";
import { initOtelBrowser } from "@/lib/otel-browser";

/**
 * T352 — inicia o OpenTelemetry do browser uma única vez, no mount.
 * Inerte por padrão (sem NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT não faz nada).
 */
export function OtelBrowserInit() {
  useEffect(() => {
    initOtelBrowser();
  }, []);

  return null;
}
