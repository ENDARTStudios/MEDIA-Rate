import { Injectable, Logger } from "@nestjs/common";
import { Registry, Counter, Histogram, collectDefaultMetrics } from "prom-client";
import { AlertsService } from "./alerts.service.js";

interface MetricsSnapshot {
  uptime_seconds: number;
  requests_total: number;
  requests_5xx: number;
  watchlist_adds: number;
  watchlist_moves: number;
  watchlist_removes: number;
  auth_registers: number;
  auth_logins: number;
  auth_logouts: number;
  db_queries_total: number;
  db_errors: number;
  memory_mb: number;
  timestamp: string;
}

/**
 * MetricsService (T217, 9.5.2) — métricas Prometheus.
 *
 * - http_requests_total: counter por {método, rota, status} — alimentado
 *   pelo MetricsInterceptor (intercepta toda requisição).
 * - http_request_duration_seconds: histograma (buckets 0.01..5).
 * - http_errors_total: counter de respostas 5xx.
 * - Coleta também métricas de processo (default metrics do prom-client:
 *   event loop, memória, etc.).
 * - getMetrics() retorna o formato de texto Prometheus.
 * - Métricas apenas de INFRA — nunca PII/contagem de usuários/emails.
 * - Contadores legados (watchlist_adds, auth_*) mantidos para compat.
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly registry = new Registry();
  private counters = {
    requests_total: 0,
    requests_5xx: 0,
    watchlist_adds: 0,
    watchlist_moves: 0,
    watchlist_removes: 0,
    auth_registers: 0,
    auth_logins: 0,
    auth_logouts: 0,
    db_queries_total: 0,
    db_errors: 0,
  };

  private startTime = Date.now();

  readonly httpRequestsTotal = new Counter({
    name: "http_requests_total",
    help: "Total de requisições HTTP por método, rota e status.",
    labelNames: ["method", "route", "status"] as const,
    registers: [this.registry],
  });

  readonly httpRequestDurationSeconds = new Histogram({
    name: "http_request_duration_seconds",
    help: "Duração das requisições HTTP em segundos.",
    labelNames: ["method", "route"] as const,
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [this.registry],
  });

  readonly httpErrorsTotal = new Counter({
    name: "http_errors_total",
    help: "Total de respostas com erro 5xx.",
    labelNames: ["method", "route", "status"] as const,
    registers: [this.registry],
  });

  constructor(private readonly alerts: AlertsService) {
    try {
      collectDefaultMetrics({ register: this.registry, prefix: "app_" });
    } catch (err) {
      this.logger.warn(`collectDefaultMetrics falhou (não-bloqueante): ${String(err)}`);
    }
  }

  /** T217: registra uma requisição finalizada (do interceptor). */
  registrarRequisicao(params: {
    method: string;
    route: string;
    status: number;
    duracaoSegundos: number;
  }): void {
    const { method, route, status } = params;
    this.httpRequestsTotal.inc({ method, route, status: String(status) });
    this.httpRequestDurationSeconds.observe({ method, route }, params.duracaoSegundos);
    if (status >= 500) {
      this.httpErrorsTotal.inc({ method, route, status: String(status) });
      this.counters.requests_5xx++;
    }
    this.counters.requests_total++;
    // T218: alimenta os alertas (janela deslizante 5xx / total).
    this.alerts.registrarRequisicao(status);
  }

  incrementRequest() {
    this.counters.requests_total++;
  }
  increment5xx() {
    this.counters.requests_5xx++;
  }
  incrementWatchlistAdd() {
    this.counters.watchlist_adds++;
  }
  incrementWatchlistMove() {
    this.counters.watchlist_moves++;
  }
  incrementWatchlistRemove() {
    this.counters.watchlist_removes++;
  }
  incrementRegister() {
    this.counters.auth_registers++;
  }
  incrementLogin() {
    this.counters.auth_logins++;
  }
  incrementLogout() {
    this.counters.auth_logouts++;
  }
  incrementDbQuery() {
    this.counters.db_queries_total++;
  }
  incrementDbError() {
    this.counters.db_errors++;
  }

  /** T217: formato de texto Prometheus (GET /metrics). */
  async getMetricsText(): Promise<string> {
    return this.registry.metrics();
  }

  /** Snapshot legado (compat) — usado por health/ops antigos. */
  async getMetrics(): Promise<MetricsSnapshot> {
    const mem = process.memoryUsage();
    return {
      uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
      ...this.counters,
      memory_mb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      timestamp: new Date().toISOString(),
    };
  }
}
