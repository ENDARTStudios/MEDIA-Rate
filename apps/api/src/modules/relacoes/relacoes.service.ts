import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { TipoRelacao } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service.js";

export interface CriarRelacaoDto {
  origemId: string;
  destinoId: string;
  tipo: TipoRelacao;
  notaEditorial?: string | null;
}

@Injectable()
export class RelacoesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Consulta bidirecional do grafo (Addendum 3, Parte 2): retorna todas as
   * arestas em que a mídia é origem OU destino, já com os dados básicos do
   * título relacionado (capa, tipo, slug, score) — UMA query com includes
   * (sem N+1 de requisições por aresta).
   */
  async listarBidirecional(midiaId: string) {
    const midia = await this.prisma.midia.findUnique({
      where: { id: midiaId },
      select: { id: true },
    });
    if (!midia) {
      throw new NotFoundException("Mídia não encontrada.");
    }

    const arestas = await this.prisma.relacaoObra.findMany({
      where: { OR: [{ origem_id: midiaId }, { destino_id: midiaId }] },
      include: {
        origem: {
          select: {
            id: true,
            titulo: true,
            tipo: true,
            imagem_url: true,
            score: true,
            ano_lancamento: true,
          },
        },
        destino: {
          select: {
            id: true,
            titulo: true,
            tipo: true,
            imagem_url: true,
            score: true,
            ano_lancamento: true,
          },
        },
      },
    });

    // Cada aresta é entregue na direção "do título consultado → relacionado",
    // independente de onde ele aparece no grafo.
    return {
      midiaId,
      relacoes: arestas.map((a) => {
        const saida =
          a.origem_id === midiaId
            ? { direcao: "saida" as const, relacionada: a.destino }
            : { direcao: "entrada" as const, relacionada: a.origem };
        return {
          id: a.id,
          tipo: a.tipo,
          notaEditorial: a.nota_editorial,
          direcao: saida.direcao,
          midia: saida.relacionada,
        };
      }),
    };
  }

  /** Admin — cria aresta (1 aresta já ativa a funcionalidade). */
  async criar(dto: CriarRelacaoDto) {
    if (dto.origemId === dto.destinoId) {
      throw new BadRequestException("origemId e destinoId não podem ser iguais.");
    }
    const ids = new Set([dto.origemId, dto.destinoId]);
    const existentes = await this.prisma.midia.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true },
    });
    if (existentes.length !== 2) {
      throw new BadRequestException("origemId e destinoId devem referenciar mídias existentes.");
    }

    return this.prisma.relacaoObra.upsert({
      where: { origem_id_destino_id: { origem_id: dto.origemId, destino_id: dto.destinoId } },
      create: {
        origem_id: dto.origemId,
        destino_id: dto.destinoId,
        tipo: dto.tipo,
        nota_editorial: dto.notaEditorial ?? null,
      },
      update: { tipo: dto.tipo, nota_editorial: dto.notaEditorial ?? null },
    });
  }

  /** Admin — remove aresta. */
  async remover(relId: string) {
    const aresta = await this.prisma.relacaoObra.findUnique({
      where: { id: relId },
      select: { id: true },
    });
    if (!aresta) {
      throw new NotFoundException("Relação não encontrada.");
    }
    await this.prisma.relacaoObra.delete({ where: { id: relId } });
    return { removido: true };
  }
}
