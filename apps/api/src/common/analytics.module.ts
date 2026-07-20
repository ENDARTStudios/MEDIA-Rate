import { Global, Module } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service.js";

@Global()
@Module({
  providers: [
    {
      provide: AnalyticsService,
      useFactory: () => {
        // Em test, ANALYTICS_WRITE_KEY pode estar ausente ou ser 'test-key'
        // — analytics fica disabled ou mocked pelo SDK sem rede.
        return new AnalyticsService({ enabled: undefined });
      },
    },
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
