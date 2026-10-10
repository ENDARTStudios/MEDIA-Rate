import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller.js";
import { AdminService } from "./admin.service.js";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { FeatureFlagsModule } from "../flags/feature-flags.module.js";
import { LgpdModule } from "../lgpd/lgpd.module.js";
import { AuditLogService } from "../../common/audit-log.service.js";
import { BackfillService } from "./backfill.service.js";
import { BackfillDrainService } from "./backfill-drain.service.js";

@Module({
  imports: [PrismaModule, AuthModule, FeatureFlagsModule, LgpdModule],
  controllers: [AdminController],
  providers: [AdminService, AuditLogService, BackfillService, BackfillDrainService],
})
export class AdminModule {}
