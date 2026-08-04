import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { QuotaModule } from "../quota/quota.module.js";
import { HistoricoController } from "./historico.controller.js";

@Module({
  imports: [PrismaModule, QuotaModule],
  controllers: [HistoricoController],
})
export class HistoricoModule {}
