import { Module, type DynamicModule, Global } from "@nestjs/common";
import { CacheService, CacheInvalidationService } from "./cache.service.js";

export interface CacheModuleOptions {
  redisUrl?: string;
}

@Global()
@Module({})
export class CacheModule {
  static forRoot(options?: CacheModuleOptions): DynamicModule {
    return {
      module: CacheModule,
      providers: [
        {
          provide: "REDIS_URL",
          useValue: options?.redisUrl ?? process.env.REDIS_URL ?? "redis://localhost:6379",
        },
        {
          provide: CacheService,
          useFactory: (url: string) => new CacheService(url),
          inject: ["REDIS_URL"],
        },
        CacheInvalidationService,
      ],
      exports: [CacheService, CacheInvalidationService],
    };
  }
}
