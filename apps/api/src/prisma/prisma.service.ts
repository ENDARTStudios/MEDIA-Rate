import { Injectable, type OnModuleInit, type OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * Wrapper Prisma para NestJS. Singleton injetavel em qualquer modulo.
 *
 * Em ambiente de teste (NODE_ENV=test), NAO chama $connect() no
 * onModuleInit — os testes unitários mockam PrismaService, e os testes
 * e2e que usam AppModule real não tem banco conectado. $connect() só
 * roda em runtime real (dev ou production).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    // Em test ou quando SKIP_DB_CONNECT estiver setado, não tenta conectar.
    // PrismaService é mockado nos testes que precisam dele; AppModule real
    // em test só valida DI graph.
    if (process.env.NODE_ENV === "test" || process.env.SKIP_DB_CONNECT === "true") {
      return;
    }
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    if (process.env.NODE_ENV === "test" || process.env.SKIP_DB_CONNECT === "true") return;
    await this.$disconnect();
  }
}
