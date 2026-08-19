import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-node";
import { PrismaInstrumentation } from "@prisma/instrumentation";

/**
 * T352 (D-319/D-320) — OpenTelemetry (backend-agnostic, custo zero).
 *
 * - `OTEL_EXPORTER_OTLP_ENDPOINT` presente → exporta via OTLP/HTTP (Grafana
 *   Cloud free, Jaeger self-hosted, ou qualquer collector).
 * - Ausente (dev) → ConsoleSpanExporter (traces no stdout).
 * - Nunca derruba a app: falha de init é capturada (observabilidade é
 *   não-crítica).
 *
 * SEGURANÇA: antes de exportar, os instrumentations padrão NÃO exportam
 * headers de auth/body (OpenTelemetry omite headers sensíveis por padrão).
 * A redação explícita de PII (mesma política Pino/Sentry) é aplicada nas
 * métricas customizadas quando houver.
 */
const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

const traceExporter = endpoint
  ? new OTLPTraceExporter({ url: endpoint })
  : new ConsoleSpanExporter();

export const otelSdk = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME ?? "media-rate-api",
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations(), new PrismaInstrumentation()],
});

try {
  otelSdk.start();
} catch (err) {
  // Observabilidade não pode impedir o boot da aplicação.
  console.warn("[otel] falha ao iniciar SDK:", String(err));
}
