import { Module } from "@nestjs/common";
import { DiscoverController } from "./discover.controller.js";
import { DiscoverService } from "./discover.service.js";
import { PrismaModule } from "../../prisma/prisma.module.js";

@Module({
  imports: [PrismaModule],
  controllers: [DiscoverController],
  providers: [DiscoverService],
})
export class DiscoverModule {}
