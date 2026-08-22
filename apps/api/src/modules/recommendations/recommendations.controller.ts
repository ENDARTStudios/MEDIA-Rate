import { BadRequestException, Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { z } from "zod";
import type { FastifyRequest } from "fastify";
import { RecommendationsService } from "./recommendations.service.js";
import { recommendationsQuerySchema } from "./dto/recommendations-query.dto.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { RequirePlan } from "../../common/decorators/require-plan.decorator.js";

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException({
      statusCode: 400,
      error: "Bad Request",
      message: `Validation failed: ${result.error.issues[0]?.message ?? "invalid query"}`,
    });
  }
  return result.data;
}

/**
 * T209 — recomendações reais (substituem os stubs do PremiumController).
 * AuthGuard (sessão) + PlanGuard global (APP_GUARD) com @RequirePlan.
 */
@ApiTags("premium")
@ApiBearerAuth()
@Controller("api/v1/premium")
@UseGuards(AuthGuard)
export class RecommendationsController {
  constructor(private readonly service: RecommendationsService) {}

  private usuarioDaSessao(req: FastifyRequest): string {
    const id = (req as FastifyRequest & { user?: { id: string } }).user?.id;
    if (!id) {
      throw new BadRequestException({
        statusCode: 401,
        error: "Unauthorized",
        message: "Autenticação necessária.",
      });
    }
    return id;
  }

  @Get("recommendations")
  @RequirePlan("PLUS")
  @ApiOperation({ summary: "Recomendações por gênero + score (PLUS+)" })
  recommendations(@Req() req: FastifyRequest, @Query() query: unknown) {
    const params = parseOrThrow(recommendationsQuerySchema, query);
    return this.service.recomendarPorGenero(this.usuarioDaSessao(req), params);
  }

  @Get("ml-personalized")
  @RequirePlan("PREMIUM")
  @ApiOperation({ summary: "Ranking colaborativo por gosto similar (PREMIUM)" })
  mlPersonalized(@Req() req: FastifyRequest, @Query() query: unknown) {
    const params = parseOrThrow(recommendationsQuerySchema, query);
    return this.service.colaborativo(this.usuarioDaSessao(req), params);
  }

  @Get("graph")
  @ApiOperation({ summary: "Recomendações por grafo de relações (qualquer plano)" })
  graph(@Req() req: FastifyRequest, @Query() query: unknown) {
    const params = parseOrThrow(recommendationsQuerySchema, query);
    return this.service.recomendarPorGrafo(this.usuarioDaSessao(req), params);
  }
}
