import { Module } from "@nestjs/common";
import { InteracoesController } from "./interacoes.controller.js";
import { DescobertasController } from "./descobertas.controller.js";
import { InteracoesService } from "./interacoes.service.js";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { FeatureFlagsModule } from "../flags/feature-flags.module.js";

@Module({
  imports: [PrismaModule, AuthModule, FeatureFlagsModule],
  controllers: [InteracoesController, DescobertasController],
  providers: [InteracoesService],
  exports: [InteracoesService],
})
export class InteracoesModule {}
