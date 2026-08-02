import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  NotFoundException,
  UseGuards,
  UsePipes,
  HttpCode,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";

import { PrismaService } from "../../prisma/prisma.service.js";

import { MediaScoreService } from "../media-score/media-score.service.js";
import { MediaService } from "./media.service.js";
import {
  createMediaSchema,
  updateMediaSchema,
  type CreateMediaDto,
  type UpdateMediaDto,
} from "./dto/media.dto.js";
import { ZodValidationPipe } from "../../common/zod-validation.pipe.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { RolesGuard } from "../../common/guards/roles.guard.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import {
  PaginationDto,
  type PaginationDtoType,
  paginateCursor,
  validateSortField,
  type PaginatedResult,
} from "../../common/pagination.helper.js";

/**
 * Controller de mídia (T4.6 catálogo + T4.7 MEDIA Score endpoint).
 */
@ApiTags("media")
@Controller("api/v1/midias")
export class MediaController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaScoreService: MediaScoreService,
    private readonly mediaService: MediaService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Lista mídias com paginação cursor-based" })
  @ApiResponse({ status: 200, description: "Lista paginada de mídias." })
  @ApiQuery({ name: "cursor", required: false, description: "Cursor da próxima página" })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Itens por página (max 100)",
    type: Number,
  })
  @ApiQuery({
    name: "tipo",
    required: false,
    description: "Filtrar por tipo (FILME, SERIE, GAME, LIVRO)",
  })
  @ApiQuery({
    name: "sort",
    required: false,
    description: "Ordenação allowlist: titulo, ano_lancamento",
  })
  async list(
    @Query("cursor") cursor: string | undefined,
    @Query("limit") limit: string | undefined,
    @Query("tipo") tipo: string | undefined,
    @Query("sort") sort: string | undefined,
  ): Promise<
    PaginatedResult<{ id: string; titulo: string; tipo: string; ano_lancamento: number | null }>
  > {
    const params: PaginationDtoType = PaginationDto.parse({
      cursor,
      limit: limit ?? "20",
      direction: "forward",
    });

    const where: Record<string, unknown> = {};
    if (tipo && ["FILME", "SERIE", "GAME", "LIVRO"].includes(tipo)) {
      where.tipo = tipo;
    }

    // Allowlist de campos de ordenação (T4.6 sort allowlist).
    const ALLOWED_SORT_FIELDS = ["titulo", "ano_lancamento", "created_at"] as const;
    const sortResult = validateSortField(sort, ALLOWED_SORT_FIELDS);
    const orderBy = sortResult
      ? { [sortResult.field]: sortResult.direction }
      : { created_at: "desc" as const };

    return paginateCursor({
      prisma: this.prisma,
      model: "midia",
      cursor_field: "id",
      params,
      where,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- orderBy construído dinamicamente
      orderBy: orderBy as any,
      select: { id: true, titulo: true, tipo: true, ano_lancamento: true },
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Detalhes de uma mídia específica" })
  @ApiResponse({ status: 200, description: "Mídia encontrada." })
  @ApiResponse({ status: 404, description: "Mídia não encontrada." })
  async getOne(@Param("id") id: string): Promise<{
    id: string;
    titulo: string;
    titulo_original: string | null;
    tipo: string;
    sinopse: string | null;
    ano_lancamento: number | null;
    classificacao_indicativa: string | null;
    imagem_url: string | null;
  }> {
    const midia = await this.prisma.midia.findUnique({ where: { id } });
    if (!midia) {
      throw new NotFoundException({
        statusCode: 404,
        error: "Not Found",
        message: "Mídia não encontrada.",
      });
    }
    return midia;
  }

  @Get(":id/media-score")
  @ApiOperation({ summary: "MEDIA Score™ consolidado para uma mídia" })
  @ApiResponse({ status: 200, description: "Score consolidado com confiança." })
  @ApiResponse({ status: 404, description: "Mídia não encontrada." })
  async getMediaScore(@Param("id") id: string): Promise<{
    midia_id: string;
    score: number;
    criticosScore: number | null;
    publicoScore: number | null;
    consenso: number | null;
    num_fontes: number;
    confianca: number;
    pesos_usados: Record<string, number>;
    calculado_em: string;
  }> {
    const midia = await this.prisma.midia.findUnique({
      where: { id },
      include: { scores: true },
    });
    if (!midia) {
      throw new NotFoundException({
        statusCode: 404,
        error: "Not Found",
        message: "Mídia não encontrada.",
      });
    }

    // Se já existe score persistido (job diário), retorna ele.
    // Critica/Público não são persistidos ainda — null até a tabela de
    // avaliações por fonte existir.
    if (midia.scores.length > 0) {
      const existing = midia.scores[0];
      if (!existing) {
        throw new NotFoundException();
      }
      return {
        midia_id: id,
        score: existing.score,
        criticosScore: null,
        publicoScore: null,
        consenso: null,
        num_fontes: existing.num_fontes,
        confianca: 0.6,
        pesos_usados: existing.pesos_usados as Record<string, number>,
        calculado_em: existing.calculado_em.toISOString(),
      };
    }

    // Sem score persistido — calcula on-the-fly (placeholder: sem fontes = neutro).
    const result = this.mediaScoreService.calcularScoreV2(midia.tipo, []);
    return {
      midia_id: id,
      score: result.score,
      criticosScore: result.criticosScore,
      publicoScore: result.publicoScore,
      consenso: result.consenso,
      num_fontes: result.num_fontes,
      confianca: result.confianca,
      pesos_usados: result.pesos_usados,
      calculado_em: new Date().toISOString(),
    };
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  @UsePipes(new ZodValidationPipe(createMediaSchema))
  async create(@Body() body: CreateMediaDto) {
    return this.mediaService.create(body);
  }

  @Put(":id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  @UsePipes(new ZodValidationPipe(updateMediaSchema))
  async update(@Param("id") id: string, @Body() body: UpdateMediaDto) {
    return this.mediaService.update(id, body);
  }

  @Delete(":id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  @HttpCode(204)
  async remove(@Param("id") id: string) {
    await this.mediaService.remove(id);
  }
}
