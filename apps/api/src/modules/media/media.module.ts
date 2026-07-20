import { Module } from "@nestjs/common";
import { MediaController } from "./media.controller.js";
import { MediaScoreModule } from "../media-score/media-score.module.js";
import { PrismaModule } from "../../prisma/prisma.module.js";

@Module({
  imports: [PrismaModule, MediaScoreModule],
  controllers: [MediaController],
})
export class MediaModule {}
