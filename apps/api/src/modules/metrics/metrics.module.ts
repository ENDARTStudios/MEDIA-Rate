import { Module, Global } from "@nestjs/common";
import { MetricsController } from "./metrics.controller.js";
import { MetricsService } from "./metrics.service.js";
import { AlertsService } from "./alerts.service.js";
import { AlertsController } from "./alerts.controller.js";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { AuditLogService } from "../../common/audit-log.service.js";

@Global()
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MetricsController, AlertsController],
  providers: [MetricsService, AlertsService, AuditLogService],
  exports: [MetricsService, AlertsService],
})
export class MetricsModule {}
