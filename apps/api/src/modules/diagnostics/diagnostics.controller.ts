import { Controller, Get, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import type { FastifyRequest } from "fastify";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { AuditLogService } from "../../common/audit-log.service.js";
import { DiagnosticsService, type DiagnosticsResponse } from "./diagnostics.service.js";

/**
 * T329 — painel de diagnóstico interno (somente leitura).
 *
 * GET /api/v1/admin/diagnostics — estado operacional + contagens agregadas.
 * RBAC @Roles('ADMIN') (guards globais AuthGuard + RolesGuard). Nunca PII.
 */
@ApiTags("diagnostics")
@ApiBearerAuth()
@Controller("api/v1/admin/diagnostics")
export class DiagnosticsController {
  constructor(
    private readonly diagnostics: DiagnosticsService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get()
  @Roles("ADMIN")
  @ApiOperation({ summary: "Diagnóstico operacional (admin, somente leitura)" })
  async getDiagnostics(@Req() req: FastifyRequest): Promise<DiagnosticsResponse> {
    const user = (req as FastifyRequest & { user?: { id: string } }).user;
    await this.auditLog.log({
      entidade: "Diagnostics",
      entidadeId: "diagnostics",
      acao: "DIAGNOSTICS_VIEWED",
      usuarioId: user?.id,
      ipOrigem: req?.ip ?? undefined,
    });
    return this.diagnostics.diagnosticar();
  }
}
