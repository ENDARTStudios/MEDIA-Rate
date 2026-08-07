import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Req,
  Res,
  NotFoundException,
  UseGuards,
  UsePipes,
  HttpCode,
  Optional,
} from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";

import { PrismaService } from "../../prisma/prisma.service.js";
import { slugify } from "../../common/slugify.js";
import { CacheService, CacheInvalidationService } from "../../common/cache.service.js";

import { MediaScoreService } from "../media-score/media-score.service.js";
import { MediaService } from "./media.service.js";
import { SessionService } from "../auth/session.service.js";
import { QuotaService } from "../quota/quota.service.js";
import {
  createMediaSchema,
  updateMediaSchema,
  type CreateMediaDto,
  type UpdateMediaDto,
} from "./dto/media.dto.js";
import { ZodValidationPipe } from "../../common/zod-validation.pipe.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { RolesGuard } from "../../common/guards/roles.guard.js";

/**
 * Confiança legada (pré-v3, heurística 0–1) → Confidence Score v3 (0–100).
 * Valores < 1 só existem na escala antiga (a v3 é inteira e o máximo legado
 * é 0.9); normaliza para a nova faixa de leitura (≥70 Alta, ≥40 Média).
 */
function normalizarConfianca(c: number | null | undefined): number {
  if (c == null) return 0;
  return c < 1 ? Math.round(c * 100) : c;
}
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
    private readonly sessionService?: SessionService,
    private readonly quotaService?: QuotaService,
    // T210: cache de aplicação (opcional — ausente em testes unitários).
    @Optional() private readonly cacheService?: CacheService,
    @Optional() private readonly cacheInvalidation?: CacheInvalidationService,
  ) {}

  /** Resolve o usuário logado via cookie de sessão (opcional — null sem login). */
  private async usuarioOpcional(req?: FastifyRequest): Promise<string | null> {
    if (!req) return null;
    const token = (req.cookies as Record<string, string> | undefined)?.["sess"];
    if (!token || !this.sessionService) return null;
    const sessao = await this.sessionService.validateToken(token);
    return sessao?.sessao.usuario_id ?? null;
  }

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
    @Query("ano_min") anoMin: string | undefined,
    @Query("ano_max") anoMax: string | undefined,
    @Query("score_min") scoreMin: string | undefined,
    @Query("score_max") scoreMax: string | undefined,
    @Query("genero") genero: string | undefined,
    @Query("com_critica") comCritica: string | undefined,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<
    PaginatedResult<{
      id: string;
      titulo: string;
      tipo: string;
      ano_lancamento: number | null;
      imagem_url: string | null;
    }> & { total: number }
  > {
    const params: PaginationDtoType = PaginationDto.parse({
      cursor,
      limit: limit ?? "20",
      direction: "forward",
    });

    const where: Record<string, unknown> = {};
    // Filtro por tipo: o enum do banco (TipoMidia) usa "COMIC"; "HQ" é aceito
    // como alias legado. Qualquer outro valor é ignorado (lista completa).
    if (tipo && ["FILME", "SERIE", "GAME", "LIVRO", "ANIME", "COMIC", "HQ"].includes(tipo)) {
      where.tipo = tipo === "HQ" ? "COMIC" : tipo;
    }
    // Filtros avançados do catálogo (Tarefa 4 do redesign): ano e faixa de
    // score — valores numéricos opcionais, ignorados quando inválidos.
    const anoMinNum = Number(anoMin);
    const anoMaxNum = Number(anoMax);
    if (anoMin !== undefined && Number.isFinite(anoMinNum)) {
      where.ano_lancamento = { ...(where.ano_lancamento as object), gte: anoMinNum };
    }
    if (anoMax !== undefined && Number.isFinite(anoMaxNum)) {
      where.ano_lancamento = { ...(where.ano_lancamento as object), lte: anoMaxNum };
    }
    const scoreMinNum = Number(scoreMin);
    const scoreMaxNum = Number(scoreMax);
    if (scoreMin !== undefined && Number.isFinite(scoreMinNum)) {
      where.scores = { ...(where.scores as object), some: { score: { gte: scoreMinNum } } };
    }
    if (scoreMax !== undefined && Number.isFinite(scoreMaxNum)) {
      where.scores = {
        ...(where.scores as object),
        some: {
          ...((where.scores as { some?: object })?.some ?? {}),
          score: {
            ...((where.scores as { some?: { score?: object } })?.some?.score ?? {}),
            lte: scoreMaxNum,
          },
        },
      };
    }
    // Filtro por gênero (slug ou id numérico) — relação N:N midia_genero.
    const generoNum = Number(genero);
    if (genero !== undefined && genero !== "") {
      where.generos = {
        some: {
          genero: Number.isFinite(generoNum) ? { id: generoNum } : { slug: genero },
        },
      };
    }
    // T186: "somente com crítica disponível" — score_critica != null
    // (classificação critic|audience do T179 persistida no media_score).
    // Merge com os filtros de score (where.scores.some é um único some AND).
    if (comCritica === "true" || comCritica === "1") {
      where.scores = {
        ...(where.scores as object),
        some: {
          ...((where.scores as { some?: object })?.some ?? {}),
          score_critica: { not: null },
        },
      };
    }

    // Allowlist de campos de ordenação (T4.6 sort allowlist).
    // "score" usa o campo desnormalizado midia.score (último media_score) —
    // orderBy escalar, sem depender de orderBy de relação (quirk do engine).
    const ALLOWED_SORT_FIELDS = ["titulo", "ano_lancamento", "created_at", "score"] as const;
    const sortResult = validateSortField(sort, ALLOWED_SORT_FIELDS);
    let orderBy: unknown = { created_at: "desc" as const };
    if (sortResult) {
      orderBy = { [sortResult.field]: sortResult.direction };
    }

    // D-132: Free tem até 3 "recomendações" (listagem por score) por dia.
    // Anônimos não contam; Plus/Premium (incl. trial) ilimitado.
    const usuarioId = await this.usuarioOpcional(req);
    if (sortResult?.field === "score" && this.quotaService && usuarioId) {
      const plano = await this.quotaService.planoDe(usuarioId);
      if (plano === "FREE") {
        await this.quotaService.usar(usuarioId, "recomendacoes", 3);
      }
    }

    // T210: cache de leitura (60s) APENAS para anônimos — a listagem
    // autenticada consome quota por usuário e nunca pode ser cacheada.
    if (!usuarioId && this.cacheService) {
      const chave = `midias:${this.cacheService.hashKey(req.url)}`;
      const { value, hit } = await this.cacheService.readThroughWithStatus(chave, 60, async () => {
        // Total real da coleção filtrada (exibição "N títulos" no catálogo web).
        const [resultado, total] = await Promise.all([
          paginateCursor<{
            id: string;
            titulo: string;
            tipo: string;
            ano_lancamento: number | null;
            imagem_url: string | null;
          }>({
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
          }),
          this.prisma.midia.count({ where }),
        ]);
        return { ...resultado, total };
      });
      reply.header("X-Cache", hit ? "HIT" : "MISS");
      return value;
    }

    // Total real da coleção filtrada (exibição "N títulos" no catálogo web).
    const [resultado, total] = await Promise.all([
      paginateCursor<{
        id: string;
        titulo: string;
        tipo: string;
        ano_lancamento: number | null;
        imagem_url: string | null;
      }>({
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
      }),
      this.prisma.midia.count({ where }),
    ]);

    return { ...resultado, total };
  }

  @Get("slug/:slug")
  @ApiOperation({
    summary: "Detalhes de uma mídia por slug (ou id) com score v3 e fontes",
  })
  @ApiResponse({ status: 200, description: "Mídia encontrada com score e fontes." })
  @ApiResponse({ status: 404, description: "Mídia não encontrada." })
  async getBySlug(@Param("slug") slug: string) {
    const include = {
      generos: { include: { genero: { select: { nome: true } } } },
      streamings: { include: { service: { select: { nome: true } } } },
      scores: true,
      avaliacoes: { select: { fonte: true, url: true } },
      franquias: {
        include: {
          franquia: {
            include: {
              midias: {
                include: {
                  midia: {
                    select: {
                      id: true,
                      titulo: true,
                      tipo: true,
                      ano_lancamento: true,
                      imagem_url: true,
                      score: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    // 1) id UUID direto (rotas legadas /movie/[id] e cards que linkam por id).
    // Só tenta findUnique se o parâmetro for UUID válido — senão o Postgres
    // lança erro de conversão em vez de retornar null (coluna UUID).
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
    let midia = isUuid
      ? await this.prisma.midia.findUnique({ where: { id: slug }, include })
      : null;
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
      pais_origem: midia.pais_origem,
      duracao_minutos: midia.duracao_minutos,
      generos: midia.generos.map((g) => g.genero.nome),
      // Addendum 2 §7: franquias com ordens (lançamento + cronológica).
      franquias: midia.franquias.map((mf) => ({
        id: mf.franquia.id,
        nome: mf.franquia.nome,
        slug: mf.franquia.slug,
        itens: mf.franquia.midias.map((outro) => ({
          midia_id: outro.midia.id,
          titulo: outro.midia.titulo,
          tipo: outro.midia.tipo,
          ano_lancamento: outro.midia.ano_lancamento,
          imagem_url: outro.midia.imagem_url,
          score: outro.midia.score,
          ordem_lancamento: outro.ordem_lancamento,
          ordem_cronologica: outro.ordem_cronologica,
        })),
      })),
      streamings: midia.streamings.map((s) => s.service.nome),
      score: score
        ? {
            score: score.score,
            criticosScore: score.score_critica,
            publicoScore: score.score_publico,
            consenso: score.consenso,
            indiceConsenso: score.indice_consenso ?? null,
            votosTotal: score.votos_total ?? 0,
            num_fontes: score.num_fontes,
            confianca: normalizarConfianca(score.confianca),
            calculado_em: score.calculado_em.toISOString(),
            detalhes: Array.isArray(score.detalhes) ? score.detalhes : [],
          }
        : null,
      fontes: midia.avaliacoes.map((a) => ({ fonte: a.fonte, url: a.url })),
    };
  }

  @Get("generos")
  @ApiOperation({ summary: "Lista os gêneros do catálogo (id, nome, slug, total)" })
  async listGeneros(): Promise<{ id: number; nome: string; slug: string; total_midias: number }[]> {
    const generos = await this.prisma.genero.findMany({
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        slug: true,
        _count: { select: { midias: true } },
      },
    });
    return generos.map((g) => ({
      id: g.id,
      nome: g.nome,
      slug: g.slug,
      total_midias: g._count.midias,
    }));
  }

  @Post(":id/view")
  @HttpCode(200)
  @ApiOperation({ summary: "Registra uma visualização da ficha técnica (histórico do usuário)" })
  async registrarView(
    @Param("id") id: string,
    @Req() req: FastifyRequest & { user?: { id: string } },
  ) {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      throw new NotFoundException({
        statusCode: 401,
        error: "Unauthorized",
        message: "Autenticação necessária.",
      });
    }
    // Nunca quebra a ficha técnica (ids legados não-UUID são ignorados).
    try {
      const score = await this.prisma.mediaScore.findFirst({
        where: { midia_id: id },
        orderBy: { calculado_em: "desc" },
        select: { score: true },
      });
      await this.prisma.mediaScoreView.create({
        data: {
          usuario_id: usuarioId,
          midia_id: id,
          score_exibido: score?.score ?? 0,
        },
      });
    } catch {
      return { ok: false };
    }
    return { ok: true };
  }

  @Get(":id")
  @ApiOperation({ summary: "Detalhes de uma mídia específica" })
  @ApiResponse({ status: 200, description: "Mídia encontrada." })
  @ApiResponse({ status: 404, description: "Mídia não encontrada." })
  async getOne(
    @Param("id") id: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{
    id: string;
    titulo: string;
    titulo_original: string | null;
    tipo: string;
    sinopse: string | null;
    ano_lancamento: number | null;
    classificacao_indicativa: string | null;
    imagem_url: string | null;
  }> {
    // T210: cache 120s (chave por id — dados públicos).
    const buscar = async () => {
      const midia = await this.prisma.midia.findUnique({ where: { id } });
      if (!midia) {
        throw new NotFoundException({
          statusCode: 404,
          error: "Not Found",
          message: "Mídia não encontrada.",
        });
      }
      return midia;
    };
    if (this.cacheService) {
      const { value, hit } = await this.cacheService.readThroughWithStatus(
        `midias:${id}`,
        120,
        buscar,
      );
      reply.header("X-Cache", hit ? "HIT" : "MISS");
      return value;
    }
    return buscar();
  }

  @Get(":id/media-score")
  @ApiOperation({ summary: "MEDIA Score™ consolidado para uma mídia" })
  @ApiResponse({ status: 200, description: "Score consolidado com confiança." })
  @ApiResponse({ status: 404, description: "Mídia não encontrada." })
  async getMediaScore(
    @Param("id") id: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{
    midia_id: string;
    score: number;
    criticosScore: number | null;
    publicoScore: number | null;
    consenso: number | null;
    indiceConsenso: number | null;
    votosTotal: number;
    num_fontes: number;
    confianca: number;
    pesos_usados: Record<string, number>;
    calculado_em: string;
  }> {
    // T210: cache 300s (dados públicos; score atualizado pelo job/invalidação).
    const calcular = async () => {
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
      // com os buckets Crítica/Público e campos v3 (MET-03).
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
          indiceConsenso: existing.indice_consenso ?? null,
          votosTotal: existing.votos_total ?? 0,
          num_fontes: existing.num_fontes,
          confianca: normalizarConfianca(existing.confianca),
          pesos_usados: existing.pesos_usados as Record<string, number>,
          calculado_em: existing.calculado_em.toISOString(),
        };
      }

      // Sem score persistido — calcula on-the-fly (v3: sem fontes = prior C).
      const result = this.mediaScoreService.calcularScoreV3(midia.tipo, []);
      return {
        midia_id: id,
        score: result.score,
        criticosScore: result.criticosScore,
        publicoScore: result.publicoScore,
        consenso: result.consenso,
        indiceConsenso: result.indiceConsenso,
        votosTotal: result.votosTotal,
        num_fontes: result.num_fontes,
        confianca: result.confianca,
        pesos_usados: result.pesos_usados,
        calculado_em: new Date().toISOString(),
      };
    };
    if (this.cacheService) {
      const { value, hit } = await this.cacheService.readThroughWithStatus(
        `midias:${id}:media-score`,
        300,
        calcular,
      );
      reply.header("X-Cache", hit ? "HIT" : "MISS");
      return value;
    }
    return calcular();
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  @UsePipes(new ZodValidationPipe(createMediaSchema))
  async create(@Body() body: CreateMediaDto) {
    const created = await this.mediaService.create(body);
    // T210: criação invalida catálogo/discover cacheados.
    await this.cacheInvalidation?.onMediaCreated();
    return created;
  }

  @Put(":id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  @UsePipes(new ZodValidationPipe(updateMediaSchema))
  async update(@Param("id") id: string, @Body() body: UpdateMediaDto) {
    const updated = await this.mediaService.update(id, body);
    // T210: escrita invalida a ficha/score/lista da mídia.
    await this.cacheInvalidation?.onMediaUpdated(id);
    return updated;
  }

  @Delete(":id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  @HttpCode(204)
  async remove(@Param("id") id: string) {
    await this.mediaService.remove(id);
    // T210: remoção invalida cache da mídia + listas.
    await this.cacheInvalidation?.onMediaUpdated(id);
  }
}
