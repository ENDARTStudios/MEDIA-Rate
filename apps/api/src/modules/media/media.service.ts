import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { CreateMediaDto, UpdateMediaDto } from "./dto/media.dto.js";

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMediaDto) {
    return this.prisma.midia.create({ data: dto });
  }

  async update(id: string, dto: UpdateMediaDto) {
    const midia = await this.prisma.midia.findUnique({ where: { id } });
    if (!midia) throw new NotFoundException("Mídia não encontrada.");
    return this.prisma.midia.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const midia = await this.prisma.midia.findUnique({ where: { id } });
    if (!midia) throw new NotFoundException("Mídia não encontrada.");
    await this.prisma.midia.delete({ where: { id } });
  }
}
