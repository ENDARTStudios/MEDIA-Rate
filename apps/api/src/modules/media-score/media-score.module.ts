import { Module } from "@nestjs/common";
import { MediaScoreService } from "./media-score.service.js";
import { PrismaModule } from "../../prisma/prisma.module.js";

@Module({
  imports: [PrismaModule],
  providers: [MediaScoreService],
  exports: [MediaScoreService],
})
export class MediaScoreModule {}
