import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller.js";
import { AdminGateController } from "./admin-gate.controller.js";
import { AdminService } from "./admin.service.js";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { FeatureFlagsModule } from "../flags/feature-flags.module.js";
import { LgpdModule } from "../lgpd/lgpd.module.js";
import { AuditLogService } from "../../common/audit-log.service.js";
import { BackfillService } from "./backfill.service.js";
import { BackfillDrainService } from "./backfill-drain.service.js";
import { AdminStepupModule } from "./admin-stepup.module.js";
import { MediaScoreModule } from "../media-score/media-score.module.js";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    FeatureFlagsModule,
    LgpdModule,
    AdminStepupModule,
    // T-DADOS-03: o BackfillService recalcula o score após gravar a crítica do
    // IGDB (mesmo serviço usado pelo MediaScoreJobService).
    MediaScoreModule,
  ],
  controllers: [AdminController, AdminGateController],
  providers: [AdminService, AuditLogService, BackfillService, BackfillDrainService],
})
export class AdminModule {}
