import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { comContextoRls } from "../../common/rls-context.js";

export interface UserStats {
  plano: string;
  upgrade: boolean;
  total: number;
  tipos: Record<string, number>;
  generos: Record<string, number>;
  evolucao: { mes: string; total: number }[] | null;
  // T396: streak (dias consecutivos com atividade) + histograma de scores.
  streak: number;
  histograma: { faixa: string; total: number }[];
}

const HIST_BUCKETS = ["0-2", "2-4", "4-6", "6-8", "8-10"];

/**
 * T295/T396 — agregados do dashboard pessoal, server-side, sob RLS owner-only.
 * T396 (D-376): timeline (evolução 12m), histograma de scores e streak são
 * disponibilizados para TODOS os planos (antes evolução era Premium).
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async stats(usuarioId: string, plano: string | null): Promise<UserStats> {
    const planoEfetivo = plano ?? "FREE";
    return comContextoRls(this.prisma, { usuarioId, role: "USER" }, async (tx) => {
      const interacoes = await tx.usuarioMidiaInteracao.findMany({
        where: { usuario_id: usuarioId },
        select: {
          status: true,
          atualizado_em: true,
          midia: {
            select: {
              tipo: true,
              score: true,
              generos: { select: { genero: { select: { nome: true } } } },
            },
          },
        },
      });

      const tipos: Record<string, number> = {};
      const generos: Record<string, number> = {};
      const hist: number[] = [0, 0, 0, 0, 0];
      for (const i of interacoes) {
        const tipo = i.midia?.tipo;
        if (tipo) tipos[tipo] = (tipos[tipo] ?? 0) + 1;
        for (const g of i.midia?.generos ?? []) {
          const nome = g.genero?.nome;
          if (nome) generos[nome] = (generos[nome] ?? 0) + 1;
        }
        // Histograma de scores (0-100 → faixas 0-2..8-10) p/ CONCLUIDO/CONSUMINDO.
        if (
          (i.status === "CONCLUIDO" || i.status === "CONSUMINDO") &&
          i.midia?.score != null
        ) {
          const s = Math.max(0, Math.min(100, i.midia.score)) / 10;
          const idx = Math.min(4, Math.floor(s / 2));
          hist[idx] = (hist[idx] ?? 0) + 1;
        }
      }
      const histograma = HIST_BUCKETS.map((faixa, i) => ({ faixa, total: hist[i] ?? 0 }));

      // Evolução temporal: últimos 12 meses, zero-preenchidos (T396: todos).
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
      const evolucao = [...buckets.entries()].map(([mes, total]) => ({ mes, total }));

      // Streak: dias consecutivos com atividade, terminando hoje.
      const diasAtivos = new Set<string>();
      for (const i of interacoes) {
        const d = i.atualizado_em ?? new Date();
        diasAtivos.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
      }
      let streak = 0;
      for (let k = 0; k < 365; k++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - k);
        const chave = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!diasAtivos.has(chave)) break;
        streak += 1;
      }

      // T402 (D-378): gating real (não cosmético). Radar (tipos/gêneros) =
      // Plus/Premium; evolução temporal = Premium; timeline/histograma/streak
      // = todos. Free NÃO recebe os dados do radar/evolução na resposta.
      const ehPlus = planoEfetivo === "PLUS" || planoEfetivo === "PREMIUM";
      const ehPremium = planoEfetivo === "PREMIUM";

      return {
        plano: planoEfetivo,
        upgrade: false,
        total: interacoes.length,
        tipos: ehPlus ? tipos : {},
        generos: ehPlus ? generos : {},
        evolucao: ehPremium ? evolucao : null,
        streak,
        histograma,
      };
    });
  }
}
