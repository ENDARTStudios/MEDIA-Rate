import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { StatusConsumo, ReacaoConsumo, MotivoAbandono, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service.js";
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
}

@Injectable()
export class InteracoesService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(usuarioId: string) {
    return this.prisma.usuarioMidiaInteracao.findMany({
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
    const midia = await this.prisma.midia.findUnique({
      where: { id: midiaId },
      select: { id: true },
    });
    if (!midia) {
      throw new NotFoundException("Mídia não encontrada.");
    }

    const existente = await this.prisma.usuarioMidiaInteracao.findUnique({
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
    // ABANDONADO (Addendum 4, Parte 3) — e reação explícita é obrigatória
    // para mover para um desses estados quando vindo de consumo.
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
      iniciado_em: proximoStatus === "CONSUMINDO" ? agora : null,
      concluido_em: proximoStatus === "CONCLUIDO" ? agora : null,
      atualizado_em: agora,
    };

    return this.prisma.usuarioMidiaInteracao.upsert({
      where: { usuario_id_midia_id: { usuario_id: usuarioId, midia_id: midiaId } },
      create: data,
      update: {
        status: proximoStatus,
        reacao: dto.reacao ?? null,
        motivo_abandono: dto.motivoAbandono ?? null,
        progresso_detalhe: dto.progressoDetalhe ?? null,
        iniciado_em: proximoStatus === "CONSUMINDO" ? agora : existente?.iniciado_em,
        concluido_em: proximoStatus === "CONCLUIDO" ? agora : null,
        atualizado_em: agora,
      },
    });
  }
}
