import { Module } from "@nestjs/common";
import { DiagnosticsController } from "./diagnostics.controller.js";
import { DiagnosticsService } from "./diagnostics.service.js";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { FeatureFlagsModule } from "../flags/feature-flags.module.js";
import { AuditLogService } from "../../common/audit-log.service.js";

@Module({
  imports: [PrismaModule, FeatureFlagsModule],
  controllers: [DiagnosticsController],
  providers: [DiagnosticsService, AuditLogService],
})
export class DiagnosticsModule {}
