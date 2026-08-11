import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { z } from "zod";
import type { FastifyRequest } from "fastify";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { FeatureFlagService } from "./feature-flags.service.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { ZodValidationPipe } from "../../common/zod-validation.pipe.js";

type AdminRequest = FastifyRequest & { user?: { id: string } };

const flagSchema = z.object({
  key: z.string().min(1).max(64),
  enabled: z.boolean().optional(),
  rollout_percent: z.number().int().min(0).max(100).optional(),
  plan_gate: z.enum(["FREE", "PLUS", "PREMIUM"]).nullable().optional(),
  tenant_overrides: z.record(z.string(), z.boolean()).optional(),
});

const flagUpdateSchema = flagSchema.omit({ key: true });

/**
 * T292 — CRUD de feature flags (somente ADMIN) com audit_log.
 * Avaliação é server-side (nunca exposta no frontend).
 */
@ApiTags("flags")
@ApiBearerAuth()
@Controller("api/v1/admin/flags")
@Roles("ADMIN")
export class FeatureFlagsController {
  constructor(private readonly service: FeatureFlagService) {}

  private userId(req: AdminRequest): string {
    const id = req.user?.id;
    if (!id) throw new UnauthorizedException("Autenticação necessária.");
    return id;
  }

  @Get()
  @ApiOperation({ summary: "Lista feature flags (ADMIN)" })
  async listar() {
    return this.service.listar();
  }

  @Post()
  @ApiOperation({ summary: "Cria feature flag (ADMIN)" })
  async criar(
    @Req() req: AdminRequest,
    @Body(new ZodValidationPipe(flagSchema)) body: z.infer<typeof flagSchema>,
  ) {
    return this.service.criar(this.userId(req), body);
  }

  @Patch(":key")
  @ApiOperation({ summary: "Atualiza feature flag (ADMIN)" })
  async atualizar(
    @Req() req: AdminRequest,
    @Param("key") key: string,
    @Body(new ZodValidationPipe(flagUpdateSchema)) body: z.infer<typeof flagUpdateSchema>,
  ) {
    return this.service.atualizar(this.userId(req), key, body);
  }
}
