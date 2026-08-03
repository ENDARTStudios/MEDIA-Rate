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
import { slugify } from "../../common/slugify.js";

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
    description: "Ordenação allowlist: titulo, ano_lancamento, score",
  })
  async list(
    @Query("cursor") cursor: string | undefined,
    @Query("limit") limit: string | undefined,
    @Query("tipo") tipo: string | undefined,
    @Query("sort") sort: string | undefined,
  ): Promise<
    PaginatedResult<{
      id: string;
      titulo: string;
      tipo: string;
      ano_lancamento: number | null;
      imagem_url: string | null;
    }>
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
    // "score" ordena pela relação media_score (maior score primeiro).
    const ALLOWED_SORT_FIELDS = ["titulo", "ano_lancamento", "created_at", "score"] as const;
    const sortResult = validateSortField(sort, ALLOWED_SORT_FIELDS);
    let orderBy: unknown = { created_at: "desc" as const };
    if (sortResult) {
      if (sortResult.field === "score") {
        orderBy = { scores: { score: sortResult.direction } };
      } else {
        orderBy = { [sortResult.field]: sortResult.direction };
      }
    }

    return paginateCursor({
      prisma: this.prisma,
      model: "midia",
      cursor_field: "id",
      params,
      where,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- orderBy construído dinamicamente
      orderBy: orderBy as any,
      select: {
        id: true,
        titulo: true,
        tipo: true,
        ano_lancamento: true,
        imagem_url: true,
        scores: {
          select: { score: true },
          take: 1,
          orderBy: { calculado_em: "desc" },
        },
      },
    });
  }

  @Get("slug/:slug")
  @ApiOperation({
    summary: "Detalhes de uma mídia por slug (ou id) com score v2 e fontes",
  })
  @ApiResponse({ status: 200, description: "Mídia encontrada com score e fontes." })
  @ApiResponse({ status: 404, description: "Mídia não encontrada." })
  async getBySlug(@Param("slug") slug: string) {
    const include = {
      generos: { include: { genero: { select: { nome: true } } } },
      streamings: { include: { service: { select: { nome: true } } } },
      scores: true,
      avaliacoes: { select: { fonte: true, url: true } },
    };

    // 1) id UUID direto (rotas legadas /movie/[id] e cards que linkam por id).
    let midia = await this.prisma.midia.findUnique({ where: { id: slug }, include });
    if (!midia) {
      // 2) slugify sobre titulo/titulo_original (catálogo real).
      const slugLimpo = slugify(slug);
      const candidatos = await this.prisma.midia.findMany({
        select: { id: true, titulo: true, titulo_original: true },
      });
      const alvo = candidatos.find(
        (c) =>
          slugify(c.titulo) === slugLimpo ||
          (c.titulo_original != null && slugify(c.titulo_original) === slugLimpo),
      );
      if (alvo) {
        midia = await this.prisma.midia.findUnique({ where: { id: alvo.id }, include });
      }
    }
    if (!midia) {
      throw new NotFoundException({
        statusCode: 404,
        error: "Not Found",
        message: "Mídia não encontrada.",
      });
    }

    const score = midia.scores[0];
    return {
      id: midia.id,
      slug: slugify(midia.titulo),
      titulo: midia.titulo,
      titulo_original: midia.titulo_original,
      tipo: midia.tipo,
      sinopse: midia.sinopse,
      ano_lancamento: midia.ano_lancamento,
      imagem_url: midia.imagem_url,
      classificacao_indicativa: midia.classificacao_indicativa,
      duracao_minutos: midia.duracao_minutos,
      generos: midia.generos.map((g) => g.genero.nome),
      streamings: midia.streamings.map((s) => s.service.nome),
      score: score
        ? {
            score: score.score,
            criticosScore: score.score_critica,
            publicoScore: score.score_publico,
            consenso: score.consenso,
            num_fontes: score.num_fontes,
            confianca: score.confianca,
            calculado_em: score.calculado_em.toISOString(),
            detalhes: Array.isArray(score.detalhes) ? score.detalhes : [],
          }
        : null,
      fontes: midia.avaliacoes.map((a) => ({ fonte: a.fonte, url: a.url })),
    };
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

    // Se já existe score persistido (job diário ou coleta admin), retorna ele
    // com os buckets Crítica/Público (v2).
    if (midia.scores.length > 0) {
      const existing = midia.scores[0];
      if (!existing) {
        throw new NotFoundException();
      }
      return {
        midia_id: id,
        score: existing.score,
        criticosScore: existing.score_critica ?? null,
        publicoScore: existing.score_publico ?? null,
        consenso: existing.consenso ?? null,
        num_fontes: existing.num_fontes,
        confianca: existing.confianca ?? 0.6,
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
