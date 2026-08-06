import { Module } from "@nestjs/common";
import { RelacoesController } from "./relacoes.controller.js";
import { RelacoesService } from "./relacoes.service.js";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { AuthModule } from "../auth/auth.module.js";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [RelacoesController],
  providers: [RelacoesService],
  exports: [RelacoesService],
})
export class RelacoesModule {}
