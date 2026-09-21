import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  StatusConsumo,
  ReacaoConsumo,
  MotivoAbandono,
  Prisma,
  TipoRelacao,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service.js";
import { comContextoRls } from "../../common/rls-context.js";
import { STATUS_PARA_COLUNA } from "../../common/status-coluna.js";
import { TRANSOES_VALIDAS } from "../../common/estados-consumo.js";
import { reacaoEditavelPara } from "./signal-engine.js";
import type { ListInteracoesQueryDto } from "./interacoes.dto.js";

/**
 * Addendum 4, Parte 3 — máquina de estados de consumo.
 * QUERO_CONSUMIR → CONSUMINDO / CONCLUIDO / ABANDONADO
 * CONSUMINDO     → CONCLUIDO / ABANDONADO
 * CONCLUIDO      → QUERO_CONSUMIR / CONSUMINDO (retomar/rever)
 * ABANDONADO     → QUERO_CONSUMIR / CONSUMINDO / CONCLUIDO (reclassificar)
 * D-527: CONCLUIDO → ABANDONADO NÃO é permitido — item concluído não é
 * reclassificado como abandonado (para "desistir depois de retomar",
 * o caminho é CONCLUIDO → CONSUMINDO → ABANDONADO).
 */
// D-528/T027: máquina de estados compartilhada (common/estados-consumo.ts).

export interface UpsertInteracaoDto {
  status?: StatusConsumo;
  reacao?: ReacaoConsumo | null;
  motivoAbandono?: MotivoAbandono | null;
  progressoDetalhe?: string | null;
  /** T201 (G4) — id da aresta do grafo que originou a descoberta. */
  origemRelacaoId?: string | null;
}

export interface Descoberta {
  fromMediaId: string;
  fromMediaType: string;
  toMediaId: string;
  toMediaType: string;
  relationType: TipoRelacao;
  discoveredAt: Date;
  fromMedia: {
    id: string;
    titulo: string;
    tipo: string;
    imagemUrl: string | null;
    score: number | null;
  };
  toMedia: {
    id: string;
    titulo: string;
    tipo: string;
    imagemUrl: string | null;
    score: number | null;
  };
}

export interface TasteMonth {
  month: string; // "YYYY-MM"
  genreWeights: Record<string, number>;
}

@Injectable()
export class InteracoesService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(
    usuarioId: string,
    filtro: ListInteracoesQueryDto = {},
  ): Promise<{
    items: Awaited<ReturnType<InteracoesService["mapearItem"]>>[];
    total: number;
    porStatus: Record<string, number>;
    nextCursor: string | null;
  }> {
    const limit = filtro.limit ?? 50;
    const offset = this.decodificarCursor(filtro.cursor);
    const where: Prisma.UsuarioMidiaInteracaoWhereInput = {
      usuario_id: usuarioId,
      ...(filtro.status ? { status: filtro.status } : {}),
      ...(filtro.tipo ? { midia: { tipo: filtro.tipo } } : {}),
    };

    return comContextoRls(this.prisma, { usuarioId, role: "USER" }, async (tx) => {
      const [interacoes, total, porStatusBruto] = await Promise.all([
        tx.usuarioMidiaInteracao.findMany({
          where,
          orderBy: { atualizado_em: "desc" },
          skip: offset,
          take: limit,
          include: {
            midia: {
              select: {
                id: true,
                slug: true,
                titulo: true,
                tipo: true,
                ano_lancamento: true,
                imagem_url: true,
                score: true,
              },
            },
          },
        }),
        tx.usuarioMidiaInteracao.count({ where }),
        tx.usuarioMidiaInteracao.groupBy({
          by: ["status"],
          where: { usuario_id: usuarioId },
          _count: { _all: true },
        }),
      ]);

      const porStatus: Record<string, number> = {
        QUERO_CONSUMIR: 0,
        CONSUMINDO: 0,
        CONCLUIDO: 0,
        ABANDONADO: 0,
      };
      for (const linha of porStatusBruto) {
        porStatus[linha.status] = linha._count._all;
      }

      const items = interacoes.map((i) => this.mapearItem(i));
      // Página curta (ou vazia) = última página — evita cursor infinito.
      const nextCursor =
        items.length === limit && offset + items.length < total
          ? this.codificarCursor(offset + items.length)
          : null;

      return { items, total, porStatus, nextCursor };
    });
  }

  /**
   * Item estável da resposta (snake_case, contrato da API). Pass-through
   * COMPLETO dos campos da interação — o fetchAll do use-interaction-store
   * lê reacao/motivo_abandono do payload cru (D-525: não fatiar aqui).
   */
  private mapearItem(
    i: Prisma.UsuarioMidiaInteracaoGetPayload<{
      include: {
        midia: {
          select: {
            id: true;
            slug: true;
            titulo: true;
            tipo: true;
            ano_lancamento: true;
            imagem_url: true;
            score: true;
          };
        };
      };
    }>,
  ) {
    return i;
  }

  /** Cursor opaco = offset em base64url; inválido → 400 (nunca 500). */
  private codificarCursor(offset: number): string {
    return Buffer.from(String(offset), "utf8").toString("base64url");
  }

  private decodificarCursor(cursor: string | undefined): number {
    if (cursor === undefined) return 0;
    const decodificado = Number.parseInt(Buffer.from(cursor, "base64url").toString("utf8"), 10);
    if (!Number.isInteger(decodificado) || decodificado < 0) {
      throw new BadRequestException("Cursor inválido.");
    }
    return decodificado;
  }

  async obter(usuarioId: string, midiaId: string) {
    const interacao = await this.prisma.usuarioMidiaInteracao.findUnique({
      where: { usuario_id_midia_id: { usuario_id: usuarioId, midia_id: midiaId } },
      include: {
        midia: {
          select: {
            id: true,
            titulo: true,
            tipo: true,
            imagem_url: true,
            score: true,
          },
        },
      },
    });
    return interacao ?? null;
  }

  /** Cria/atualiza status+reação com validação da máquina de estados. */
  async upsert(usuarioId: string, midiaId: string, dto: UpsertInteracaoDto) {
    return comContextoRls(this.prisma, { usuarioId, role: "USER" }, async (tx) => {
      const midia = await this.prisma.midia.findUnique({
        where: { id: midiaId },
        select: { id: true },
      });
      if (!midia) {
        throw new NotFoundException("Mídia não encontrada.");
      }

      // T201 (G4): valida a origem da descoberta — a relação deve existir e
      // conectar a mídia sendo interagida (uma das pontas da aresta).
      if (dto.origemRelacaoId != null) {
        const rel = await tx.relacaoObra.findUnique({
          where: { id: dto.origemRelacaoId },
          select: { id: true, origem_id: true, destino_id: true },
        });
        if (!rel) {
          throw new BadRequestException("Relação de origem não encontrada.");
        }
        if (rel.origem_id !== midiaId && rel.destino_id !== midiaId) {
          throw new BadRequestException("A relação de origem não conecta esta mídia.");
        }
      }

      const existente = await tx.usuarioMidiaInteracao.findUnique({
        where: { usuario_id_midia_id: { usuario_id: usuarioId, midia_id: midiaId } },
      });

      const proximoStatus = dto.status ?? existente?.status ?? "QUERO_CONSUMIR";
      const statusAtual = existente?.status ?? "QUERO_CONSUMIR";

      if (!TRANSOES_VALIDAS[statusAtual].includes(proximoStatus)) {
        throw new BadRequestException(
          `Transição de status inválida: ${statusAtual} → ${proximoStatus}.`,
        );
      }

      // Reação só é aceita/editável quando o status (final) é CONCLUIDO ou
      // ABANDONADO (Addendum 4, Parte 3).
      const querReagir = dto.reacao !== undefined;
      if (querReagir && !reacaoEditavelPara(proximoStatus)) {
        throw new BadRequestException(
          "Reação só pode ser definida com status CONCLUIDO ou ABANDONADO.",
        );
      }

      const querMotivo = dto.motivoAbandono !== undefined && dto.motivoAbandono !== null;
      if (querMotivo && proximoStatus !== "ABANDONADO") {
        throw new BadRequestException("Motivo de abandono só é válido com status ABANDONADO.");
      }

      const agora = new Date();
      const data: Prisma.UsuarioMidiaInteracaoUpsertArgs["create"] = {
        usuario_id: usuarioId,
        midia_id: midiaId,
        status: proximoStatus,
        reacao: dto.reacao ?? null,
        motivo_abandono: dto.motivoAbandono ?? null,
        progresso_detalhe: dto.progressoDetalhe ?? null,
        // T201: origem da descoberta (nullable; preservada em updates parciais).
        origem_relacao_id: dto.origemRelacaoId ?? null,
        iniciado_em: proximoStatus === "CONSUMINDO" ? agora : null,
        concluido_em: proximoStatus === "CONCLUIDO" ? agora : null,
        atualizado_em: agora,
      };

      const interacao = await tx.usuarioMidiaInteracao.upsert({
        where: { usuario_id_midia_id: { usuario_id: usuarioId, midia_id: midiaId } },
        create: data,
        update: {
          status: proximoStatus,
          reacao: dto.reacao ?? null,
          motivo_abandono: dto.motivoAbandono ?? null,
          progresso_detalhe: dto.progressoDetalhe ?? null,
          // Só toca origem_relacao_id quando explicitamente enviado (preserva
          // a origem da descoberta em updates parciais de status/reação).
          ...(dto.origemRelacaoId !== undefined ? { origem_relacao_id: dto.origemRelacaoId } : {}),
          iniciado_em: proximoStatus === "CONSUMINDO" ? agora : existente?.iniciado_em,
          concluido_em: proximoStatus === "CONCLUIDO" ? agora : null,
          atualizado_em: agora,
        },
      });

      // D-375: dual-write transacional — usuario_midia_interacao é a fonte de
      // verdade de status; watchlist_entry é a projeção do Kanban. Cria a
      // projeção se não existir (antes só alinhava quando já existia — o menu
      // '+' prometia o item no Kanban e não entregava).
      await tx.watchlistEntry.upsert({
        where: { usuario_id_midia_id: { usuario_id: usuarioId, midia_id: midiaId } },
        create: {
          usuario_id: usuarioId,
          midia_id: midiaId,
          coluna: STATUS_PARA_COLUNA[proximoStatus],
        },
        update: { coluna: STATUS_PARA_COLUNA[proximoStatus] },
      });

      return interacao;
    });
  }

  /**
   * T201 (G4) — GET /discoveries: descobertas cross-mídia do usuário, em
   * ordem cronológica descendente. Derivado de interações com
   * origem_relacao_id (join com relacao_obra + mídias) — UMA query, sem N+1.
   * T286: UNION com DiscoveryEvents (reação GOSTEI → obras relacionadas),
   * mesmo shape Descoberta, sem duplicar to_media_id.
   */
  async descobertas(usuarioId: string): Promise<Descoberta[]> {
    return comContextoRls(this.prisma, { usuarioId, role: "USER" }, async (tx) => {
      const interacoes = await tx.usuarioMidiaInteracao.findMany({
        where: { usuario_id: usuarioId, origem_relacao_id: { not: null } },
        orderBy: { atualizado_em: "desc" },
        include: {
          midia: {
            select: {
              id: true,
              titulo: true,
              tipo: true,
              imagem_url: true,
              score: true,
            },
          },
          origem_relacao: {
            include: {
              origem: {
                select: {
                  id: true,
                  titulo: true,
                  tipo: true,
                  imagem_url: true,
                  score: true,
                },
              },
              destino: {
                select: {
                  id: true,
                  titulo: true,
                  tipo: true,
                  imagem_url: true,
                  score: true,
                },
              },
            },
          },
        },
      });

      const daInteracao: Descoberta[] = interacoes.flatMap((i) => {
        const rel = i.origem_relacao;
        if (!rel) return [];
        // "from" é a ponta da aresta que NÃO é a mídia interagida (a origem
        // do consumo); "to" é a mídia descoberta (a interagida).
        const from = rel.origem_id === i.midia_id ? rel.destino : rel.origem;
        const mediaSel = (m: typeof from) => ({
          id: m.id,
          titulo: m.titulo,
          tipo: m.tipo,
          imagemUrl: m.imagem_url,
          score: m.score,
        });
        return [
          {
            fromMediaId: from.id,
            fromMediaType: from.tipo,
            toMediaId: i.midia_id,
            toMediaType: i.midia.tipo,
            relationType: rel.tipo,
            discoveredAt: i.atualizado_em,
            fromMedia: mediaSel(from),
            toMedia: mediaSel(i.midia),
          } satisfies Descoberta,
        ];
      });

      // T286 — eventos derivados de reações GOSTEI (idempotentes).
      const eventos = await tx.discoveryEvent.findMany({
        where: { usuario_id: usuarioId },
        orderBy: { created_em: "desc" },
        select: {
          relation_type: true,
          created_em: true,
          from_media: {
            select: { id: true, titulo: true, tipo: true, imagem_url: true, score: true },
          },
          to_media: {
            select: { id: true, titulo: true, tipo: true, imagem_url: true, score: true },
          },
        },
      });
      const daReacao: Descoberta[] = eventos.map((e) => {
        const mediaSel = (m: typeof e.to_media) => ({
          id: m.id,
          titulo: m.titulo,
          tipo: m.tipo,
          imagemUrl: m.imagem_url,
          score: m.score,
        });
        return {
          fromMediaId: e.from_media.id,
          fromMediaType: e.from_media.tipo,
          toMediaId: e.to_media.id,
          toMediaType: e.to_media.tipo,
          relationType: e.relation_type,
          discoveredAt: e.created_em,
          fromMedia: mediaSel(e.from_media),
          toMedia: mediaSel(e.to_media),
        } satisfies Descoberta;
      });

      // Merge sem duplicar to_media_id (a interação vence em estabilidade).
      const vistos = new Set(daInteracao.map((d) => d.toMediaId));
      const extra = daReacao.filter((d) => !vistos.has(d.toMediaId));
      const resultado = [...daInteracao, ...extra].sort(
        (a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime(),
      );
      if (resultado.length > 0) return resultado;

      // T397 (D-376): fallback por gênero — sem relações/reacões, recomenda
      // títulos do mesmo gênero dos consumidos (CONCLUIDO/CONSUMINDO), por score.
      const consumidos = await tx.usuarioMidiaInteracao.findMany({
        where: { usuario_id: usuarioId, status: { in: ["CONCLUIDO", "CONSUMINDO"] } },
        orderBy: { atualizado_em: "desc" },
        select: {
          midia_id: true,
          midia: {
            select: {
              id: true,
              titulo: true,
              tipo: true,
              imagem_url: true,
              score: true,
              generos: { select: { genero: { select: { slug: true } } } },
            },
          },
        },
      });
      const idsConsumidos = consumidos.map((c) => c.midia_id);
      const slugsGenero = [
        ...new Set(
          consumidos
            .flatMap((c) => c.midia?.generos ?? [])
            .map((g) => g.genero?.slug)
            .filter((s): s is string => Boolean(s)),
        ),
      ];
      const origem = consumidos[0]?.midia;
      if (origem && slugsGenero.length > 0) {
        const recomendados = await tx.midia.findMany({
          where: {
            deleted_at: null,
            id: { notIn: idsConsumidos },
            generos: { some: { genero: { slug: { in: slugsGenero } } } },
          },
          orderBy: { score: "desc" },
          take: 6,
          select: { id: true, titulo: true, tipo: true, imagem_url: true, score: true },
        });
        if (recomendados.length > 0) {
          const mediaSel = (m: {
            id: string;
            titulo: string;
            tipo: string;
            imagem_url: string | null;
            score: number | null;
          }) => ({
            id: m.id,
            titulo: m.titulo,
            tipo: m.tipo,
            imagemUrl: m.imagem_url,
            score: m.score,
          });
          return recomendados.map((m) => ({
            fromMediaId: origem.id,
            fromMediaType: origem.tipo,
            toMediaId: m.id,
            toMediaType: m.tipo,
            relationType: "MESMO_GENERO" as TipoRelacao,
            discoveredAt: new Date(),
            fromMedia: mediaSel(origem),
            toMedia: mediaSel(m),
          }));
        }
      }
      return resultado;
    });
  }

  /**
   * T201 (G4) — GET /taste/history: pesos de gênero por mês (últimos 12),
   * normalizados (soma = 1). Derivado de interações CONCLUIDO/CONSUMINDO
   * join com gêneros narrativos da mídia — UMA query, sem N+1.
   */
  async historicoTaste(usuarioId: string): Promise<TasteMonth[]> {
    return comContextoRls(this.prisma, { usuarioId, role: "USER" }, async (tx) => {
      const interacoes = await tx.usuarioMidiaInteracao.findMany({
        where: { usuario_id: usuarioId, status: { in: ["CONCLUIDO", "CONSUMINDO"] } },
        select: {
          status: true,
          iniciado_em: true,
          concluido_em: true,
          atualizado_em: true,
          midia: {
            select: {
              generos: { select: { genero: { select: { slug: true, tipo: true } } } },
            },
          },
        },
      });

      // Últimos 12 meses (ascendente), zero inicial.
      const now = new Date();
      const meses: { key: string; pesos: Record<string, number> }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        meses.push({
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
          pesos: {},
        });
      }
      const porChave = new Map(meses.map((m) => [m.key, m]));

      for (const i of interacoes) {
        const data = i.status === "CONCLUIDO" ? i.concluido_em : (i.iniciado_em ?? i.atualizado_em);
        if (!data) continue;
        const d = new Date(data);
        const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const bucket = porChave.get(chave);
        if (!bucket) continue;
        const generos = (i.midia.generos ?? [])
          .map((g) => g.genero)
          .filter((g) => g.tipo === "NARRATIVO")
          .map((g) => g.slug);
        if (generos.length === 0) continue;
        const peso = 1 / generos.length;
        for (const slug of generos) {
          bucket.pesos[slug] = (bucket.pesos[slug] ?? 0) + peso;
        }
      }

      // Normaliza cada mês (soma = 1) e devolve no formato da API.
      return meses.map((m) => {
        const total = Object.values(m.pesos).reduce((a, b) => a + b, 0);
        const genreWeights: Record<string, number> = {};
        if (total > 0) {
          for (const [slug, v] of Object.entries(m.pesos)) {
            genreWeights[slug] = Number((v / total).toFixed(4));
          }
        }
        return { month: m.key, genreWeights };
      });
    });
  }
}
