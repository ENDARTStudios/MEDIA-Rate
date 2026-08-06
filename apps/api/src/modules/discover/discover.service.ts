import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { Prisma, type TipoMidia } from "@prisma/client";
import { slugify } from "../../common/slugify.js";

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
    // Parametrizado via Prisma.sql — nunca interpolar input do usuário no SQL.
    const tipoFilter = opts.tipo ? Prisma.sql`AND tipo = ${opts.tipo}::"TipoMidia"` : Prisma.empty;

    const results: (Record<string, unknown> & { total: number })[] = await this.prisma
      .$queryRaw(Prisma.sql`
      SELECT id, titulo, tipo, ano_lancamento, sinopse, imagem_url,
             COUNT(*) OVER()::int AS total
      FROM "midia"
      WHERE (titulo % ${q} OR sinopse % ${q}) ${tipoFilter}
      ORDER BY similarity(titulo, ${q}) DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const total = results.length > 0 ? (results[0]?.total ?? 0) : 0;
    // Slug canônico por item (frontend navega por URL amigável).
    const items = results.map((r) => ({
      ...r,
      slug: slugify(String(r.titulo ?? "")),
    }));
    return { items, total, limit, offset };
  }

  async discover(opts: { limit?: number; tipo?: TipoMidia } = {}) {
    const items = await this.prisma.midia.findMany({
      where: opts.tipo ? { tipo: opts.tipo } : undefined,
      take: Math.min(opts.limit ?? 20, 100),
      include: {
        scores: {
          select: { score: true },
          where: { score: { gt: 0 } },
          take: 1,
          orderBy: { calculado_em: "desc" },
        },
      },
    });

    const enriched = items.map((m) => ({
      ...m,
      score: m.scores?.[0]?.score ?? null,
    }));
    enriched.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    return { items: enriched, total: items.length };
  }

  async trending(opts: { limit?: number } = {}) {
    return this.discover({ limit: opts.limit ?? 10 });
  }

  /**
   * Catálogo filtrado por gênero (T198, Addendum 2 Parte 4 + 3 Parte 3):
   * - gênero NARRATIVO → cross-mídia (qualquer tipo de mídia);
   * - gênero SUBGENERO  → restrito ao midia_alvo (RPG → só GAME, Shonen → só ANIME).
   */
  async listarPorGenero(slug: string, opts: { limit?: number } = {}) {
    const genero = await this.prisma.genero.findUnique({ where: { slug } });
    if (!genero) return { genero: null, items: [], total: 0 };

    const items = await this.prisma.midia.findMany({
      where: {
        generos: { some: { genero_id: genero.id } },
        ...(genero.tipo === "SUBGENERO" && genero.midia_alvo ? { tipo: genero.midia_alvo } : {}),
      },
      take: Math.min(opts.limit ?? 40, 100),
      include: {
        scores: {
          select: { score: true },
          where: { score: { gt: 0 } },
          take: 1,
          orderBy: { calculado_em: "desc" },
        },
      },
    });

    const enriched = items.map((m) => ({
      ...m,
      score: m.scores?.[0]?.score ?? null,
    }));
    enriched.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    return {
      genero: {
        id: genero.id,
        nome: genero.nome,
        slug: genero.slug,
        tipo: genero.tipo,
        midiaAlvo: genero.midia_alvo,
      },
      items: enriched,
      total: enriched.length,
    };
  }
}
