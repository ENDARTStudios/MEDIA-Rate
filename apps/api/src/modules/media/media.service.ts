import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { CreateMediaDto, UpdateMediaDto } from "./dto/media.dto.js";
import type { ClassificacaoIndicativa } from "@prisma/client";

const NR_TO_CLASSIFICACAO: Record<number, ClassificacaoIndicativa> = {
  0: "L",
  10: "DEZ",
  12: "DOZE",
  14: "CATORZE",
  16: "DEZESSEIS",
  18: "DEZOITO",
};

function mapCreateDto(dto: CreateMediaDto) {
  return {
    titulo: dto.titulo,
    titulo_original: dto.titulo_original ?? null,
    tipo: dto.tipo,
    sinopse: dto.sinopse,
    ano_lancamento: dto.ano_lancamento,
    classificacao_indicativa:
      dto.classificacao_indicativa !== undefined
        ? (NR_TO_CLASSIFICACAO[dto.classificacao_indicativa] ?? null)
        : null,
    duracao_minutos: dto.duracao ? Number.parseInt(dto.duracao, 10) || null : null,
    imagem_url: dto.imagem_url ?? null,
    fonte: dto.fonte ?? "manual",
    fonte_id: dto.fonte_id ?? "manual",
  };
}

function mapUpdateDto(dto: UpdateMediaDto) {
  return {
    ...(dto.titulo !== undefined && { titulo: dto.titulo }),
    ...(dto.titulo_original !== undefined && { titulo_original: dto.titulo_original }),
    ...(dto.tipo !== undefined && { tipo: dto.tipo }),
    ...(dto.sinopse !== undefined && { sinopse: dto.sinopse }),
    ...(dto.ano_lancamento !== undefined && { ano_lancamento: dto.ano_lancamento }),
    ...(dto.classificacao_indicativa !== undefined && {
      classificacao_indicativa: NR_TO_CLASSIFICACAO[dto.classificacao_indicativa] ?? null,
    }),
    ...(dto.duracao !== undefined && { duracao_minutos: Number.parseInt(dto.duracao, 10) || null }),
    ...(dto.imagem_url !== undefined && { imagem_url: dto.imagem_url }),
    ...(dto.fonte !== undefined && { fonte: dto.fonte }),
    ...(dto.fonte_id !== undefined && { fonte_id: dto.fonte_id }),
  };
}

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * T215: unicidade por (fonte, fonte_id) — POST duplicado → 409.
   * Mídia soft-deletada NÃO bloqueia o id (pode ser recriada).
   */
  private async verificarUnicidade(dto: {
    fonte?: string;
    fonte_id?: string;
    excluirId?: string;
  }): Promise<void> {
    const fonte = dto.fonte ?? "manual";
    const fonte_id = dto.fonte_id ?? "manual";
    const existente = await this.prisma.midia.findFirst({
      where: {
        fonte,
        fonte_id,
        deleted_at: null,
        ...(dto.excluirId ? { id: { not: dto.excluirId } } : {}),
      },
      select: { id: true },
    });
    if (existente) {
      throw new ConflictException({
        statusCode: 409,
        error: "Conflict",
        message: "Mídia com esta fonte/fonte_id já existe.",
      });
    }
  }

  async create(dto: CreateMediaDto) {
    await this.verificarUnicidade(dto);
    return this.prisma.midia.create({ data: mapCreateDto(dto) });
  }

  async update(id: string, dto: UpdateMediaDto) {
    const midia = await this.prisma.midia.findFirst({
      where: { id, deleted_at: null },
      select: { id: true, fonte: true, fonte_id: true },
    });
    if (!midia) throw new NotFoundException("Mídia não encontrada.");
    if (dto.fonte !== undefined || dto.fonte_id !== undefined) {
      // Unicidade com os valores RESULTANTES (dto + estado atual).
      await this.verificarUnicidade({
        fonte: dto.fonte ?? midia.fonte,
        fonte_id: dto.fonte_id ?? midia.fonte_id,
        excluirId: id,
      });
    }
    return this.prisma.midia.update({ where: { id }, data: mapUpdateDto(dto) });
  }

  /** T215: soft delete — marca deleted_at, nunca remove a linha. */
  async remove(id: string) {
    const midia = await this.prisma.midia.findFirst({
      where: { id, deleted_at: null },
      select: { id: true },
    });
    if (!midia) throw new NotFoundException("Mídia não encontrada.");
    return this.prisma.midia.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  /** T215: auxiliar de leitura — mídia ativa por id (ou null). */
  async findAtiva(id: string) {
    return this.prisma.midia.findFirst({
      where: { id, deleted_at: null },
    });
  }
}
