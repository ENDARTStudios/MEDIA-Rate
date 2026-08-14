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
import { reacaoEditavelPara } from "./signal-engine.js";

/**
 * Addendum 4, Parte 3 — máquina de estados de consumo.
 * QUERO_CONSUMIR → CONSUMINDO / CONCLUIDO / ABANDONADO
 * CONSUMINDO     → CONCLUIDO / ABANDONADO
 * CONCLUIDO/ABANDONADO → qualquer (retomar/rever é caso real).
 */
const TRANSOES_VALIDAS: Record<StatusConsumo, StatusConsumo[]> = {
  QUERO_CONSUMIR: ["QUERO_CONSUMIR", "CONSUMINDO", "CONCLUIDO", "ABANDONADO"],
  CONSUMINDO: ["CONSUMINDO", "CONCLUIDO", "ABANDONADO"],
  CONCLUIDO: ["CONCLUIDO", "QUERO_CONSUMIR", "CONSUMINDO"],
  ABANDONADO: ["ABANDONADO", "QUERO_CONSUMIR", "CONSUMINDO", "CONCLUIDO"],
};

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

  async listar(usuarioId: string) {
    return comContextoRls(this.prisma, { usuarioId, role: "USER" }, async (tx) => {
      return tx.usuarioMidiaInteracao.findMany({
        where: { usuario_id: usuarioId },
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
        },
      });
    });
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

      // T320/D-309: fonte única de verdade — status dirige a coluna do Kanban
      // no MESMO transaction (a entrada da watchlist pode não existir — então
      // não cria implicitamente; só alinha quando existe).
      await tx.watchlistEntry.updateMany({
        where: { usuario_id: usuarioId, midia_id: midiaId },
        data: { coluna: STATUS_PARA_COLUNA[proximoStatus] },
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
      return [...daInteracao, ...extra].sort(
        (a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime(),
      );
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
