import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AppLoggerModule } from "./common/app-logger.module.js";
import { AnalyticsModule } from "./common/analytics.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { AuthGuard } from "./common/guards/auth.guard.js";
import { RolesGuard } from "./common/guards/roles.guard.js";
import { PlanGuard } from "./common/guards/plan.guard.js";
import { HealthModule } from "./health/health.module.js";
import { EchoModule } from "./echo/echo.module.js";
import { DebugModule } from "./debug/debug.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { AdminModule } from "./modules/admin/admin.module.js";
import { PremiumModule } from "./modules/premium/premium.module.js";
import { MediaModule } from "./modules/media/media.module.js";
import { MediaScoreModule } from "./modules/media-score/media-score.module.js";
import { PaymentModule } from "./modules/payment/payment.module.js";
import { LgpdModule } from "./modules/lgpd/lgpd.module.js";
import { WatchlistModule } from "./modules/watchlist/watchlist.module.js";
import { DiscoverModule } from "./modules/discover/discover.module.js";
import { MetricsModule } from "./modules/metrics/metrics.module.js";
import { QueueModule } from "./common/queue.module.js";
import { UploadModule } from "./modules/upload/upload.module.js";
import { CacheModule } from "./common/cache.module.js";
import { InviteModule } from "./modules/invite/invite.module.js";

@Module({
  imports: [
    AppLoggerModule,
    AnalyticsModule,
    PrismaModule,
    HealthModule,
    EchoModule,
    DebugModule,
    AuthModule,
    AdminModule,
    PremiumModule,
    MediaScoreModule,
    MediaModule,
    PaymentModule,
    LgpdModule,
    WatchlistModule,
    DiscoverModule,
    MetricsModule,
    QueueModule.forRoot({ redis: { host: process.env.REDIS_HOST ?? "localhost", port: parseInt(process.env.REDIS_PORT ?? "6379"), password: process.env.REDIS_PASSWORD } }),
    UploadModule,
    CacheModule.forRoot(),
    InviteModule,
  ],
  providers: [
    // Guards globais (ordem importa: Auth → Roles → Plan)
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PlanGuard },
  ],
})
export class AppModule {}
