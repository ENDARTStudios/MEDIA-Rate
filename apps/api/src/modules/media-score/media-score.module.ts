import { Module } from "@nestjs/common";
import { ColetaService } from "./coleta.service.js";
import { MediaScoreJobService } from "./media-score-job.service.js";
import { MediaScoreService } from "./media-score.service.js";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { NotificacoesModule } from "../notificacoes/notificacoes.module.js";

/**
 * Módulo do MEDIA Score™ (v3 — MET-03).
 *
 * - MediaScoreService: estimador Bayesiano por mídia + persistência.
 * - ColetaService: agrega os adapters de fontes (compartilhado com o
 *   FontesModule e com o ColetaModule de debug — instância única aqui).
 * - MediaScoreJobService: job diário de coleta + recálculo (03:05 local em
 *   produção; gatilho admin POST /api/v1/midias/score-job) + alertas de
 *   score da watchlist (NotificacoesService).
 */
@Module({
  imports: [PrismaModule, NotificacoesModule],
  providers: [MediaScoreService, ColetaService, MediaScoreJobService],
  exports: [MediaScoreService, ColetaService, MediaScoreJobService],
})
export class MediaScoreModule {}
