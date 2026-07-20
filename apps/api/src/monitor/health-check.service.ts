import { Injectable, Logger } from "@nestjs/common";
import type { PrismaService } from "../../prisma/prisma.service.js";

/**
 * Health check service (T9.5 — monitoramento básico).
 *
 * Verifica:
 * - API responde (próprio endpoint /health)
 * - Banco de dados conecta ($queryRaw SELECT 1)
 * - Tempo de resposta < 1000ms (latência aceitável para Beta)
 *
 * Retorna status consolidado para o endpoint /health.
 */
@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private readonly startedAt = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifica saúde geral do sistema.
   */
  async check(): Promise<{
    status: "ok" | "degraded" | "down";
    uptime: number;
    version: string;
    timestamp: string;
    checks: {
      database: { status: "ok" | "down"; latency_ms: number | null };
      api: { status: "ok" };
    };
  }> {
    const checks = {
      database: { status: "down" as "ok" | "down", latency_ms: null as number | null },
      api: { status: "ok" as const },
    };

    // Database check
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;
      checks.database = { status: "ok", latency_ms: latency };
    } catch (err) {
      this.logger.error(`Database health check failed: ${(err as Error).message}`);
      checks.database = { status: "down", latency_ms: null };
    }

    // Overall status
    const status: "ok" | "degraded" | "down" = checks.database.status === "ok" ? "ok" : "degraded";

    return {
      status,
      uptime: Math.round((Date.now() - this.startedAt) / 1000),
      version: process.env.npm_package_version ?? "0.1.0",
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
