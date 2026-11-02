import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { CatalogoIngestaoController } from "./catalogo-ingestao.controller.js";
import { CatalogoIngestaoScheduler } from "./catalogo-ingestao.scheduler.js";
import { CatalogoIngestaoService } from "./catalogo-ingestao.service.js";

/**
 * T-DADOS-63 — ingestão em escala por mídia (descoberta + nota da própria
 * listagem da fonte), com cursor no banco e agendador in-process.
 */
@Module({
  imports: [PrismaModule],
  controllers: [CatalogoIngestaoController],
  providers: [CatalogoIngestaoService, CatalogoIngestaoScheduler],
  exports: [CatalogoIngestaoService],
})
export class CatalogoIngestaoModule {}
