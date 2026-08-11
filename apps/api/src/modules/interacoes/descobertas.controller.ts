import { Controller, Get, Req, UseGuards, UnauthorizedException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import type { FastifyRequest } from "fastify";
import { InteracoesService } from "./interacoes.service.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { FeatureFlagService } from "../flags/feature-flags.service.js";

type DescobertaRequest = FastifyRequest & { user?: { id: string } };

/**
 * T201 (G4) — camada de inteligência pessoal (Addendum 3, Parte 5):
 * GET /api/v1/discoveries (timeline de descobertas cross-mídia) e
 * GET /api/v1/taste/history (evolução do gosto nos últimos 12 meses).
 * Autenticados; só dados do próprio usuário (user_id da sessão).
 * T292 — o feed respeita a flag discovery-feed-v1 (rollout); off = lista
 * vazia (estado 'em preparação' no front), nunca 500.
 */
@ApiTags("descobertas")
@ApiBearerAuth()
@Controller("api/v1")
@UseGuards(AuthGuard)
export class DescobertasController {
  constructor(
    private readonly service: InteracoesService,
    private readonly flags: FeatureFlagService,
  ) {}

  private userId(req: DescobertaRequest): string {
    const id = req.user?.id;
    if (!id) {
      throw new UnauthorizedException("Autenticação necessária.");
    }
    return id;
  }

  @Get("discoveries")
  @ApiOperation({ summary: "Descobertas cross-mídia do usuário (cronológica desc)" })
  async discoveries(@Req() req: DescobertaRequest) {
    const usuarioId = this.userId(req);
    const ativo = await this.flags.avaliavel("discovery-feed-v1", { id: usuarioId });
    if (!ativo) return [];
    return this.service.descobertas(usuarioId);
  }

  @Get("taste/history")
  @ApiOperation({ summary: "Evolução do gosto por gênero (últimos 12 meses)" })
  async tasteHistory(@Req() req: DescobertaRequest) {
    return this.service.historicoTaste(this.userId(req));
  }
}
