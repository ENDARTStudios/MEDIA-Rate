import { Injectable, type OnModuleInit, type OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * Wrapper Prisma para NestJS. Singleton injetavel em qualquer modulo.
 *
 * T036: $connect() no onModuleInit e NAO-bloqueante — conecta em background
 * com timeout de 3s. Se falhar, loga e continua. O app escuta mesmo sem DB
 * (o /health reporta degraded, mas o processo nao trava o deploy).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === "test" || process.env.SKIP_DB_CONNECT === "true") {
      return;
    }
    try {
      await Promise.race([
        this.$connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("connect timeout")), 3_000)),
      ]);
      // eslint-disable-next-line no-console
      console.log("[prisma] connected to database");
    } catch (err) {
      console.warn(`[prisma] connection failed (non-blocking): ${(err as Error).message}`);
      // O app sobe sem DB — o /health reporta degraded ate o Prisma reconectar.
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (process.env.NODE_ENV === "test" || process.env.SKIP_DB_CONNECT === "true") return;
    await this.$disconnect();
  }
}
