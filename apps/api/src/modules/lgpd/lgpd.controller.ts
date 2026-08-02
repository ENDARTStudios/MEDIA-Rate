import { Body, Controller, Delete, Get, HttpCode, Post, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { FastifyRequest } from "fastify";

import { LgpdService } from "./lgpd.service.js";
import { SolicitarExclusaoDto } from "./dto/lgpd.dto.js";
import { ZodValidationPipe } from "../../common/zod-validation.pipe.js";
import type { AuthenticatedUser } from "../../common/guards/auth.guard.js";

/**
 * Controller LGPD (T4.9 — direitos do titular).
 *
 * - GET /api/v1/user/data — exporta todos os dados pessoais em JSON.
 * - DELETE /api/v1/user/data — agenda exclusão (soft delete +30 dias).
 * - POST /api/v1/user/data/cancel-exclusion — cancela exclusão agendada.
 */
@ApiTags("lgpd")
@Controller("api/v1/user/data")
export class LgpdController {
  constructor(private readonly lgpdService: LgpdService) {}

  @Get()
  @ApiOperation({ summary: "Exporta todos os dados pessoais do titular (LGPD)" })
  @ApiResponse({ status: 200, description: "JSON com todos os dados pessoais." })
  async exportarDados(@Req() req: FastifyRequest & { user?: AuthenticatedUser }): Promise<unknown> {
    const user = req.user;
    if (!user) {
      throw new Error("Usuário não autenticado.");
    }
    return this.lgpdService.exportarDados(user.id);
  }

  @Delete()
  @HttpCode(202)
  @ApiOperation({ summary: "Agenda exclusão de dados (soft delete +30 dias)" })
  @ApiResponse({ status: 202, description: "Exclusão agendada." })
  async solicitarExclusao(
    @Req() req: FastifyRequest & { user?: AuthenticatedUser },
    @Body(new ZodValidationPipe(SolicitarExclusaoDto)) body: unknown,
  ): Promise<{
    agendado_para: string;
    dias_para_cancelar: number;
    mensagem: string;
  }> {
    const user = req.user;
    if (!user) {
      throw new Error("Usuário não autenticado.");
    }
    const dto = body as { motivo?: string };
    return this.lgpdService.solicitarExclusao(user.id, dto.motivo);
  }

  @Post("cancel-exclusion")
  @HttpCode(200)
  @ApiOperation({ summary: "Cancela exclusão agendada (antes do prazo)" })
  @ApiResponse({ status: 200, description: "Exclusão cancelada." })
  async cancelarExclusao(
    @Req() req: FastifyRequest & { user?: AuthenticatedUser },
  ): Promise<{ cancelado: boolean }> {
    const user = req.user;
    if (!user) {
      throw new Error("Usuário não autenticado.");
    }
    return this.lgpdService.cancelarExclusao(user.id);
  }
}
