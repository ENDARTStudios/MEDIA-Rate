import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { QuotaModule } from "../quota/quota.module.js";
import { ListasController } from "./listas.controller.js";
import { ListasService } from "./listas.service.js";

@Module({
  imports: [PrismaModule, QuotaModule],
  controllers: [ListasController],
  providers: [ListasService],
})
export class ListasModule {}
