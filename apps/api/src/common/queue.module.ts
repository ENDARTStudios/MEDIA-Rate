import { Module, type DynamicModule } from "@nestjs/common";
import { QueueService, type QueueConfig } from "./queue.service.js";

export interface QueueModuleOptions {
  redis: { host: string; port: number; password?: string };
}

@Module({})
export class QueueModule {
  static forRoot(options: QueueModuleOptions): DynamicModule {
    const config: QueueConfig = {
      name: "media-rate",
      connection: options.redis,
    };

    return {
      module: QueueModule,
      providers: [{ provide: QueueService, useFactory: () => new QueueService(config) }],
      exports: [QueueService],
      global: true,
    };
  }
}
