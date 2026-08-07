import { Module } from "@nestjs/common";
import { RecommendationsController } from "./recommendations.controller.js";
import { RecommendationsService } from "./recommendations.service.js";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { AuthModule } from "../auth/auth.module.js";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}
