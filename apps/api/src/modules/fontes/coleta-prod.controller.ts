import {
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { FastifyRequest } from "fastify";

import { PrismaService } from "../../prisma/prisma.service.js";
import { isAdminTokenValid } from "../../common/admin-token.util.js";
import { ColetaService } from "../media-score/coleta.service.js";
import { MediaScoreService } from "../media-score/media-score.service.js";
import type { ConsultaMedia } from "../media-score/adapters/fonte-adapter.interface.js";
/**
 * Coleta em produção: dispara a coleta de avaliações das fontes para uma
 * mídia do catálogo, persiste em `avaliacao_fonte` e recalcula o
 * MEDIA Score (v2) em `media_score`.
 *
 * Autenticação: header `x-admin-token` (mesmo padrão de metrics/invite).
 * O AuthGuard global deixa esta rota passar (sem cookie de sessão) —
 * a validação real acontece aqui, com comparação timing-safe.
 */
@ApiTags("admin")
@Controller("api/v1/midias")
export class ColetaProdController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coleta: ColetaService,
    private readonly mediaScore: MediaScoreService,
  ) {}

  @Post(":id/coletar")
  @HttpCode(200)
  @ApiOperation({
    summary: "Coleta avaliações das fontes para uma mídia e recalcula o MEDIA Score",
  })
  @ApiResponse({ status: 200, description: "Coleta concluída com score recalculado." })
  @ApiResponse({ status: 401, description: "x-admin-token ausente ou inválido." })
  @ApiResponse({ status: 404, description: "Mídia não encontrada." })
  async coletar(@Req() req: FastifyRequest, @Param("id") id: string) {
    const rawHeaders = req.raw.headers ?? req.headers;
    const headerToken = Object.entries(rawHeaders).find(
      ([k]) => k.toLowerCase() === "x-admin-token",
    )?.[1] as string | undefined;

    if (!isAdminTokenValid(headerToken)) {
      throw new HttpException(
        { statusCode: 401, error: "Unauthorized", message: "Admin token required" },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const midia = await this.prisma.midia.findUnique({ where: { id } });
    if (!midia) {
      throw new NotFoundException({
        statusCode: 404,
        error: "Not Found",
        message: "Mídia não encontrada.",
      });
    }

    // IDs externos conhecidos da mídia (fonte original do seed/catálogo).
    const consulta: ConsultaMedia = {
      tipo: midia.tipo,
      titulo: midia.titulo,
      ano: midia.ano_lancamento ?? undefined,
      idsExternos: { [midia.fonte]: midia.fonte_id },
    };

    const resultados = await this.coleta.coletarTudo(consulta);
    const coletadas = resultados.filter(
      (r): r is typeof r & { nota: NonNullable<(typeof r)["nota"]> } =>
        r.status === "ok" && !!r.nota,
    );

    // Persistência idempotente: apaga avaliações antigas da mídia e grava as atuais.
    await this.prisma.avaliacaoFonte.deleteMany({ where: { midia_id: id } });
    if (coletadas.length > 0) {
      await this.prisma.avaliacaoFonte.createMany({
        data: coletadas.map((r) => ({
          midia_id: id,
          fonte: r.nota.fonte,
          rating: r.nota.rating,
          media_fonte: r.nota.media_fonte,
          desvio_fonte: r.nota.desvio_fonte,
          votos: r.nota.votos ?? null,
          url: r.nota.url ?? null,
        })),
      });
    }
    await this.prisma.midia.update({
      where: { id },
      data: { avaliacoes_atualizadas_em: new Date() },
    });

    const score = await this.mediaScore.recalcularEPersistir(id);

    return {
      midia_id: id,
      coletadas: coletadas.map((r) => r.nota),
      score,
      resultados,
    };
  }
}
