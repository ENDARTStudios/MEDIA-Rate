import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { TipoMidia } from "@prisma/client";

interface SearchOptions {
  tipo?: TipoMidia;
  limit?: number;
  offset?: number;
}

@Injectable()
export class DiscoverService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, opts: SearchOptions = {}) {
    const limit = Math.min(opts.limit ?? 20, 100);
    const offset = opts.offset ?? 0;
    const tipoFilter = opts.tipo ? `AND tipo = '${opts.tipo}'::"TipoMidia"` : "";

    const results: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT id, titulo, tipo, ano_lancamento, sinopse, imagem_url,
             COUNT(*) OVER()::int AS total
      FROM "midia"
      WHERE (titulo % $1 OR sinopse % $1) ${tipoFilter}
      ORDER BY similarity(titulo, $1) DESC
      LIMIT ${limit} OFFSET ${offset}
    `, q);

    const total = results.length > 0 ? results[0].total : 0;
    return { items: results, total, limit, offset };
  }

  async discover(opts: { limit?: number; tipo?: TipoMidia } = {}) {
    const items = await this.prisma.midia.findMany({
      where: opts.tipo ? { tipo: opts.tipo } : undefined,
      take: Math.min(opts.limit ?? 20, 100),
      include: {
        scores: { select: { score: true }, where: { score: { gt: 0 } }, take: 1, orderBy: { calculado_em: "desc" } },
      },
    });

    const enriched = items.map((m: any) => ({
      ...m,
      score: m.scores?.[0]?.score ?? null,
    }));
    enriched.sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0));

    return { items: enriched, total: items.length };
  }

  async trending(opts: { limit?: number } = {}) {
    return this.discover({ limit: opts.limit ?? 10 });
  }
}
