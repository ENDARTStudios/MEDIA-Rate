import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { z } from "zod";
import { DiscoverService } from "./discover.service.js";

const TIPO_MIDIA_VALUES = ["FILME", "SERIE", "GAME", "LIVRO", "ANIME", "COMIC"] as const;

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
  constructor(private readonly service: DiscoverService) {}

  @Get("search")
  async search(@Query() query: unknown) {
    const { q, tipo, limit, offset } = parseOrThrow(SearchQuerySchema, query);
    return this.service.search(q, { tipo, limit, offset });
  }

  @Get("discover")
  async discover(@Query() query: unknown) {
    const { tipo, limit } = parseOrThrow(DiscoverQuerySchema, query);
    return this.service.discover({ tipo, limit });
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
}
