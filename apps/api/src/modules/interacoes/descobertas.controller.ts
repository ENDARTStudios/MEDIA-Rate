import { Controller, Get, Req, UseGuards, UnauthorizedException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import type { FastifyRequest } from "fastify";
import { InteracoesService } from "./interacoes.service.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";

type DescobertaRequest = FastifyRequest & { user?: { id: string } };

/**
 * T201 (G4) — camada de inteligência pessoal (Addendum 3, Parte 5):
 * GET /api/v1/discoveries (timeline de descobertas cross-mídia) e
 * GET /api/v1/taste/history (evolução do gosto nos últimos 12 meses).
 * Autenticados; só dados do próprio usuário (user_id da sessão).
 */
@ApiTags("descobertas")
@ApiBearerAuth()
@Controller("api/v1")
@UseGuards(AuthGuard)
export class DescobertasController {
  constructor(private readonly service: InteracoesService) {}

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
    return this.service.descobertas(this.userId(req));
  }

  @Get("taste/history")
  @ApiOperation({ summary: "Evolução do gosto por gênero (últimos 12 meses)" })
  async tasteHistory(@Req() req: DescobertaRequest) {
    return this.service.historicoTaste(this.userId(req));
  }
}
