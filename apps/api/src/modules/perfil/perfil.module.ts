import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { PerfilController } from "./perfil.controller.js";

@Module({
  imports: [PrismaModule],
  controllers: [PerfilController],
})
export class PerfilModule {}
