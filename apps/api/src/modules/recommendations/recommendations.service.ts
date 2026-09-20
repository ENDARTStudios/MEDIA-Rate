import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { comContextoRls } from "../../common/rls-context.js";
import { Prisma, type TipoMidia } from "@prisma/client";
import { relacionadasDe, type FonteRelacao } from "./relation-graph.js";
import { soUuids } from "./uuid-guard.js";

const LIMITE_MAX = 50;

export interface Recomendacao {
  id: string;
  titulo: string;
  tipo: string;
  ano: number | null;
  poster_url: string | null;
  score: number | null;
  motivo: string;
}

export interface RecomendacoesResult {
  recomendacoes: Recomendacao[];
  proximo_cursor: string | null;
  mensagem?: string;
}

const SELECAO_MIDIA = {
  id: true,
  titulo: true,
  tipo: true,
  ano_lancamento: true,
  imagem_url: true,
  score: true,
  generos: { select: { genero: { select: { slug: true } } } },
} satisfies Prisma.MidiaSelect;

/**
 * T209 — substitui os stubs hardcoded do PremiumController por algoritmos
 * reais:
 *
 * - recomendarPorGenero (PLUS): gênero+tipo da watchlist, score ≥ média da
 *   watchlist, exclui itens já presentes, ordena por score desc, motivo
 *   explicável ("Mesmo gênero que X na sua watchlist").
 * - colaborativo (PREMIUM): usuários com ≥ 3 itens em comum na watchlist;
 *   rankeia mídias que eles têm e o usuário não tem por FREQUÊNCIA agregada
 *   (nunca expõe a watchlist de outros — só contagem + dados públicos da
 *   mídia). Sem similares → fallback para o algoritmo PLUS.
 *
 * Segurança: usuário_id sempre da sessão; apenas leitura; resposta
 * sanitizada (id/titulo/tipo/ano/poster_url/score/motivo).
 */
@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** PLUS — recomendações por gênero + score ponderado pela watchlist. */
  async recomendarPorGenero(
    usuarioId: string,
    opts: { limit?: number; cursor?: string | null } = {},
  ): Promise<RecomendacoesResult> {
    return comContextoRls(this.prisma, { usuarioId, role: "USER" }, async (tx) => {
      const limit = Math.min(opts.limit ?? 20, LIMITE_MAX);

      const watchlist = await tx.watchlistEntry.findMany({
        where: { usuario_id: usuarioId },
        select: { midia_id: true },
      });
      if (watchlist.length === 0) {
        return {
          recomendacoes: [],
          proximo_cursor: null,
          mensagem: "Adicione itens à sua watchlist para receber recomendações personalizadas",
        };
      }
      // T469/D-527: watchlist_entry.midia_id é VarChar e o banco de produção
      // tem 11 linhas legadas com ids externos (TMDB/slugs) — sem o filtro,
      // o `in` sobre midia.id (Uuid) lança "Error creating UUID" → 500.
      const idsDaLista = soUuids(watchlist.map((w) => w.midia_id));

      // T417 (achado g): exclui TODA mídia já interagida (status/rating) —
      // Descobertas deve sugerir o NOVO, não repetir o já visto.
      const interacoes = await tx.usuarioMidiaInteracao.findMany({
        where: { usuario_id: usuarioId },
        select: { midia_id: true },
      });
      const idsInteragidos = soUuids(interacoes.map((i) => i.midia_id));
      const idsExcluir = [...new Set([...idsDaLista, ...idsInteragidos])];

      const minhasMidias = await tx.midia.findMany({
        where: { id: { in: idsDaLista }, deleted_at: null },
        select: {
          id: true,
          titulo: true,
          tipo: true,
          score: true,
          generos: { select: { genero: { select: { slug: true } } } },
        },
      });

      const scores = minhasMidias.map((m) => m.score).filter((s): s is number => s != null);
      const media = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

      // (gênero, tipo) da watchlist + motivo (título do item que contribuiu).
      const generoMotivo = new Map<string, string>();
      const condicoes: Prisma.MidiaWhereInput[] = [];
      for (const m of minhasMidias) {
        for (const g of m.generos) {
          const slug = g.genero.slug;
          if (!generoMotivo.has(slug)) generoMotivo.set(slug, m.titulo);
          condicoes.push({ generos: { some: { genero: { slug } } }, tipo: m.tipo as TipoMidia });
        }
      }

      const rows = await tx.midia.findMany({
        where: {
          OR: condicoes,
          NOT: { id: { in: idsExcluir } },
          deleted_at: null,
          ...(media > 0 ? { score: { gte: media } } : {}),
        },
        ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
        take: limit + 1,
        orderBy: [{ score: "desc" }, { id: "asc" }],
        select: SELECAO_MIDIA,
      });

      const temMais = rows.length > limit;
      const pagina = temMais ? rows.slice(0, limit) : rows;
      const ultimo = pagina[pagina.length - 1];

      const recomendacoes: Recomendacao[] = pagina.map((r) => {
        const slug = r.generos[0]?.genero.slug;
        const tituloOrigem = slug ? generoMotivo.get(slug) : undefined;
        return {
          id: r.id,
          titulo: r.titulo,
          tipo: r.tipo,
          ano: r.ano_lancamento,
          poster_url: r.imagem_url,
          score: r.score,
          motivo: tituloOrigem
            ? `Mesmo gênero que ${tituloOrigem} na sua watchlist`
            : "Baseado no seu gosto na watchlist",
        };
      });

      return { recomendacoes, proximo_cursor: temMais && ultimo ? String(ultimo.id) : null };
    });
  }

  /**
   * T387b (F13) — recomendações por grafo de relações (qualquer plano):
   * franquia +3, adaptação +2, autor +2, gênero +1. RLS owner-only.
   */
  async recomendarPorGrafo(
    usuarioId: string,
    opts: { limit?: number } = {},
  ): Promise<RecomendacoesResult> {
    return comContextoRls(this.prisma, { usuarioId, role: "USER" }, async (tx) => {
      const limit = Math.min(opts.limit ?? 20, LIMITE_MAX);

      const watchlist = await tx.watchlistEntry.findMany({
        where: { usuario_id: usuarioId },
        select: { midia_id: true },
      });
      // T469/D-527: mesmo guard da perna PLUS — ids legados não-UUID na
      // watchlist derrubam o `in` do Prisma (issue MEDIA-RATE-3).
      const idsWatch = soUuids(watchlist.map((w) => w.midia_id));
      // T417 (achado g): exclui também toda mídia já interagida (status/rating).
      const interacoes = await tx.usuarioMidiaInteracao.findMany({
        where: { usuario_id: usuarioId },
        select: { midia_id: true },
      });
      const idsInteragidos = new Set(soUuids(interacoes.map((i) => i.midia_id)));
      if (idsWatch.length === 0) {
        return {
          recomendacoes: [],
          proximo_cursor: null,
          mensagem: "Adicione itens à sua watchlist para receber recomendações",
        };
      }

      const sel = {
        id: true,
        titulo: true,
        titulo_original: true,
        tipo: true,
        ano_lancamento: true,
        imagem_url: true,
        score: true,
        generos: { select: { genero: { select: { slug: true } } } },
        relacoes_origem: { where: { tipo: "ADAPTACAO_DE" }, select: { destino_id: true } },
      } as const;

      const [minhas, todas] = await Promise.all([
        tx.midia.findMany({ where: { id: { in: idsWatch }, deleted_at: null }, select: sel }),
        tx.midia.findMany({ where: { deleted_at: null }, select: sel }),
      ]);

      const toFonte = (m: (typeof todas)[number]): FonteRelacao => ({
        id: m.id,
        titulo: m.titulo,
        generos: m.generos.map((g) => g.genero.slug),
        franquia: m.titulo_original ?? m.titulo,
        autores: [],
        adaptacoes: m.relacoes_origem.map((r) => r.destino_id),
      });

      const candidatos = todas.map(toFonte);
      const porId = new Map(todas.map((m) => [m.id, m]));

      const rank = new Map<string, { motivo: string; score: number }>();
      for (const m of minhas) {
        for (const rel of relacionadasDe(toFonte(m), candidatos)) {
          if (idsWatch.includes(rel.id) || idsInteragidos.has(rel.id)) continue;
          const atual = rank.get(rel.id);
          if (!atual || rel.score > atual.score)
            rank.set(rel.id, { motivo: rel.motivo, score: rel.score });
        }
      }

      const ordenados = [...rank.entries()].sort((a, b) => b[1].score - a[1].score).slice(0, limit);
      const recomendacoes: Recomendacao[] = ordenados.flatMap(([midiaId, v]) => {
        const m = porId.get(midiaId);
        if (!m) return [];
        return [
          {
            id: m.id,
            titulo: m.titulo,
            tipo: m.tipo,
            ano: m.ano_lancamento,
            poster_url: m.imagem_url,
            score: m.score,
            motivo: v.motivo,
          },
        ];
      });

      return { recomendacoes, proximo_cursor: null };
    });
  }

  /** PREMIUM — colaborativo simples: usuários com watchlist similar. */
  async colaborativo(
    usuarioId: string,
    opts: { limit?: number } = {},
  ): Promise<RecomendacoesResult> {
    return comContextoRls(this.prisma, { usuarioId, role: "USER" }, async (tx) => {
      const limit = Math.min(opts.limit ?? 20, LIMITE_MAX);

      const minhaLista = await tx.watchlistEntry.findMany({
        where: { usuario_id: usuarioId },
        select: { midia_id: true },
      });
      if (minhaLista.length === 0) {
        return {
          recomendacoes: [],
          proximo_cursor: null,
          mensagem: "Adicione itens à sua watchlist para receber recomendações personalizadas",
        };
      }
      const meusIds = new Set(minhaLista.map((w) => w.midia_id));

      // Usuários que compartilham ≥ 3 itens comigo (agregação por usuário).
      const entradasCompartilhadas = await tx.watchlistEntry.findMany({
        where: { midia_id: { in: [...meusIds] } },
        select: { usuario_id: true, midia_id: true },
      });
      const frequenciaPorUsuario = new Map<string, number>();
      for (const e of entradasCompartilhadas) {
        if (e.usuario_id === usuarioId) continue;
        frequenciaPorUsuario.set(e.usuario_id, (frequenciaPorUsuario.get(e.usuario_id) ?? 0) + 1);
      }
      const similares = [...frequenciaPorUsuario.entries()]
        .filter(([, n]) => n >= 3)
        .map(([uid]) => uid);

      // Sem similares → fallback para o algoritmo PLUS (gênero+score).
      if (similares.length === 0) {
        return this.recomendarPorGenero(usuarioId, opts);
      }

      // Frequência de mídias dos similares que eu NÃO tenho (agregada — nunca
      // expõe a watchlist individual de outro usuário).
      const entradasDeles = await tx.watchlistEntry.findMany({
        where: { usuario_id: { in: similares } },
        select: { midia_id: true },
      });
      const frequenciaMidia = new Map<string, number>();
      for (const e of entradasDeles) {
        if (meusIds.has(e.midia_id)) continue;
        frequenciaMidia.set(e.midia_id, (frequenciaMidia.get(e.midia_id) ?? 0) + 1);
      }

      const ordenados = [...frequenciaMidia.entries()]
        .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
        .slice(0, limit)
        .map(([midiaId]) => midiaId);

      if (ordenados.length === 0) {
        return this.recomendarPorGenero(usuarioId, opts);
      }

      const midias = await tx.midia.findMany({
        where: { id: { in: ordenados }, deleted_at: null },
        select: SELECAO_MIDIA,
      });
      const porId = new Map(midias.map((m) => [m.id, m]));

      const recomendacoes: Recomendacao[] = ordenados.flatMap((midiaId) => {
        const m = porId.get(midiaId);
        if (!m) return [];
        return [
          {
            id: m.id,
            titulo: m.titulo,
            tipo: m.tipo,
            ano: m.ano_lancamento,
            poster_url: m.imagem_url,
            score: m.score,
            motivo: "Popular entre usuários com gosto similar",
          },
        ];
      });

      return { recomendacoes, proximo_cursor: null };
    });
  }
}
