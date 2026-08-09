import { BadRequestException, Controller, Get, Query, Req, Res, Optional } from "@nestjs/common";
import { z } from "zod";
import type { FastifyRequest, FastifyReply } from "fastify";
import { DiscoverService } from "./discover.service.js";
import { SessionService } from "../auth/session.service.js";
import { CacheService } from "../../common/cache.service.js";
import { discoverQuerySchema } from "./dto/search-query.dto.js";

// D-233/T231: MANGA é categoria própria; ANIME ficou deprecated no banco
// (animação japonesa = SERIE, quadrinho japonês = MANGA) e não é exposto.
const TIPO_MIDIA_VALUES = ["FILME", "SERIE", "GAME", "LIVRO", "MANGA", "COMIC"] as const;

const SearchQuerySchema = z.object({
  q: z.string().trim().min(1, "Informe um termo de busca.").max(200, "Termo de busca muito longo."),
  tipo: z.enum(TIPO_MIDIA_VALUES).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const DiscoverQuerySchema = z.object({
  tipo: z.enum(TIPO_MIDIA_VALUES).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const CatalogQuerySchema = z.object({
  genero: z.string().trim().min(1).max(80),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const firstError = result.error.issues[0];
    throw new BadRequestException({
      statusCode: 400,
      error: "Bad Request",
      message: `Validation failed: ${firstError?.message ?? "invalid query"}`,
    });
  }
  return result.data;
}

@Controller("api/v1")
export class DiscoverController {
  constructor(
    private readonly service: DiscoverService,
    private readonly sessionService: SessionService,
    // T210: cache opcional (ausente em testes unitários).
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  @Get("search")
  async search(@Query() query: unknown) {
    const { q, tipo, limit, offset } = parseOrThrow(SearchQuerySchema, query);
    return this.service.search(q, { tipo, limit, offset });
  }

  /**
   * T208 — busca/catálogo combinado. Endpoint PÚBLICO; se houver sessão
   * válida (cookie 'sess'), marca na_watchlist nos resultados. Falha de
   * sessão → anônimo (nunca 401).
   *
   * T210 — cache de 30s APENAS para anônimos: a flag na_watchlist depende
   * do usuário autenticado e nunca pode ser cacheada entre usuários.
   */
  @Get("discover")
  async discover(
    @Req() req: FastifyRequest,
    @Query() query: unknown,
    @Res({ passthrough: true }) reply?: FastifyReply,
  ) {
    const params = parseOrThrow(discoverQuerySchema, query);
    const usuarioId = await this.resolverUsuarioOpcional(req);
    if (!usuarioId && this.cacheService) {
      const chave = `discover:${this.cacheService.hashKey(req.url)}`;
      const { value, hit } = await this.cacheService.readThroughWithStatus(chave, 30, () =>
        this.service.discover({ ...params, usuarioId: null }),
      );
      reply?.header("X-Cache", hit ? "HIT" : "MISS");
      return value;
    }
    return this.service.discover({ ...params, usuarioId });
  }

  @Get("catalog")
  async catalog(@Query() query: unknown) {
    const { genero, limit } = parseOrThrow(CatalogQuerySchema, query);
    return this.service.listarPorGenero(genero, { limit });
  }

  @Get("trending")
  async trending(@Query() query: unknown) {
    const { limit } = parseOrThrow(DiscoverQuerySchema, query);
    return this.service.trending({ limit });
  }

  private async resolverUsuarioOpcional(req: FastifyRequest): Promise<string | null> {
    const cookies = (req as unknown as { cookies?: Record<string, string> }).cookies;
    const token = cookies?.sess;
    if (!token) return null;
    try {
      const result = await this.sessionService.validateToken(token);
      return result?.sessao?.usuario_id ?? null;
    } catch {
      return null;
    }
  }
}
