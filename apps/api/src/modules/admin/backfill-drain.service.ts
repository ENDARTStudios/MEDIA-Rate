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
  private ultimoResumo: {
    quando: string;
    lotes: { tipo: BackfillTipo; ok: number; falhas: number }[];
    pendentesDepois: { semElenco: number; seriesSemTemporada: number; filmesSemPais: number };
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
      ultimoResumo: this.ultimoResumo,
    };
  }

  private agendar(ms: number): void {
    this.timer = setTimeout(() => {
      void this.tique().finally(() => this.agendar(intervaloMs()));
    }, ms);
  }

  /** Um tique do drain — nunca lança (falha vira log + resumo). */
  async tique(): Promise<void> {
    this.ticks++;
    try {
      const antes = await this.backfill.contarPendentes();
      const total = antes.semElenco + antes.seriesSemTemporada + antes.filmesSemPais;
      if (total === 0) {
        this.logger.log("Drain: filas zeradas — nada a fazer.");
        return;
      }
      this.logger.log(
        `Drain: pendentes elenco=${antes.semElenco} seriesSemTemp=${antes.seriesSemTemporada} filmesSemPais=${antes.filmesSemPais}`,
      );
      const r = await this.backfill.drenarLote(orcamentoMs());
      this.ultimoResumo = {
        quando: new Date().toISOString(),
        lotes: r.lotes,
        pendentesDepois: r.pendentesDepois,
        ...(r.erro ? { erro: r.erro } : {}),
      };
      this.logger.log(
        `Drain fim do lote: ${r.lotes.map((l) => `${l.tipo}=${l.ok}ok/${l.falhas}err`).join(" ")} | restam elenco=${r.pendentesDepois.semElenco} temp=${r.pendentesDepois.seriesSemTemporada} pais=${r.pendentesDepois.filmesSemPais}`,
      );
    } catch (e) {
      this.logger.warn(`Drain: falha no tique — ${String(e).slice(0, 160)}`);
    }
  }
}
