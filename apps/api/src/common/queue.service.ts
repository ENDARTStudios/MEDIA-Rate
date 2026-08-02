import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Queue, Worker, type JobsOptions } from "bullmq";
import { Redis } from "ioredis";

export interface QueueConfig {
  name: string;
  connection: { host: string; port: number; password?: string };
}

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues = new Map<string, Queue>();
  private readonly workers = new Map<string, Worker>();
  private readonly config: QueueConfig;

  constructor(config: QueueConfig) {
    const isLocal = /localhost|127\.0\.0\.1|::1|\.internal/.test(config.connection.host);
    this.config = {
      ...config,
      connection: {
        ...config.connection,
        ...(!isLocal ? { tls: {} as Record<string, unknown> } : {}),
      },
    };
  }

  getQueue(name: string): Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, { connection: this.config.connection });
      this.queues.set(name, queue);
      this.logger.log(`Queue "${name}" registered.`);
    }
    return this.queues.get(name)!;
  }

  async addJob(queueName: string, jobName: string, data: unknown, opts?: JobsOptions) {
    const queue = this.getQueue(queueName);
    return queue.add(
      jobName,
      data,
      opts ?? { attempts: 3, backoff: { type: "exponential", delay: 1000 } },
    );
  }

  registerWorker(queueName: string, handler: (job: any) => Promise<void>) {
    const worker = new Worker(queueName, handler, {
      connection: this.config.connection,
      concurrency: 5,
    });
    this.workers.set(queueName, worker);
    this.logger.log(`Worker for "${queueName}" registered.`);
    return worker;
  }

  async closeAll(): Promise<void> {
    for (const worker of this.workers.values()) await worker.close();
    for (const queue of this.queues.values()) await queue.close();
    this.logger.log("All BullMQ queues and workers closed.");
  }

  async onModuleDestroy() {
    await this.closeAll();
  }
}

@Injectable()
export class GracefulShutdownService {
  private readonly logger = new Logger(GracefulShutdownService.name);

  constructor(private readonly queueService: QueueService) {}

  enableShutdown(server: any): void {
    const shutdown = async (signal: string) => {
      this.logger.log(`Received ${signal} — shutting down gracefully.`);
      await this.queueService.closeAll();
      await server.close();
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  }
}
