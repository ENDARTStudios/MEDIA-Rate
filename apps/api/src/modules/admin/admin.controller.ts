import { Controller, Get, Req, Res, Optional } from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { AdminService } from "./admin.service.js";
import { AuditLogService } from "../../common/audit-log.service.js";
import type { AdminStatsResponse } from "./dto/stats-response.dto.js";

/**
 * AdminController (T221, 4.7) — rotas admin protegidas por RBAC
 * @Roles('ADMIN') (guards globais AuthGuard + RolesGuard).
 *
 * GET /api/v1/admin/stats — métricas REAIS de operação (contagens
 * agregadas), com cache 60s (X-Cache HIT/MISS). Nunca expõe PII.
 */
@ApiTags("admin")
@ApiBearerAuth()
@Controller("api/v1/admin")
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
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
}
