import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  Req,
  Res,
  Optional,
  NotFoundException,
} from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { z } from "zod";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { ZodValidationPipe } from "../../common/zod-validation.pipe.js";
import { UuidParamPipe } from "../../common/pipes/uuid-param.pipe.js";
import { AdminService } from "./admin.service.js";
import { FeatureFlagService } from "../flags/feature-flags.service.js";
import { AuditLogService } from "../../common/audit-log.service.js";
import { LgpdPurgeService } from "../lgpd/lgpd-purge.service.js";
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
    @Optional() private readonly lgpdPurge?: LgpdPurgeService,
  ) {}

  /**
   * T156/J-002-A — gatilho MANUAL da purga LGPD (o cron diário é o executor
   * primário; este endpoint dá evidência e agilidade ao admin). Executa o
   * mesmo lote do worker: elimina definitivamente usuários com a carência
   * de 30 dias expirada (cascata conforme MATRIZ-PROPAGACAO-OPERADORES.md).
   */
  @Post("lgpd/purge")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Executa a purga LGPD dos usuários com carência expirada (admin)" })
  async purgeLgpd(): Promise<{ verificados: number; purgados: number; falhas: number }> {
    if (!this.lgpdPurge) {
      throw new NotFoundException("LgpdPurgeService indisponível.");
    }
    return this.lgpdPurge.purgeExpirados();
  }

  // ===== Onda 1 admin (P0) — gestão de usuários =====

  private static listarUsuariosQuery = z.object({
    q: z.string().trim().min(1).max(120).optional(),
    plano: z.enum(["FREE", "PLUS", "PREMIUM"]).optional(),
    page: z.coerce.number().int().min(0).default(0),
  });

  @Get("usuarios")
  @Roles("ADMIN")
  @ApiOperation({
    summary: "Lista usuários com busca por nome/email e filtro por plano (admin)",
  })
  @ApiBearerAuth()
  async listarUsuarios(
    @Req() req: FastifyRequest,
    @Query(new ZodValidationPipe(AdminController.listarUsuariosQuery))
    query: z.infer<typeof AdminController.listarUsuariosQuery>,
  ) {
    return this.adminService.listarUsuarios({
      q: query.q,
      plano: query.plano,
      page: query.page,
    });
  }

  private static planoSchema = z.object({ plano: z.enum(["FREE", "PLUS", "PREMIUM"]) });

  @Patch("usuarios/:id/plano")
  @Roles("ADMIN")
  @ApiOperation({
    summary: "Altera o plano criando exceção MANUAL (sync de renovação não sobrescreve)",
  })
  @ApiBearerAuth()
  async alterarPlano(
    @Req() req: FastifyRequest,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(AdminController.planoSchema)) body: z.infer<typeof AdminController.planoSchema>,
  ) {
    const adminId = (req as FastifyRequest & { user?: { id: string } }).user?.id ?? "";
    return this.adminService.alterarPlano(adminId, id, body.plano);
  }

  private static banSchema = z.object({ motivo: z.string().trim().min(1).max(280) });

  @Post("usuarios/:id/ban")
  @Roles("ADMIN")
  @ApiOperation({
    summary: "Bane o usuário: desativa login, revoga sessões ativas, registra motivo",
  })
  @ApiBearerAuth()
  async banir(
    @Req() req: FastifyRequest,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(AdminController.banSchema)) body: z.infer<typeof AdminController.banSchema>,
  ) {
    const adminId = (req as FastifyRequest & { user?: { id: string } }).user?.id ?? "";
    return this.adminService.banir(adminId, id, body.motivo);
  }

  @Post("usuarios/:id/desbanir")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Revoga o ban do usuário" })
  @ApiBearerAuth()
  async desbanir(@Req() req: FastifyRequest, @Param("id", UuidParamPipe) id: string) {
    const adminId = (req as FastifyRequest & { user?: { id: string } }).user?.id ?? "";
    return this.adminService.desbanir(adminId, id);
  }

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
