import {
  Controller,
  Get,
  Req,
  Res,
  HttpException,
  HttpStatus,
  ForbiddenException,
} from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";
import { MetricsService } from "./metrics.service.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { isAdminTokenValid } from "../../common/admin-token.util.js";

/**
 * GET /metrics — métricas Prometheus (texto).
 *
 * Proteção (T217): IP allowlist (METRICS_ALLOW_IPS, separado por vírgula)
 * OU sessão com papel ADMIN OU X-Admin-Token legado. Non-admin sem IP
 * allowlist → 403. Nunca expõe PII — apenas métricas de infra.
 */
@Controller("metrics")
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getMetrics(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const permitido = await this.autorizado(req);
    if (!permitido) {
      throw new ForbiddenException({
        statusCode: 403,
        error: "Forbidden",
        message: "Acesso negado a /metrics.",
      });
    }

    const texto = await this.metricsService.getMetricsText();
    return reply.type("text/plain").status(200).send(texto);
  }

  private async autorizado(req: FastifyRequest): Promise<boolean> {
    // 1) IP allowlist (METRICS_ALLOW_IPS env, separado por vírgula).
    const allowIps = (process.env.METRICS_ALLOW_IPS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const ip = req.ip ?? "";
    if (allowIps.includes(ip)) return true;

    // 2) Sessão com papel ADMIN (RBAC).
    const user = (req as FastifyRequest & { user?: { id: string } }).user;
    if (user?.id) {
      const papel = await this.prisma.usuarioPapel.findFirst({
        where: { usuario_id: user.id, papel: { nome: "ADMIN" } },
      });
      if (papel) return true;
    }

    // 3) X-Admin-Token legado (ops sem sessão de navegador).
    const rawHeaders = req.raw.headers ?? req.headers;
    const headerToken = Object.entries(rawHeaders).find(
      ([k]) => k.toLowerCase() === "x-admin-token",
    )?.[1] as string | undefined;
    if (isAdminTokenValid(headerToken)) return true;

    return false;
  }
}
