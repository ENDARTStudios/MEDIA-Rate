import { Module } from "@nestjs/common";
import { MediaScoreModule } from "../media-score/media-score.module.js";
import { ColetaProdController } from "./coleta-prod.controller.js";

/**
 * Módulo de coleta de avaliações de fontes externas (sempre ativo).
 *
 * - Expõe as rotas admin POST /api/v1/midias/:id/coletar e
 *   POST /api/v1/midias/score-job (guarda x-admin-token, ver ColetaProdController).
 * - O ColetaService/MediaScoreJobService vêm do MediaScoreModule (instância única),
 *   compartilhados com o módulo dev de debug (ColetaModule).
 */
@Module({
  imports: [MediaScoreModule],
  controllers: [ColetaProdController],
})
export class FontesModule {}
