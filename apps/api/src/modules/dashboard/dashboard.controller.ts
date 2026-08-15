import { Controller, Get, Req, UnauthorizedException } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { comContextoRls } from "../../common/rls-context.js";

type DashboardRequest = FastifyRequest & { user?: { id: string } };

/**
 * T295 (Addendum 1) — GET /api/v1/user/stats (dashboard pessoal).
 * Autenticado; agregados do próprio usuário sob RLS owner-only; gate por
 * plano server-side (Free nunca recebe payload de stats).
 */
@ApiTags("dashboard")
@ApiBearerAuth()
@Controller("api/v1/user/stats")
export class DashboardController {
  constructor(
    private readonly service: DashboardService,
    private readonly prisma: PrismaService,
  ) {}

  private userId(req: DashboardRequest): string {
    const id = req.user?.id;
    if (!id) throw new UnauthorizedException("Autenticação necessária.");
    return id;
  }

  @Get()
  @ApiOperation({ summary: "Agregados do dashboard pessoal (radar + evolução)" })
  async stats(@Req() req: DashboardRequest) {
    const usuarioId = this.userId(req);
    const plano = await this.planoDo(usuarioId);
    return this.service.stats(usuarioId, plano);
  }

  private async planoDo(usuarioId: string): Promise<string | null> {
    const up = await comContextoRls(this.prisma, { usuarioId, role: "USER" }, (tx) =>
      tx.usuarioPlano.findUnique({
        where: { usuario_id: usuarioId },
        select: { plano: true },
      }),
    );
    return up?.plano ?? "FREE";
  }
}
