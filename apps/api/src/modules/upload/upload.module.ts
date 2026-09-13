import { Module } from "@nestjs/common";
import { UploadController, UploadsController } from "./upload.controller.js";
import { AssetUploadController } from "./asset-upload.controller.js";
import { UploadService } from "./upload.service.js";
import { AssetUploadService } from "./asset-upload.service.js";
import { STORAGE_ADAPTER } from "./storage/storage.port.js";
import { InMemoryStorage } from "./storage/in-memory.storage.js";
import { R2Storage, r2ConfigFromEnv } from "./storage/r2.storage.js";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { AuditLogService } from "../../common/audit-log.service.js";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UploadController, UploadsController, AssetUploadController],
  providers: [
    UploadService,
    AssetUploadService,
    AuditLogService,
    {
      // T453: R2 quando as credenciais existem; InMemory (no-op) em dev/test.
      provide: STORAGE_ADAPTER,
      useFactory: () => {
        const cfg = r2ConfigFromEnv();
        return cfg ? new R2Storage(cfg) : new InMemoryStorage();
      },
    },
  ],
  exports: [UploadService],
})
export class UploadModule {}
