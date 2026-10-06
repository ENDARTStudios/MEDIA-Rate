import { Module } from "@nestjs/common";
import { LgpdController } from "./lgpd.controller.js";
import { LgpdService } from "./lgpd.service.js";
import { LgpdPurgeService } from "./lgpd-purge.service.js";
import { AuditLogService } from "../../common/audit-log.service.js";
import { PrismaModule } from "../../prisma/prisma.module.js";

@Module({
  imports: [PrismaModule],
  controllers: [LgpdController],
  providers: [LgpdService, LgpdPurgeService, AuditLogService],
  exports: [LgpdPurgeService],
})
export class LgpdModule {}
