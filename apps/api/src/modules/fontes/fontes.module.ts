import { Module } from "@nestjs/common";
import { ColetaService } from "../media-score/coleta.service.js";
import { MediaScoreModule } from "../media-score/media-score.module.js";
import { ColetaProdController } from "./coleta-prod.controller.js";

/**
 * Módulo de coleta de avaliações de fontes externas (sempre ativo).
 *
 * - Expõe a rota admin POST /api/v1/midias/:id/coletar (guarda
 *   x-admin-token, ver ColetaProdController).
 * - O ColetaService é compartilhado com o módulo dev de debug
 *   (ColetaModule, ativado apenas por ENABLE_DEBUG_ROUTES em dev).
 */
@Module({
  imports: [MediaScoreModule],
  controllers: [ColetaProdController],
  providers: [ColetaService],
  exports: [ColetaService],
})
export class FontesModule {}
