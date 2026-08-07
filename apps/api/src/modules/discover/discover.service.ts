import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { Prisma, type TipoMidia } from "@prisma/client";
import { slugify } from "../../common/slugify.js";

interface SearchOptions {
  tipo?: TipoMidia;
  limit?: number;
  offset?: number;
}

interface DiscoverRow {
  id: string;
  titulo: string;
  tipo: string;
  ano_lancamento: number | null;
  poster_url: string | null;
  score: number | null;
  na_watchlist: boolean;
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

  /**
   * T208 — busca/catálogo combinado (GET /api/v1/discover).
   *
   * - q >= 3 chars: full-text com tsvector + unaccent (GIN indexado);
   * - q < 3 chars: fallback pg_trgm (similaridade, GIN trigram indexado);
   * - q ausente/vazio: modo catálogo (lista paginada por score);
   * - filtros combinados: tipo + genero;
   * - paginação keyset por cursor (UUID do último item) — ordenação
   *   determinística (rank DESC, id ASC);
   * - na_watchlist: flag do usuário autenticado (sessão opcional);
   * - saída sanitizada: id, titulo, tipo, ano, poster_url, score,
   *   na_watchlist, slug — nunca campos internos.
   *
   * Segurança: 100% parametrizado via Prisma.sql (sem interpolação de input);
   * plainto_tsquery não aceita sintaxe de query; zod valida cursor/tipo/limit.
   */
  async discover(
    opts: {
      q?: string;
      tipo?: TipoMidia;
      genero?: string;
      cursor?: string | null;
      limit?: number;
      usuarioId?: string | null;
    } = {},
  ) {
    const limit = Math.min(opts.limit ?? 20, 50);
    const q = opts.q?.trim() ?? "";

    const lateralScore = Prisma.sql`LEFT JOIN LATERAL (
      SELECT score FROM "midia_score" ms
      WHERE ms.midia_id = m.id AND ms.score > 0
      ORDER BY ms.calculado_em DESC LIMIT 1
    ) s ON true`;

    const tipoSql = opts.tipo ? Prisma.sql`AND m.tipo = ${opts.tipo}::"TipoMidia"` : Prisma.empty;
    const generoSql = opts.genero
      ? Prisma.sql`AND m.id IN (
          SELECT mg.midia_id FROM "midia_genero" mg
          JOIN "genero" g ON g.id = mg.genero_id
          WHERE g.slug = ${opts.genero}
        )`
      : Prisma.empty;

    const watchlistSql = opts.usuarioId
      ? Prisma.sql`EXISTS (
          SELECT 1 FROM "watchlist_entry" w
          WHERE w.midia_id = m.id::text AND w.usuario_id = ${opts.usuarioId}
        )`
      : Prisma.sql`false`;

    let matchSql = Prisma.empty;
    let rankSql: Prisma.Sql;
    let orderSql: Prisma.Sql;
    if (!q) {
      rankSql = Prisma.sql`COALESCE(s.score, 0)::real`;
      orderSql = Prisma.sql`ORDER BY COALESCE(s.score, 0) DESC NULLS LAST, m.id ASC`;
    } else if (q.length < 3) {
      matchSql = Prisma.sql`AND (m.titulo % ${q} OR m.sinopse % ${q})`;
      rankSql = Prisma.sql`similarity(m.titulo, ${q})`;
      orderSql = Prisma.sql`ORDER BY similarity(m.titulo, ${q}) DESC, m.id ASC`;
    } else {
      const tsq = Prisma.sql`plainto_tsquery('portuguese', unaccent(${q}))`;
      matchSql = Prisma.sql`AND (m.titulo_tsv @@ ${tsq} OR m.sinopse_tsv @@ ${tsq})`;
      rankSql = Prisma.sql`ts_rank(m.titulo_tsv, ${tsq})`;
      orderSql = Prisma.sql`ORDER BY ts_rank(m.titulo_tsv, ${tsq}) DESC, m.id ASC`;
    }

    // Cursor keyset sobre (rank, id): busca o rank do item-cursor na mesma
    // expressão (determinística) e compara por linha.
    let cursorSql = Prisma.empty;
    if (opts.cursor) {
      const cursorRow = await this.prisma.$queryRaw<{ rank: number }[]>(Prisma.sql`
        SELECT ${rankSql} AS rank
        FROM "midia" m ${lateralScore}
        WHERE m.id = ${opts.cursor}::uuid
      `);
      const cursorRank = cursorRow[0]?.rank;
      if (cursorRank == null) {
        return { itens: [], proximo_cursor: null, total_estimado: 0 };
      }
      cursorSql = Prisma.sql`AND (${rankSql}, m.id) < (${cursorRank}::real, ${opts.cursor}::uuid)`;
    }

    const rows = await this.prisma.$queryRaw<DiscoverRow[]>(Prisma.sql`
      SELECT m.id, m.titulo, m.tipo, m.ano_lancamento,
             m.imagem_url AS poster_url, s.score,
             ${watchlistSql} AS na_watchlist
      FROM "midia" m ${lateralScore}
      WHERE 1=1 ${matchSql} ${tipoSql} ${generoSql} ${cursorSql}
      ${orderSql}
      LIMIT ${limit + 1}
    `);

    const totalRows = await this.prisma.$queryRaw<{ total: number }[]>(Prisma.sql`
      SELECT COUNT(*)::int AS total FROM "midia" m
      WHERE 1=1 ${matchSql} ${tipoSql} ${generoSql}
    `);

    const temMais = rows.length > limit;
    const pagina = temMais ? rows.slice(0, limit) : rows;
    const ultimo = pagina[pagina.length - 1];
    const proximoCursor = temMais && ultimo ? String(ultimo.id) : null;

    const itens = pagina.map((r) => ({
      id: r.id,
      titulo: r.titulo,
      tipo: r.tipo,
      ano: r.ano_lancamento,
      poster_url: r.poster_url,
      score: r.score,
      na_watchlist: r.na_watchlist === true,
      slug: slugify(String(r.titulo ?? "")),
    }));

    return { itens, proximo_cursor: proximoCursor, total_estimado: totalRows[0]?.total ?? 0 };
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
