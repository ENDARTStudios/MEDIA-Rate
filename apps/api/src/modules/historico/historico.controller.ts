import { Controller, Get, Req, UnauthorizedException } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { FastifyRequest } from "fastify";
import { PrismaService } from "../../prisma/prisma.service.js";
import { QuotaService } from "../quota/quota.service.js";

type HistoricoRequest = FastifyRequest & { user?: { id: string } };

/**
 * Histórico de títulos vistos (D-132): plano FREE limitado a 10 itens
 * (distintos, mais recentes primeiro); Plus/Premium até 50.
 */
@ApiTags("historico")
@Controller("api/v1/historico")
export class HistoricoController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quota: QuotaService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Histórico de títulos vistos (limite Free: 10)" })
  async listar(@Req() req: HistoricoRequest) {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      throw new UnauthorizedException("Autenticação necessária.");
    }

    const plano = await this.quota.planoDe(usuarioId);
    const limite = plano === "FREE" ? 10 : 50;

    const views = await this.prisma.mediaScoreView.findMany({
      where: { usuario_id: usuarioId },
      orderBy: { viewed_at: "desc" },
      take: 100,
      select: { midia_id: true, viewed_at: true },
    });
    const porMidia = new Map<string, Date>();
    for (const v of views) {
      if (!porMidia.has(v.midia_id)) porMidia.set(v.midia_id, v.viewed_at);
    }
    const selecionadas = [...porMidia.entries()].slice(0, limite);

    const midias = await this.prisma.midia.findMany({
      where: { id: { in: selecionadas.map(([id]) => id) } },
      select: {
        id: true,
        titulo: true,
        tipo: true,
        ano_lancamento: true,
        imagem_url: true,
        score: true,
      },
    });
    const porId = new Map(midias.map((m) => [m.id, m]));

    return {
      items: selecionadas.map(([midiaId, viewedAt]) => {
        const midia = porId.get(midiaId);
        return {
          midia_id: midiaId,
          viewed_at: viewedAt,
          titulo: midia?.titulo ?? null,
          tipo: midia?.tipo ?? null,
          ano_lancamento: midia?.ano_lancamento ?? null,
          imagem_url: midia?.imagem_url ?? null,
          score: midia?.score ?? null,
        };
      }),
      limite,
      limite_atingido: porMidia.size > limite,
      plano,
    };
  }
}
