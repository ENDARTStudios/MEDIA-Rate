import { Module } from "@nestjs/common";
import { ColetaService } from "./coleta.service.js";
import { ColetaController } from "./coleta.controller.js";
import { MediaScoreModule } from "./media-score.module.js";

@Module({
  imports: [MediaScoreModule],
  controllers: [ColetaController],
  providers: [ColetaService],
  exports: [ColetaService],
})
export class ColetaModule {}
