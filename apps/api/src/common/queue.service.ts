import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Queue, Worker, type Job, type JobsOptions } from "bullmq";

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
    let queue = this.queues.get(name);
    if (!queue) {
      queue = new Queue(name, { connection: this.config.connection });
      this.queues.set(name, queue);
      this.logger.log(`Queue "${name}" registered.`);
    }
    return queue;
  }

  async addJob(queueName: string, jobName: string, data: unknown, opts?: JobsOptions) {
    const queue = this.getQueue(queueName);
    return queue.add(
      jobName,
      data,
      opts ?? { attempts: 3, backoff: { type: "exponential", delay: 1000 } },
    );
  }

  registerWorker(queueName: string, handler: (job: Job) => Promise<void>) {
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

/**
 * GracefulShutdownService (T211, Fase 6.11) — orquestra o encerramento
 * gracioso em SIGTERM/SIGINT.
 *
 * - Idempotente: o 2º sinal não reinicia o shutdown.
 * - Timeout global de 30s: se onShutdown não completar, força process.exit(1).
 * - Logs estruturados por etapa (início, completo, erro, timeout).
 * - NUNCA loga segredos (apenas sinais e durações).
 * - onShutdown é injetado no wiring (main.ts) — fecha HTTP/Prisma/Redis/filas.
 */
@Injectable()
export class GracefulShutdownService {
  private readonly logger = new Logger(GracefulShutdownService.name);
  private fechando = false;
  private static readonly TIMEOUT_MS = 30_000;

  enableShutdown(onShutdown: () => Promise<void>): void {
    const shutdown = async (signal: string) => {
      if (this.fechando) return; // idempotente
      this.fechando = true;
      const inicio = Date.now();
      this.logger.log(`Graceful shutdown iniciado (${signal})`);

      const timer = setTimeout(() => {
        this.logger.error(
          `Shutdown excedeu ${GracefulShutdownService.TIMEOUT_MS / 1000}s — forçando saída`,
        );
        process.exit(1);
      }, GracefulShutdownService.TIMEOUT_MS);
      timer.unref();

      try {
        await onShutdown();
        this.logger.log(`Shutdown completo em ${Date.now() - inicio}ms`);
        clearTimeout(timer);
        process.exit(0);
      } catch (err) {
        this.logger.error(`Erro durante o shutdown: ${String(err)}`);
        clearTimeout(timer);
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  }
}
