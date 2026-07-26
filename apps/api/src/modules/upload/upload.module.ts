import { Module } from "@nestjs/common";
import { UploadController } from "./upload.controller.js";
import { UploadService } from "./upload.service.js";
import { AuthModule } from "../auth/auth.module.js";

@Module({
  imports: [AuthModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
