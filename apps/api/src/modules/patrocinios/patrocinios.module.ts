import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { PatrociniosController } from "./patrocinios.controller.js";
import { PatrociniosService } from "./patrocinios.service.js";

@Module({
  imports: [PrismaModule],
  controllers: [PatrociniosController],
  providers: [PatrociniosService],
})
export class PatrociniosModule {}
