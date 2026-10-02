import { Body, Controller, Delete, Get, HttpCode, Post, Req, Res } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import type { FastifyRequest, FastifyReply } from "fastify";

import { LgpdService } from "./lgpd.service.js";
import { SolicitarExclusaoDto } from "./dto/lgpd.dto.js";
import { ZodValidationPipe } from "../../common/zod-validation.pipe.js";
import type { AuthenticatedUser } from "../../common/guards/auth.guard.js";

/**
 * Controller LGPD (T4.9 — direitos do titular; T473 — protocolo verificável).
 *
 * - GET /api/v1/user/data — exporta todos os dados pessoais em JSON.
 * - DELETE /api/v1/user/data — agenda exclusão (soft delete +30 dias).
 * - POST /api/v1/user/data/cancel-exclusion — cancela exclusão agendada.
 *
 * T473 (auditoria 2026-09-04): toda resposta carrega o protocolo
 * correlation_id — header X-Request-Id/X-Correlation-Id (req.id do Fastify) +
 * campo no corpo — para o titular comprovar e rastrear a solicitação.
 */
@ApiTags("lgpd")
@Controller("api/v1/user/data")
export class LgpdController {
  constructor(private readonly lgpdService: LgpdService) {}

  /** Carimba o protocolo da requisição (header + valor para o corpo). */
  private protocolo(req: FastifyRequest, reply: FastifyReply): string {
    const correlationId = String(req.id);
    void reply.header("X-Request-Id", correlationId);
    void reply.header("X-Correlation-Id", correlationId);
    return correlationId;
  }

  @Get()
  @ApiOperation({ summary: "Exporta todos os dados pessoais do titular (LGPD)" })
  @ApiResponse({ status: 200, description: "JSON com todos os dados pessoais." })
  async exportarDados(
    @Req() req: FastifyRequest & { user?: AuthenticatedUser },
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<unknown> {
    const user = req.user;
    if (!user) {
      throw new Error("Usuário não autenticado.");
    }
    const correlationId = this.protocolo(req, reply);
    return { ...(await this.lgpdService.exportarDados(user.id)), correlation_id: correlationId };
  }

  @Delete()
  @HttpCode(202)
  @ApiOperation({ summary: "Agenda exclusão de dados (soft delete +30 dias)" })
  @ApiResponse({ status: 202, description: "Exclusão agendada." })
  async solicitarExclusao(
    @Req() req: FastifyRequest & { user?: AuthenticatedUser },
    @Res({ passthrough: true }) reply: FastifyReply,
    @Body(new ZodValidationPipe(SolicitarExclusaoDto)) body: unknown,
  ): Promise<{
    agendado_para: string;
    dias_para_cancelar: number;
    mensagem: string;
    correlation_id: string;
  }> {
    const user = req.user;
    if (!user) {
      throw new Error("Usuário não autenticado.");
    }
    const dto = body as { motivo?: string };
    const correlationId = this.protocolo(req, reply);
    return {
      ...(await this.lgpdService.solicitarExclusao(user.id, dto.motivo)),
      correlation_id: correlationId,
    };
  }

  @Post("cancel-exclusion")
  @HttpCode(200)
  @ApiOperation({ summary: "Cancela exclusão agendada (antes do prazo)" })
  @ApiResponse({ status: 200, description: "Exclusão cancelada." })
  async cancelarExclusao(
    @Req() req: FastifyRequest & { user?: AuthenticatedUser },
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ cancelado: boolean; correlation_id: string }> {
    const user = req.user;
    if (!user) {
      throw new Error("Usuário não autenticado.");
    }
    const correlationId = this.protocolo(req, reply);
    return { ...(await this.lgpdService.cancelarExclusao(user.id)), correlation_id: correlationId };
  }
}
