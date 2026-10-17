import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { BackfillService, type BackfillTipo } from "./backfill.service.js";

/**
 * T179 (D-576) — agendador do drain de backfills DENTRO da API.
 *
 * Motivo: o gatilho externo (script no container via ssh) morre quando o
 * Railway substitui o container e exige sessão ADMIN de longa duração. Aqui o
 * drain é reagendado pelo próprio processo da API (mesmo padrão do job T4.7):
 *  - a cada INTERVALO_MS, se houver fila pendente, roda UM lote (continuidade
 *    ou metadados) com orçamento de tempo;
 *  - fila zerada → não faz nada (idle barato) e continua checando no próximo
 *    tique, para pegar títulos/imports futuros;
 *  - desligável por env e inativo fora de produção (mesmas salvaguardas do
 *    job do MEDIA Score).
 */

const INTERVALO_PADRAO_MS = 5 * 60 * 1000;
const ORCAMENTO_PADRAO_MS = 45 * 60 * 1000;

function intervaloMs(): number {
  const n = Number(process.env.MEDIA_BACKFILL_DRAIN_INTERVAL_MS ?? INTERVALO_PADRAO_MS);
  return Number.isFinite(n) && n >= 30_000 ? n : INTERVALO_PADRAO_MS;
}

function orcamentoMs(): number {
  const n = Number(process.env.MEDIA_BACKFILL_DRAIN_BUDGET_MS ?? ORCAMENTO_PADRAO_MS);
  return Number.isFinite(n) && n >= 60_000 ? n : ORCAMENTO_PADRAO_MS;
}

@Injectable()
export class BackfillDrainService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackfillDrainService.name);
  private timer: NodeJS.Timeout | undefined;
  private ticks = 0;
  // T179: fila "presa" (ex.: título sem elenco no TMDB) não pode gerar loop
  // infinito de reprocessamento — após 2 tiques sem progresso, espaça 6h.
  private ultimoTotal = -1;
  private semProgresso = 0;
  private espacado = false;
  private ultimoResumo: {
    quando: string;
    lotes: { tipo: BackfillTipo; ok: number; falhas: number }[];
    pendentesDepois: {
      semElenco: number;
      seriesSemTemporada: number;
      filmesSemPais: number;
      // T-DADOS-01: fila de metadados ricos (duração/gêneros/franquia).
      metadadosRicos: number;
      // T-DADOS-02: fila de provedores de streaming (ficha "Onde assistir").
      provedores: number;
      // T-DADOS-03: fila da crítica de games (IGDB por id).
      criticaIgdb: number;
      // T-DADOS-09: fila de gêneros de games (IGDB por id).
      generosGames: number;
      // T-DADOS-06: fila de arestas SEQUENCIA_DE em franquias incompletas.
      arestasFranquia: number;
      // T-DADOS-07: fila de notas de livros (OpenLibrary por id do work).
      avaliacaoLivros: number;
      // T-DADOS-08: fila de localização en/es + classificação (TMDB por id).
      localizacao: number;
    };
    erro?: string;
  } | null = null;

  constructor(private readonly backfill: BackfillService) {}

  private habilitado(): boolean {
    return (
      process.env.NODE_ENV === "production" && process.env.MEDIA_BACKFILL_DRAIN_ENABLED !== "false"
    );
  }

  onModuleInit(): void {
    if (!this.habilitado()) {
      this.logger.log("Drain de backfills desativado (fora de produção ou via env).");
      return;
    }
    this.agendar(intervaloMs());
  }

  onModuleDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  /** Estado observável (sem rota nova: exposto via status do admin). */
  status() {
    return {
      habilitado: this.habilitado(),
      ticks: this.ticks,
      intervaloMs: intervaloMs(),
      orcamentoMs: orcamentoMs(),
      espacado: this.espacado,
      semProgresso: this.semProgresso,
      ultimoResumo: this.ultimoResumo,
    };
  }

  /** Intervalo do próximo tique: longo quando a fila está presa (sem ganho). */
  private proximoIntervaloMs(): number {
    return this.espacado ? 6 * 3600 * 1000 : intervaloMs();
  }

  private agendar(ms: number): void {
    this.timer = setTimeout(() => {
      void this.tique().finally(() => this.agendar(this.proximoIntervaloMs()));
    }, ms);
  }

  private total(p: {
    semElenco: number;
    seriesSemTemporada: number;
    filmesSemPais: number;
    metadadosRicos: number;
    provedores: number;
    criticaIgdb: number;
    generosGames: number;
    arestasFranquia: number;
    avaliacaoLivros: number;
    localizacao: number;
  }): number {
    return (
      p.semElenco +
      p.seriesSemTemporada +
      p.filmesSemPais +
      p.metadadosRicos +
      p.provedores +
      p.criticaIgdb +
      (p.generosGames ?? 0) +
      p.arestasFranquia +
      (p.avaliacaoLivros ?? 0) +
      (p.localizacao ?? 0)
    );
  }

  /** Um tique do drain — nunca lança (falha vira log + resumo). */
  async tique(): Promise<void> {
    this.ticks++;
    try {
      const antes = await this.backfill.contarPendentes();
      const total = this.total(antes);
      if (total === 0) {
        this.ultimoTotal = 0;
        this.semProgresso = 0;
        this.espacado = false;
        this.logger.log("Drain: filas zeradas — nada a fazer.");
        return;
      }
      this.logger.log(
        `Drain: pendentes elenco=${antes.semElenco} seriesSemTemp=${antes.seriesSemTemporada} filmesSemPais=${antes.filmesSemPais} metadadosRicos=${antes.metadadosRicos} provedores=${antes.provedores} criticaIgdb=${antes.criticaIgdb} generosGames=${antes.generosGames} arestasFranquia=${antes.arestasFranquia} avaliacaoLivros=${antes.avaliacaoLivros} localizacao=${antes.localizacao}`,
      );
      const r = await this.backfill.drenarLote(orcamentoMs());
      this.ultimoResumo = {
        quando: new Date().toISOString(),
        lotes: r.lotes,
        pendentesDepois: r.pendentesDepois,
        ...(r.erro ? { erro: r.erro } : {}),
      };
      this.logger.log(
        `Drain fim do lote: ${r.lotes.map((l) => `${l.tipo}=${l.ok}ok/${l.falhas}err`).join(" ")} | restam elenco=${r.pendentesDepois.semElenco} temp=${r.pendentesDepois.seriesSemTemporada} pais=${r.pendentesDepois.filmesSemPais} ricos=${r.pendentesDepois.metadadosRicos} provedores=${r.pendentesDepois.provedores} criticaIgdb=${r.pendentesDepois.criticaIgdb} generosGames=${r.pendentesDepois.generosGames} arestasFranquia=${r.pendentesDepois.arestasFranquia} avaliacaoLivros=${r.pendentesDepois.avaliacaoLivros} localizacao=${r.pendentesDepois.localizacao}`,
      );
      // T179: progresso = a fila diminuiu. Sem progresso por 2 tiques, espaça
      // 6h (fila provavelmente presa: título sem elenco/país na fonte).
      const totalDepois = this.total(r.pendentesDepois);
      const progrediu = this.ultimoTotal < 0 || totalDepois < this.ultimoTotal;
      this.ultimoTotal = totalDepois;
      if (progrediu || totalDepois === 0) {
        this.semProgresso = 0;
        this.espacado = false;
      } else {
        this.semProgresso++;
        if (this.semProgresso >= 2 && !this.espacado) {
          this.espacado = true;
          this.logger.warn(
            `Drain: sem progresso com ${totalDepois} pendentes — espaçando para 6h (fila presa na fonte).`,
          );
        }
      }
    } catch (e) {
      this.logger.warn(`Drain: falha no tique — ${String(e).slice(0, 160)}`);
    }
  }
}
