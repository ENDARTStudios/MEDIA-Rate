import { Injectable } from "@nestjs/common";
import { StatusConsumo } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service.js";
import { comContextoRls } from "../../common/rls-context.js";

export interface UserStats {
  plano: string;
  upgrade: boolean;
  total: number;
  // Taxa de conclusão (métrica real do overview): interações CONCLUIDO.
  concluidos: number;
  /** Contagem por tipo — TODOS os planos (alimenta as medalhas, UAT-44). */
  tipos: Record<string, number>;
  /**
   * Radar de gosto (UAT-43): Free recebe o teto de 12 gêneros NARRATIVOS
   * (os "já existentes"); Plus/Premium recebem gêneros E subgêneros, sem teto.
   */
  generos: Record<string, number>;
  /** Radar por tipo de mídia (UAT-43): Plus = FILME/SERIE/GAME; Premium = 6 tipos. */
  generos_por_tipo: { tipo: string; generos: Record<string, number> }[];
  evolucao: { mes: string; total: number }[] | null;
  /** Evolução quebrada por tipo (UAT-45) — Premium, todas as mídias no gráfico. */
  evolucao_tipos: { mes: string; total: number; por_tipo: Record<string, number> }[] | null;
  // T396: streak (dias consecutivos com atividade) + histograma de scores.
  streak: number;
  histograma: { faixa: string; total: number }[];
}

const HIST_BUCKETS = ["0-2", "2-4", "4-6", "6-8", "8-10"];

/** Radar por tipo de mídia (UAT-43): Plus enxerga 3 mídias, Premium as 6. */
const TIPOS_RADAR_PLUS = ["FILME", "SERIE", "GAME"] as const;
const TIPOS_RADAR_PREMIUM = ["FILME", "SERIE", "GAME", "LIVRO", "COMIC", "MANGA"] as const;

/** Free mantém os 12 eixos que o radar já tinha (legibilidade, UAT-43). */
const TETO_RADAR_FREE = 12;

/**
 * BETA-GAP-02 (T118) — status que representam o ESTADO ATUAL de consumo.
 * `ABANDONADO` é um estado válido e reclassificável (D-528), usado pela UI
 * como "remover" do estado atual; por isso NÃO entra em `total`/`tipos`/
 * `generos`/`streak` (métricas de estado atual). Ele PERMANECE em `porStatus`/
 * Biblioteca (histórico reclassificável), calculado em interacoes.service.
 */
const CURRENT_STATE_STATUSES: StatusConsumo[] = [
  StatusConsumo.QUERO_CONSUMIR,
  StatusConsumo.CONSUMINDO,
  StatusConsumo.CONCLUIDO,
];

/**
 * T295/T396 — agregados do dashboard pessoal, server-side, sob RLS owner-only.
 *
 * Gating UAT-43/44 (D-378 revisto pelo Operador): `tipos` passou a ser de todos
 * os planos (base das medalhas por mídia); o radar de gosto é de todos, com
 * escopo por plano (Free: 12 gêneros; Plus/Premium: gêneros + subgêneros e
 * recorte por tipo — Plus 3 mídias, Premium 6); evolução temporal segue Premium.
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
              generos: {
                select: { genero: { select: { nome: true, tipo: true } } },
              },
            },
          },
        },
      });

      const tipos: Record<string, number> = {};
      const generos: Record<string, number> = {};
      const generosPorTipo = new Map<string, Record<string, number>>();
      // Gêneros NARRATIVOS cadastrados (subgênero é Plus+, UAT-43). Sem `tipo`
      // no cadastro/mock → trata como narrativo (retrocompat).
      const nomesNarrativos = new Set<string>();
      const hist: number[] = [0, 0, 0, 0, 0];
      let concluidos = 0;
      // Métricas de estado atual ignoram status inativos (ABANDONADO).
      const interacoesEstadoAtual = interacoes.filter((i) =>
        CURRENT_STATE_STATUSES.includes(i.status),
      );
      for (const i of interacoesEstadoAtual) {
        const tipo = i.midia?.tipo;
        if (tipo) tipos[tipo] = (tipos[tipo] ?? 0) + 1;
        if (i.status === "CONCLUIDO") concluidos += 1;
        const doTipo = tipo ? (generosPorTipo.get(tipo) ?? {}) : null;
        for (const g of i.midia?.generos ?? []) {
          const nome = g.genero?.nome;
          if (!nome) continue;
          generos[nome] = (generos[nome] ?? 0) + 1;
          if (doTipo) doTipo[nome] = (doTipo[nome] ?? 0) + 1;
          if ((g.genero?.tipo ?? "NARRATIVO") === "NARRATIVO") nomesNarrativos.add(nome);
        }
        if (doTipo && tipo) generosPorTipo.set(tipo, doTipo);
        // Histograma de scores (0-100 → faixas 0-2..8-10) p/ CONCLUIDO/CONSUMINDO.
        if ((i.status === "CONCLUIDO" || i.status === "CONSUMINDO") && i.midia?.score != null) {
          const s = Math.max(0, Math.min(100, i.midia.score)) / 10;
          const idx = Math.min(4, Math.floor(s / 2));
          hist[idx] = (hist[idx] ?? 0) + 1;
        }
      }
      const histograma = HIST_BUCKETS.map((faixa, i) => ({ faixa, total: hist[i] ?? 0 }));

      // Evolução temporal: últimos 12 meses, zero-preenchidos (T396: todos).
      const now = new Date();
      const buckets = new Map<string, number>();
      const bucketsPorTipo = new Map<string, Record<string, number>>();
      for (let k = 11; k >= 0; k--) {
        const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
        const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        buckets.set(chave, 0);
        bucketsPorTipo.set(chave, {});
      }
      for (const i of interacoes) {
        if (i.status !== "CONCLUIDO" && i.status !== "CONSUMINDO") continue;
        const d = i.atualizado_em ?? new Date();
        const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!buckets.has(chave)) continue;
        buckets.set(chave, (buckets.get(chave) ?? 0) + 1);
        const porTipo = bucketsPorTipo.get(chave) as Record<string, number>;
        const tipo = i.midia?.tipo;
        if (tipo) porTipo[tipo] = (porTipo[tipo] ?? 0) + 1;
      }
      const evolucao = [...buckets.entries()].map(([mes, total]) => ({ mes, total }));
      const evolucaoTipos = [...buckets.entries()].map(([mes, total]) => ({
        mes,
        total,
        por_tipo: bucketsPorTipo.get(mes) ?? {},
      }));

      // Streak: dias consecutivos com atividade, terminando hoje.
      const diasAtivos = new Set<string>();
      for (const i of interacoesEstadoAtual) {
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

      // Gating UAT-43/44: ver DashboardService (docstring de classe).
      const ehPlus = planoEfetivo === "PLUS" || planoEfetivo === "PREMIUM";
      const ehPremium = planoEfetivo === "PREMIUM";

      // Free: apenas gêneros NARRATIVOS (subgênero é Plus+), teto 12 por peso.
      const generosFree = Object.entries(generos)
        .filter(([nome]) => nomesNarrativos.has(nome))
        .sort((a, b) => b[1] - a[1])
        .slice(0, TETO_RADAR_FREE)
        .reduce<Record<string, number>>((acc, [nome, total]) => {
          acc[nome] = total;
          return acc;
        }, {});

      const tiposRadar = ehPremium ? TIPOS_RADAR_PREMIUM : TIPOS_RADAR_PLUS;

      return {
        plano: planoEfetivo,
        upgrade: false,
        total: interacoesEstadoAtual.length,
        concluidos,
        tipos,
        generos: ehPlus ? generos : generosFree,
        generos_por_tipo: ehPlus
          ? tiposRadar.map((tipo) => ({ tipo, generos: generosPorTipo.get(tipo) ?? {} }))
          : [],
        evolucao: ehPremium ? evolucao : null,
        evolucao_tipos: ehPremium ? evolucaoTipos : null,
        streak,
        histograma,
      };
    });
  }
}
