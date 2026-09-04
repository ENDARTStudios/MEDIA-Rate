import { Module } from "@nestjs/common";
import { ConsentController } from "./consent.controller.js";
import { ConsentService } from "./consent.service.js";
import { PrismaModule } from "../../prisma/prisma.module.js";

@Module({
  imports: [PrismaModule],
  controllers: [ConsentController],
  providers: [ConsentService],
})
export class ConsentModule {}
