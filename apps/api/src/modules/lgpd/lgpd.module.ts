import { Module } from "@nestjs/common";
import { LgpdController } from "./lgpd.controller.js";
import { LgpdService } from "./lgpd.service.js";
import { PrismaModule } from "../../prisma/prisma.module.js";

@Module({
  imports: [PrismaModule],
  controllers: [LgpdController],
  providers: [LgpdService],
})
export class LgpdModule {}
