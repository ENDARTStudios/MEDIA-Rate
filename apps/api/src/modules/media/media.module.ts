import { Module } from "@nestjs/common";
import { MediaController } from "./media.controller.js";
import { MediaService } from "./media.service.js";
import { MediaScoreModule } from "../media-score/media-score.module.js";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { AuthModule } from "../auth/auth.module.js";

@Module({
  imports: [PrismaModule, MediaScoreModule, AuthModule],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
