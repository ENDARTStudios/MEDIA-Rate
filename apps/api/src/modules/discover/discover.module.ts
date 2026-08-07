import { Module } from "@nestjs/common";
import { DiscoverController } from "./discover.controller.js";
import { DiscoverService } from "./discover.service.js";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { AuthModule } from "../auth/auth.module.js";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DiscoverController],
  providers: [DiscoverService],
})
export class DiscoverModule {}
