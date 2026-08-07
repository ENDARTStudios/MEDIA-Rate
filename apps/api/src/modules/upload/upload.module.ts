import { Module } from "@nestjs/common";
import { UploadController, UploadsController } from "./upload.controller.js";
import { UploadService } from "./upload.service.js";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { AuditLogService } from "../../common/audit-log.service.js";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UploadController, UploadsController],
  providers: [UploadService, AuditLogService],
  exports: [UploadService],
})
export class UploadModule {}
