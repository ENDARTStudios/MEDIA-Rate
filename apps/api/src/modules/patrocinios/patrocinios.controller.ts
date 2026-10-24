import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { z } from "zod";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { ZodValidationPipe } from "../../common/zod-validation.pipe.js";
import { UuidParamPipe } from "../../common/pipes/uuid-param.pipe.js";
import { AdminStepUpGuard } from "../admin/admin-stepup.guard.js";
import { PatrociniosService } from "./patrocinios.service.js";

type PatrocinioRequest = FastifyRequest & { user?: { id: string } };

/**
 * UAT-46 — registro público de patrocínios.
 *
 * - GET /api/v1/patrocinios: público (AuthGuard libera GET nesta rota) —
 *   qualquer pessoa confere o registro que a página `/apoie` publica.
 * - POST/DELETE /api/v1/admin/patrocinios: Admin (RBAC; step-up nas mutantes,
 *   mesmo regime da Gestão de Usuários).
 */
@ApiTags("patrocinios")
@Controller()
export class PatrociniosController {
  constructor(private readonly service: PatrociniosService) {}

  @Get("api/v1/patrocinios")
  @ApiOperation({ summary: "Registro público de patrocínios (transparência)" })
  async listar() {
    return this.service.listarPublicos();
  }

  private static criarSchema = z.object({
    usuario_id: z.string().uuid().nullish(),
    patrocinador: z.string().trim().min(2).max(128),
    secao: z.string().trim().min(2).max(128),
    rotulo: z.string().trim().min(2).max(255),
    desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  });

  @Post("api/v1/admin/patrocinios")
  @Roles("ADMIN")
  @UseGuards(AdminStepUpGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Registra um patrocínio no registro público (admin)" })
  async criar(
    @Req() req: PatrocinioRequest,
    @Body(new ZodValidationPipe(PatrociniosController.criarSchema))
    body: z.infer<typeof PatrociniosController.criarSchema>,
  ) {
    const adminId = req.user?.id ?? "";
    return this.service.criar(adminId, body);
  }

  @Delete("api/v1/admin/patrocinios/:id")
  @Roles("ADMIN")
  @UseGuards(AdminStepUpGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Remove (soft delete) um patrocínio do registro público" })
  async remover(@Req() req: PatrocinioRequest, @Param("id", UuidParamPipe) id: string) {
    const adminId = req.user?.id ?? "";
    return this.service.remover(adminId, id);
  }
}
