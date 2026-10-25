import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { comContextoRls, DEFAULT_TENANT } from "../../common/rls-context.js";

export interface PatrocinioPublico {
  id: string;
  patrocinador: string;
  secao: string;
  rotulo: string;
  desde: string;
}

export interface CriarPatrocinioInput {
  usuario_id?: string | null;
  patrocinador: string;
  secao: string;
  rotulo: string;
  desde: string;
}

/**
 * UAT-46 — registro público de patrocínios.
 *
 * A leitura é pública de propósito (transparência conferível); a escrita é
 * admin e não mexe em score/ranking/linha editorial — o guardrail que a
 * página `/apoie` publica. A tabela não tem RLS owner-only: o conteúdo é
 * público por natureza e a barreira está no controller (@Roles ADMIN).
 */
@Injectable()
export class PatrociniosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Registro público ativo (removido_em null), mais recente primeiro. */
  async listarPublicos(): Promise<PatrocinioPublico[]> {
    const itens = await this.prisma.patrocinio.findMany({
      where: { removido_em: null },
      orderBy: { desde: "desc" },
      select: {
        id: true,
        patrocinador: true,
        secao: true,
        rotulo: true,
        desde: true,
      },
    });
    return itens.map((p) => ({ ...p, desde: p.desde.toISOString().slice(0, 10) }));
  }

  /** Cria um registro (Admin). `desde` = início da veiculação (YYYY-MM-DD). */
  async criar(adminId: string, input: CriarPatrocinioInput): Promise<PatrocinioPublico> {
    const desde = new Date(`${input.desde}T00:00:00Z`);
    if (Number.isNaN(desde.getTime())) {
      throw new NotFoundException("Data de início inválida (use YYYY-MM-DD).");
    }
    return comContextoRls(
      this.prisma,
      { usuarioId: adminId, tenantId: DEFAULT_TENANT, role: "ADMIN" },
      async (tx) => {
        const criado = await tx.patrocinio.create({
          data: {
            usuario_id: input.usuario_id ?? null,
            patrocinador: input.patrocinador,
            secao: input.secao,
            rotulo: input.rotulo,
            desde,
          },
          select: {
            id: true,
            patrocinador: true,
            secao: true,
            rotulo: true,
            desde: true,
          },
        });
        return { ...criado, desde: criado.desde.toISOString().slice(0, 10) };
      },
    );
  }

  /** Soft delete (Admin): o histórico de transparência não é apagado. */
  async remover(adminId: string, id: string): Promise<{ ok: true }> {
    await comContextoRls(
      this.prisma,
      { usuarioId: adminId, tenantId: DEFAULT_TENANT, role: "ADMIN" },
      async (tx) => {
        const existente = await tx.patrocinio.findUnique({ where: { id }, select: { id: true } });
        if (!existente) throw new NotFoundException("Patrocínio não encontrado.");
        await tx.patrocinio.update({
          where: { id },
          data: { removido_em: new Date() },
        });
      },
    );
    return { ok: true };
  }
}
