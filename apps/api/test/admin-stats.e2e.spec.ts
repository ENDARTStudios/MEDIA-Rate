/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test } from "@nestjs/testing";
import { APP_GUARD } from "@nestjs/core";
import { CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AdminModule } from "../src/modules/admin/admin.module.js";
import { MetricsModule } from "../src/modules/metrics/metrics.module.js";
import { CacheModule } from "../src/common/cache.module.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { CacheService } from "../src/common/cache.service.js";
import { AuditLogService } from "../src/common/audit-log.service.js";

const AUDIT: string[] = [];
let ROLE: "ADMIN" | "USER" = "ADMIN";
const CACHE_STORE = new Map<string, string>();

class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().user = { id: ROLE === "ADMIN" ? "admin-1" : "user-1" };
    return true;
  }
}
class FakeRolesGuard implements CanActivate {
  canActivate(): boolean {
    if (ROLE !== "ADMIN") {
      throw new ForbiddenException({
        statusCode: 403,
        error: "Forbidden",
        message: "Acesso negado.",
      });
    }
    return true;
  }
}

/** CacheService com memória simples — 1ª chamada MISS, 2ª HIT. */
class FakeCache {
  async readThroughWithStatus<T>(key: string, _ttl: number, fetchFn: () => Promise<T>) {
    const raw = CACHE_STORE.get(key);
    if (raw !== undefined) return { value: JSON.parse(raw) as T, hit: true };
    const value = await fetchFn();
    CACHE_STORE.set(key, JSON.stringify(value));
    return { value, hit: false };
  }
}

function makePrisma(zerado = false) {
  const base = {
    usuariosTotal: zerado ? 0 : 120,
    ativos7d: zerado ? 0 : 45,
    midias: zerado ? 0 : 500,
    porTipo: zerado ? [] : [{ tipo: "FILME", _count: { _all: 300 } }],
    entries: zerado ? 0 : 2100,
    comWatchlist: zerado ? 0 : 80,
    sessoes: zerado ? 0 : 33,
    planos: zerado
      ? []
      : [
          { plano: "FREE", _count: { _all: 100 } },
          { plano: "PLUS", _count: { _all: 15 } },
          { plano: "PREMIUM", _count: { _all: 5 } },
        ],
  };
  return {
    usuario: {
      count: async ({ where }: any) =>
        where?.ultimo_login_em ? base.ativos7d : base.usuariosTotal,
    },
    midia: {
      count: async () => base.midias,
      groupBy: async () => base.porTipo,
    },
    watchlistEntry: {
      count: async () => base.entries,
      groupBy: async () => Array.from({ length: base.comWatchlist }, () => ({})),
    },
    sessao: { count: async () => base.sessoes },
    usuarioPlano: { groupBy: async () => base.planos },
  };
}

describe("GET /api/v1/admin/stats — e2e (T221)", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AdminModule, MetricsModule, CacheModule.forRoot()],
      providers: [
        // O AdminController usa os guards GLOBAIS (AppModule) — registramos os
        // fakes como APP_GUARD na mesma ordem (Auth → Roles).
        { provide: APP_GUARD, useValue: new FakeAuthGuard() },
        { provide: APP_GUARD, useValue: new FakeRolesGuard() },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(makePrisma())
      .overrideProvider(CacheService)
      .useValue(new FakeCache())
      .overrideProvider(AuditLogService)
      .useValue({
        log: async (params: { acao: string }) => {
          AUDIT.push(params.acao);
        },
      })
      .compile();

    const adapter = new FastifyAdapter({ logger: false });
    app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);
    await app.init();
    await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    ROLE = "ADMIN";
    CACHE_STORE.clear();
    AUDIT.length = 0;
  });

  it("admin → 200 com métricas reais; cache X-Cache MISS → HIT; audit ADMIN_STATS_VIEWED", async () => {
    const r1 = await request(app.getHttpServer()).get("/api/v1/admin/stats");
    expect(r1.status).toBe(200);
    expect(r1.headers["x-cache"]).toBe("MISS");
    expect(r1.body.usuarios.total).toBe(120);
    expect(r1.body.midias.por_tipo).toEqual({ FILME: 300 });
    expect(r1.body.watchlists.total_entries).toBe(2100);
    expect(r1.body.planos).toEqual({ free: 100, plus: 15, premium: 5 });
    expect(AUDIT).toContain("ADMIN_STATS_VIEWED");

    const r2 = await request(app.getHttpServer()).get("/api/v1/admin/stats");
    expect(r2.status).toBe(200);
    expect(r2.headers["x-cache"]).toBe("HIT");
  });

  it("non-admin → 403", async () => {
    ROLE = "USER";
    const res = await request(app.getHttpServer()).get("/api/v1/admin/stats");
    expect(res.status).toBe(403);
  });

  it("banco vazio → 200 com zeros (não erro)", async () => {
    CACHE_STORE.clear();
    // Recria o prisma mock zerado — o controller usa o mock do módulo, então
    // validamos o shape com o mock zerado diretamente no service.
    const svc = new (await import("../src/modules/admin/admin.service.js")).AdminService(
      makePrisma(true) as any,
      new FakeCache() as any,
    );
    const { value } = await svc.getStats();
    expect(value.usuarios).toEqual({ total: 0, ativos_7d: 0 });
    expect(value.midias).toEqual({ total: 0, por_tipo: {} });
    expect(value.planos).toEqual({ free: 0, plus: 0, premium: 0 });
  });
});
