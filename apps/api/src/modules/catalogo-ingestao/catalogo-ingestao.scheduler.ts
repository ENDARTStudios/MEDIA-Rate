import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { CatalogoIngestaoService } from "./catalogo-ingestao.service.js";

/**
 * T-DADOS-63 — agendador do motor de ingestão do catálogo (padrão D-576).
 *
 * O motor roda no processo da API: a cada intervalo, executa UMA rodada com
 * orçamento de tempo. Não depende de automação externa nem de sessão de chat;
 * sobrevive a redeploy porque o cursor está em `ingestao_cursor`. Desligável
 * por env e inativo fora de produção (mesma salvaguarda do drain/score).
 */

const INTERVALO_PADRAO_MS = 10 * 60 * 1000;
const ORCAMENTO_PADRAO_MS = 5 * 60 * 1000;

function intervaloMs(): number {
  const n = Number(process.env.MEDIA_CATALOGO_INGESTAO_INTERVAL_MS ?? INTERVALO_PADRAO_MS);
  return Number.isFinite(n) && n >= 60_000 ? n : INTERVALO_PADRAO_MS;
}

function orcamentoMs(): number {
  const n = Number(process.env.MEDIA_CATALOGO_INGESTAO_BUDGET_MS ?? ORCAMENTO_PADRAO_MS);
  return Number.isFinite(n) && n >= 30_000 ? n : ORCAMENTO_PADRAO_MS;
}

@Injectable()
export class CatalogoIngestaoScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CatalogoIngestaoScheduler.name);
  private timer: NodeJS.Timeout | undefined;
  private rodando = false;

  constructor(private readonly ingestao: CatalogoIngestaoService) {}

  private habilitado(): boolean {
    return (
      process.env.NODE_ENV === "production" &&
      process.env.MEDIA_CATALOGO_INGESTAO_ENABLED !== "false"
    );
  }

  onModuleInit(): void {
    if (!this.habilitado()) {
      this.logger.log("Ingestão do catálogo desativada (fora de produção ou via env).");
      return;
    }
    this.logger.log(`Ingestão do catálogo ativa: intervalo ${intervaloMs()}ms.`);
    this.agendar(intervaloMs());
  }

  onModuleDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  private agendar(ms: number): void {
    this.timer = setTimeout(() => {
      void this.tique().finally(() => this.agendar(intervaloMs()));
    }, ms);
  }

  /** Um tique — nunca lança (falha vira log; o próximo tique tenta de novo). */
  async tique(): Promise<void> {
    if (this.rodando) return;
    this.rodando = true;
    try {
      const resumo = await this.ingestao.rodada(orcamentoMs());
      this.logger.log(
        `Ingestão do catálogo concluída: +${resumo.inseridos} títulos (alvo ${resumo.alvo}).`,
      );
    } catch (e) {
      this.logger.warn(`Ingestão do catálogo falhou: ${String(e).slice(0, 200)}`);
    } finally {
      this.rodando = false;
    }
  }
}
