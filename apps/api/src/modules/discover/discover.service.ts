import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { Prisma, type TipoMidia } from "@prisma/client";
import { slugify } from "../../common/slugify.js";
import { normalizarImagem } from "../../common/normalizar-imagem.js";

interface SearchOptions {
  tipo?: TipoMidia;
  limit?: number;
  offset?: number;
}

// T223/D-224: translate() built-in (IMMUTABLE) — a mesma normalização da
// coluna gerada é aplicada no termo de busca ('ação' e 'acao' cruzam).
const ACENTOS = "ÁÀÂÃÄÅáàâãäåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ";
const SEM_ACENTOS = "AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn";

/** Normaliza um termo para comparação ILIKE (sem acentos, minúsculo). */
function normalizarTermo(termo: string): string {
  return termo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * T309 — monta o tsquery com prefix matching no ÚLTIMO token:
 * 'bers' → `bers:*`; 'breaking ba' → `breaking & ba:*`. Sanitização de
 * tokens só-letras/números neutraliza operadores de tsquery (& | ! : *).
 */
function montarTsqueryPrefixo(q: string): Prisma.Sql {
  const tokens = q.match(/[\p{L}\p{N}]+/gu) ?? [];
  if (tokens.length === 0) {
    return Prisma.sql`plainto_tsquery('portuguese', '')`;
  }
  const tsquery = tokens.map((t, i) => (i === tokens.length - 1 ? `${t}:*` : t)).join(" & ");
  return Prisma.sql`to_tsquery('portuguese', translate(${tsquery}, ${ACENTOS}, ${SEM_ACENTOS}))`;
}

interface DiscoverRow {
  id: string;
  titulo: string;
  titulo_original: string | null;
  titulo_en: string | null;
  titulo_es: string | null;
  tipo: string;
  ano_lancamento: number | null;
  poster_url: string | null;
  score: number | null;
  na_watchlist: boolean;
}

@Injectable()
export class DiscoverService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * T227: /search legado NÃO pode divergir do /discover — delega para a
   * MESMA busca normalizada (tsvector + translate() nos dois lados para
   * q >= 3; pg_trgm para q < 3), mantendo o formato de resposta antigo
   * (items/total) para o catálogo da web. Paridade de acentos é binária:
   * 'acao' e 'ação' retornam o mesmo conjunto. Offset é ignorado (o
   * discover usa paginação keyset por cursor; o web pagina localmente).
   */
  async search(q: string, opts: SearchOptions = {}) {
    const { itens, total_estimado } = await this.discover({
      q,
      tipo: opts.tipo,
      limit: opts.limit,
    });
    return {
      items: itens.map((i) => ({
        id: i.id,
        titulo: i.titulo,
        tipo: i.tipo,
        ano_lancamento: i.ano,
        sinopse: null,
        imagem_url: i.poster_url,
        slug: i.slug,
      })),
      total: total_estimado,
      limit: opts.limit ?? 20,
      offset: opts.offset ?? 0,
    };
  }

  /**
   * T208 — busca/catálogo combinado (GET /api/v1/discover).
   *
   * - q >= 3 chars: full-text com tsvector (acentos normalizados por
   *   translate() built-in na coluna gerada e no termo — T223/D-224, sem
   *   unaccent em colunas geradas);
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
      SELECT score FROM "media_score" ms
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
          WHERE w.midia_id = m.id::text AND w.usuario_id = ${opts.usuarioId}::uuid
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
      // T309: full-text com prefixo no último token (sensação de autocomplete).
      // to_tsquery + tokens sanitizados (só letras/números — neutraliza
      // operadores & | ! : * de tsquery); translate() nos dois lados mantém
      // a paridade de acentos (T223/D-224). Bônus de igualdade: título que
      // COMEÇA com o termo normalizado fica na frente de match de token.
      const tsq = montarTsqueryPrefixo(q);
      const normQ = normalizarTermo(q);
      matchSql = Prisma.sql`AND (m.titulo_tsv @@ ${tsq} OR m.sinopse_tsv @@ ${tsq})`;
      rankSql = Prisma.sql`ts_rank(m.titulo_tsv, ${tsq})
        + CASE WHEN translate(m.titulo, ${ACENTOS}, ${SEM_ACENTOS}) ILIKE ${`${normQ}%`}
          THEN 0.05 ELSE 0 END`;
      orderSql = Prisma.sql`ORDER BY ${rankSql} DESC, m.id ASC`;
    }

    // Cursor keyset sobre (rank, id): busca o rank do item-cursor na mesma
    // expressão (determinística) e compara por linha.
    let cursorSql = Prisma.empty;
    if (opts.cursor) {
      const cursorRow = await this.prisma.$queryRaw<{ rank: number }[]>(Prisma.sql`
        SELECT ${rankSql} AS rank
        FROM "midia" m ${lateralScore}
        WHERE m.id = ${opts.cursor}::uuid AND m.deleted_at IS NULL
      `);
      const cursorRank = cursorRow[0]?.rank;
      if (cursorRank == null) {
        return { itens: [], proximo_cursor: null, total_estimado: 0 };
      }
      cursorSql = Prisma.sql`AND (${rankSql}, m.id) < (${cursorRank}::real, ${opts.cursor}::uuid)`;
    }

    const rows = await this.prisma.$queryRaw<DiscoverRow[]>(Prisma.sql`
      SELECT m.id, m.titulo, m.titulo_original, m.titulo_en, m.titulo_es, m.tipo, m.ano_lancamento,
             m.imagem_url AS poster_url, s.score,
             ${watchlistSql} AS na_watchlist
      FROM "midia" m ${lateralScore}
      WHERE m.deleted_at IS NULL ${matchSql} ${tipoSql} ${generoSql} ${cursorSql}
      ${orderSql}
      LIMIT ${limit + 1}
    `);

    const totalRows = await this.prisma.$queryRaw<{ total: number }[]>(Prisma.sql`
      SELECT COUNT(*)::int AS total FROM "midia" m
      WHERE m.deleted_at IS NULL ${matchSql} ${tipoSql} ${generoSql}
    `);

    const temMais = rows.length > limit;
    const pagina = temMais ? rows.slice(0, limit) : rows;
    const ultimo = pagina[pagina.length - 1];
    const proximoCursor = temMais && ultimo ? String(ultimo.id) : null;

    const itens = pagina.map((r) => ({
      id: r.id,
      titulo: r.titulo,
      titulo_original: r.titulo_original,
      titulo_en: r.titulo_en,
      titulo_es: r.titulo_es,
      tipo: r.tipo,
      ano: r.ano_lancamento,
      poster_url: normalizarImagem(r.poster_url),
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
