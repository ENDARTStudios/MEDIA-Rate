import { Module } from "@nestjs/common";
import { UploadController, UploadsController } from "./upload.controller.js";
import { AssetUploadController } from "./asset-upload.controller.js";
import { UploadService } from "./upload.service.js";
import { AssetUploadService } from "./asset-upload.service.js";
import { STORAGE_ADAPTER } from "./storage/storage.port.js";
import { selecionarStorage } from "./storage/select-storage.js";
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
      // T453/T457: R2 quando as credenciais existem; em PRODUÇÃO sem R2 o
      // adapter é fail-closed (503), nunca memória; em dev/test, InMemory.
      provide: STORAGE_ADAPTER,
      useFactory: () => selecionarStorage(),
    },
  ],
  exports: [UploadService],
})
export class UploadModule {}
