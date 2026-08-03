import { Module } from "@nestjs/common";
import { ColetaController } from "./coleta.controller.js";
import { MediaScoreModule } from "./media-score.module.js";
import { FontesModule } from "../fontes/fontes.module.js";

/**
 * Módulo dev de auditoria de fontes (rota _debug/coletar).
 * Ativado apenas quando ENABLE_DEBUG_ROUTES=true em ambiente não-produtivo.
 * O ColetaService vem do FontesModule (instância única).
 */
@Module({
  imports: [MediaScoreModule, FontesModule],
  controllers: [ColetaController],
})
export class ColetaModule {}
