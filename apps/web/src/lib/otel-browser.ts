import { WebTracerProvider, BatchSpanProcessor } from "@opentelemetry/sdk-trace-web";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

let initialized = false;

/**
 * T352 (D-319/D-320) — OpenTelemetry no BROWSER (backend-agnostic, custo zero).
 *
 * - `NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT` presente → exporta traces via
 *   OTLP/HTTP (Grafana Cloud / Jaeger / qualquer collector com CORS).
 * - Ausente (default) → inerte: nenhum overhead, nenhum backend.
 * - Nunca derruba a app: falha de init é capturada (observabilidade é
 *   não-crítica).
 */
export function initOtelBrowser(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const endpoint = process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return;

  try {
    const exporter = new OTLPTraceExporter({ url: endpoint });
    const provider = new WebTracerProvider();
    provider.addSpanProcessor(new BatchSpanProcessor(exporter));
    provider.register();
  } catch (err) {
    console.warn("[otel] falha ao iniciar SDK browser:", String(err));
  }
}
