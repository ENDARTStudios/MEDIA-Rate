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
import { ColetaModule } from "./modules/media-score/coleta.module.js";
import { FontesModule } from "./modules/fontes/fontes.module.js";
import { PaymentModule } from "./modules/payment/payment.module.js";
import { LgpdModule } from "./modules/lgpd/lgpd.module.js";
import { NotificacoesModule } from "./modules/notificacoes/notificacoes.module.js";
import { QuotaModule } from "./modules/quota/quota.module.js";
import { HistoricoModule } from "./modules/historico/historico.module.js";
import { PerfilModule } from "./modules/perfil/perfil.module.js";
import { ListasModule } from "./modules/listas/listas.module.js";
import { WatchlistModule } from "./modules/watchlist/watchlist.module.js";
import { DiscoverModule } from "./modules/discover/discover.module.js";
import { MetricsModule } from "./modules/metrics/metrics.module.js";
import { QueueModule } from "./common/queue.module.js";
import { UploadModule } from "./modules/upload/upload.module.js";
import { CacheModule } from "./common/cache.module.js";
import { InviteModule } from "./modules/invite/invite.module.js";

/**
 * Módulo de debug (rotas _force-error) — apenas para teste do exception
 * filter (T1.6). Habilitar somente em desenvolvimento via
 * ENABLE_DEBUG_ROUTES=true. Nunca habilitado em produção.
 */
const enableDebugRoutes =
  process.env.NODE_ENV !== "production" && process.env.ENABLE_DEBUG_ROUTES === "true";

@Module({
  imports: [
    AppLoggerModule,
    AnalyticsModule,
    PrismaModule,
    HealthModule,
    EchoModule,
    ...(enableDebugRoutes ? [DebugModule, ColetaModule] : []),
    AuthModule,
    AdminModule,
    PremiumModule,
    MediaScoreModule,
    MediaModule,
    FontesModule,
    PaymentModule,
    LgpdModule,
    NotificacoesModule,
    QuotaModule,
    HistoricoModule,
    PerfilModule,
    ListasModule,
    WatchlistModule,
    DiscoverModule,
    MetricsModule,
    QueueModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST ?? "localhost",
        port: parseInt(process.env.REDIS_PORT ?? "6379"),
        password: process.env.REDIS_PASSWORD,
      },
    }),
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
