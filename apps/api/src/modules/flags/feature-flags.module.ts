import { Module, type OnModuleInit } from "@nestjs/common";
import { FeatureFlagsController } from "./feature-flags.controller.js";
import { FeatureFlagService } from "./feature-flags.service.js";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { CacheModule } from "../../common/cache.module.js";
import { AuditLogService } from "../../common/audit-log.service.js";
import { PrismaService } from "../../prisma/prisma.service.js";

@Module({
  imports: [PrismaModule, AuthModule, CacheModule],
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagService, AuditLogService],
  exports: [FeatureFlagService],
})
export class FeatureFlagsModule implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  /** T292 — flag real seedada (rollout do feed Descobertas). Idempotente.
   *  Best-effort: nunca quebra o boot em ambientes/testes sem o model. */
  async onModuleInit(): Promise<void> {
    try {
      await this.prisma.featureFlag.upsert({
        where: { key: "discovery-feed-v1" },
        create: { key: "discovery-feed-v1", enabled: true, rollout_percent: 100 },
        update: {},
      });
    } catch {
      /* ausência graciosa */
    }
  }
}
