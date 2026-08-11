import { Module } from "@nestjs/common";
import { CuradoriaController } from "./curadoria.controller.js";
import { CuradoriaService } from "./curadoria.service.js";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { AuditLogService } from "../../common/audit-log.service.js";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CuradoriaController],
  providers: [CuradoriaService, AuditLogService],
})
export class CuradoriaModule {}
