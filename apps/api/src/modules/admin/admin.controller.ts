import { Controller, Get, Req, Res, Optional, NotFoundException } from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { AdminService } from "./admin.service.js";
import { FeatureFlagService } from "../flags/feature-flags.service.js";
import { AuditLogService } from "../../common/audit-log.service.js";
import type { AdminStatsResponse } from "./dto/stats-response.dto.js";

/**
 * AdminController (T221, 4.7) — rotas admin protegidas por RBAC
 * @Roles('ADMIN') (guards globais AuthGuard + RolesGuard).
 *
 * GET /api/v1/admin/stats — métricas REAIS de operação (contagens
 * agregadas), com cache 60s (X-Cache HIT/MISS). Nunca expõe PII.
 * GET /api/v1/admin/sentry-test — T293: dispara erro proposital para
 * validar o pipeline do Sentry (flag `admin-sentry-test`, off por padrão).
 */
@ApiTags("admin")
@ApiBearerAuth()
@Controller("api/v1/admin")
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly flags: FeatureFlagService,
    @Optional() private readonly auditLog?: AuditLogService,
  ) {}

  @Get("stats")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Métricas agregadas de operação (admin)" })
  async getStats(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AdminStatsResponse> {
    const { value, hit } = await this.adminService.getStats();
    reply.header("X-Cache", hit ? "HIT" : "MISS");

    // T221: trilha de acesso (opcional, recomendada).
    const user = (req as FastifyRequest & { user?: { id: string } }).user;
    const userAgent = req?.headers?.["user-agent"];
    await this.auditLog?.log({
      entidade: "Admin",
      entidadeId: "stats",
      acao: "ADMIN_STATS_VIEWED",
      usuarioId: user?.id,
      ipOrigem: req?.ip ?? undefined,
      dadosDepois: {
        userAgent: typeof userAgent === "string" ? userAgent : undefined,
      },
    });

    return value;
  }

  /**
   * T293 — valida o pipeline Sentry de ponta a ponta: o erro 500 gerado aqui
   * passa pelo GlobalExceptionFilter, que captura no Sentry e devolve o
   * `sentryEventId` no corpo (visível no painel do Operador em segundos).
   * Flag-gated: `admin-sentry-test` (criar via /flags, off por padrão).
   */
  @Get("sentry-test")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Dispara erro de teste para validar o pipeline do Sentry (flag)" })
  async sentryTest(@Req() req: FastifyRequest): Promise<void> {
    const user = (req as FastifyRequest & { user?: { id?: string } }).user;
    const habilitado = await this.flags.avaliavel(
      "admin-sentry-test",
      { id: user?.id ?? "" },
      { ip: req.ip },
    );
    if (!habilitado) {
      throw new NotFoundException(
        "Endpoint de teste do Sentry desabilitado (flag admin-sentry-test).",
      );
    }
    throw new Error("T293 sentry-test: erro proposital para validar o pipeline do Sentry");
  }
}
