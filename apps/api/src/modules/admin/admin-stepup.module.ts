import { Global, Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { PasswordService } from "../../common/password.service.js";
import { AuditLogService } from "../../common/audit-log.service.js";
import { AdminProbingMonitor, adminProbingMonitor } from "../../common/admin-probing-monitor.js";
import { AdminStepUpService } from "./admin-stepup.service.js";
import { AdminStepUpGuard } from "./admin-stepup.guard.js";
import { AdminStepUpController } from "./admin-stepup.controller.js";

/**
 * T205 Fase 1 — módulo do step-up por re-auth de senha.
 *
 * @Global() para que o AdminStepUpGuard/AdminStepUpService sejam resolvidos nos
 * módulos que hospedam controllers admin (admin, flags, upload) sem criar ciclos
 * de importação. Deve ser importado UMA vez no AppModule — e nos módulos que
 * aplicam `@UseGuards(AdminStepUpGuard)` a nível de classe, para que o guard
 * resolva suas dependências também em TestModules isolados.
 */
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [AdminStepUpController],
  providers: [
    PasswordService,
    AuditLogService,
    AdminStepUpService,
    AdminStepUpGuard,
    { provide: AdminProbingMonitor, useValue: adminProbingMonitor },
  ],
  exports: [AdminStepUpService, AdminStepUpGuard],
})
export class AdminStepupModule {}
