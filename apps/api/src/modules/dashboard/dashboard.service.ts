import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { comContextoRls } from "../../common/rls-context.js";

export interface UserStats {
  plano: string;
  upgrade: boolean;
  tipos: Record<string, number>;
  generos: Record<string, number>;
  evolucao: { mes: string; total: number }[] | null;
}

/**
 * T295 (Addendum 1) — agregados do dashboard pessoal, server-side, sob RLS
 * owner-only. Free → sem dados (upgrade); Plus → radar (tipos/gêneros);
 * Premium → radar + evolução temporal (12 meses). Sem PII em log.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async stats(usuarioId: string, plano: string | null): Promise<UserStats> {
    const planoEfetivo = plano ?? "FREE";
    if (planoEfetivo === "FREE") {
      return { plano: "FREE", upgrade: true, tipos: {}, generos: {}, evolucao: null };
    }

    return comContextoRls(this.prisma, { usuarioId, role: "USER" }, async (tx) => {
      const interacoes = await tx.usuarioMidiaInteracao.findMany({
        where: { usuario_id: usuarioId },
        select: {
          status: true,
          atualizado_em: true,
          midia: {
            select: { tipo: true, generos: { select: { genero: { select: { nome: true } } } } },
          },
        },
      });

      const tipos: Record<string, number> = {};
      const generos: Record<string, number> = {};
      for (const i of interacoes) {
        const tipo = i.midia?.tipo;
        if (tipo) tipos[tipo] = (tipos[tipo] ?? 0) + 1;
        for (const g of i.midia?.generos ?? []) {
          const nome = g.genero?.nome;
          if (nome) generos[nome] = (generos[nome] ?? 0) + 1;
        }
      }

      // Evolução temporal: últimos 12 meses, zero-preenchidos (Premium).
      let evolucao: { mes: string; total: number }[] | null = null;
      if (planoEfetivo === "PREMIUM") {
        const now = new Date();
        const buckets = new Map<string, number>();
        for (let k = 11; k >= 0; k--) {
          const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
          buckets.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
        }
        for (const i of interacoes) {
          if (i.status !== "CONCLUIDO" && i.status !== "CONSUMINDO") continue;
          const d = i.atualizado_em ?? new Date();
          const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (buckets.has(chave)) buckets.set(chave, (buckets.get(chave) ?? 0) + 1);
        }
        evolucao = [...buckets.entries()].map(([mes, total]) => ({ mes, total }));
      }

      return { plano: planoEfetivo, upgrade: false, tipos, generos, evolucao };
    });
  }
}
