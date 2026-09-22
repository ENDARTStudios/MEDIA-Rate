import { Module } from "@nestjs/common";
import { WatchlistController } from "./watchlist.controller.js";
import { WatchlistService } from "./watchlist.service.js";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { AuditLogService } from "../../common/audit-log.service.js";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [WatchlistController],
  providers: [WatchlistService, AuditLogService],
  // T286: DiscoveryModule injeta o WatchlistService para assinar o hook
  // onReacaoRegistrada.
  exports: [WatchlistService],
})
export class WatchlistModule {}
