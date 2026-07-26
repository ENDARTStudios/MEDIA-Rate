import { Injectable, Logger } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service.js";

/**
 * Health check service (T9.5 / T036 — liveness resiliente).
 *
 * T036: O check de DB usa timeout de 1500ms via Promise.race.
 * Se o DB nao responder no tempo, retorna "degraded" no body
 * mas SEMPRE retorna HTTP 200. O Railway usa /health como probe
 * de liveness — o probe recebe 200 enquanto o processo esta de pe.
 */
@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private readonly startedAt = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<{
    status: "ok" | "degraded";
    uptime: number;
    version: string;
    timestamp: string;
    checks: {
      database: { status: "ok" | "degraded" | "down"; latency_ms: number | null };
      api: { status: "ok" };
    };
  }> {
    const checks = {
      database: { status: "down" as "ok" | "degraded" | "down", latency_ms: null as number | null },
      api: { status: "ok" as const },
    };

    try {
      const start = Date.now();
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error("db check timeout")), 1_500)),
      ]);
      checks.database = { status: "ok", latency_ms: Date.now() - start };
    } catch {
      checks.database = { status: "degraded", latency_ms: null };
    }

    return {
      status: "ok", // Sempre 200 — probe de liveness
      uptime: Math.round((Date.now() - this.startedAt) / 1000),
      version: process.env.npm_package_version ?? "0.1.0",
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
