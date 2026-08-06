import { Module } from "@nestjs/common";
import { InteracoesController } from "./interacoes.controller.js";
import { DescobertasController } from "./descobertas.controller.js";
import { InteracoesService } from "./interacoes.service.js";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { AuthModule } from "../auth/auth.module.js";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [InteracoesController, DescobertasController],
  providers: [InteracoesService],
  exports: [InteracoesService],
})
export class InteracoesModule {}
