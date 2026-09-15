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
import type { FastifyRequest } from "fastify";

import { PrismaService } from "../../prisma/prisma.service.js";
import { isAdminTokenValid } from "../../common/admin-token.util.js";
import { MediaScoreJobService } from "../media-score/media-score-job.service.js";
/**
 * Coleta em produção: dispara a coleta de avaliações das fontes para uma
 * mídia do catálogo, persiste em `avaliacao_fonte` e recalcula o
 * MEDIA Score (v3) em `media_score`. Inclui o gatilho do job diário
 * (POST /api/v1/midias/score-job).
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
    private readonly job: MediaScoreJobService,
  ) {}

  @Post("score-job")
  @HttpCode(200)
  @ApiOperation({
    summary: "Dispara o job diário de coleta + recálculo do MEDIA Score (todas as mídias)",
  })
  @ApiResponse({ status: 200, description: "Job disparado em segundo plano." })
  @ApiResponse({ status: 401, description: "x-admin-token ausente ou inválido." })
  async dispararJob(@Req() req: FastifyRequest): Promise<{ iniciado: boolean }> {
    if (!this.validarAdmin(req)) {
      throw new HttpException(
        { statusCode: 401, error: "Unauthorized", message: "Admin token required" },
        HttpStatus.UNAUTHORIZED,
      );
    }
    // Fire-and-forget: o run roda em segundo plano no container (15-25 min);
    // o progresso aparece nos logs do Railway.
    void this.job.executar();
    return { iniciado: true };
  }

  @Post(":id/coletar")
  @HttpCode(200)
  @ApiOperation({
    summary: "Coleta avaliações das fontes para uma mídia e recalcula o MEDIA Score",
  })
  @ApiResponse({ status: 200, description: "Coleta concluída com score recalculado." })
  @ApiResponse({ status: 401, description: "x-admin-token ausente ou inválido." })
  @ApiResponse({ status: 404, description: "Mídia não encontrada." })
  async coletar(@Req() req: FastifyRequest, @Param("id") id: string) {
    if (!this.validarAdmin(req)) {
      throw new HttpException(
        { statusCode: 401, error: "Unauthorized", message: "Admin token required" },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const midia = await this.prisma.midia.findUnique({
      where: { id },
      select: {
        id: true,
        tipo: true,
        titulo: true,
        ano_lancamento: true,
        fonte: true,
        fonte_id: true,
      },
    });
    if (!midia) {
      throw new NotFoundException({
        statusCode: 404,
        error: "Not Found",
        message: "Mídia não encontrada.",
      });
    }

    const { coletadas, score, resultados } = await this.job.coletarEPersistir(midia);

    return {
      midia_id: id,
      coletadas,
      score,
      resultados,
    };
  }

  private validarAdmin(req: FastifyRequest): boolean {
    const rawHeaders = req.raw.headers ?? req.headers;
    const headerToken = Object.entries(rawHeaders).find(
      ([k]) => k.toLowerCase() === "x-admin-token",
    )?.[1] as string | undefined;
    return isAdminTokenValid(headerToken);
  }
}
