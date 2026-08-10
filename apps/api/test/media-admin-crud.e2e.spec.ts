/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test } from "@nestjs/testing";
import { CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { MediaController } from "../src/modules/media/media.controller.js";
import { MediaService } from "../src/modules/media/media.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { MediaScoreService } from "../src/modules/media-score/media-score.service.js";
import { SessionService } from "../src/modules/auth/session.service.js";
import { QuotaService } from "../src/modules/quota/quota.service.js";
import { CacheService, CacheInvalidationService } from "../src/common/cache.service.js";
import { AuditLogService } from "../src/common/audit-log.service.js";
import { AuthGuard } from "../src/common/guards/auth.guard.js";
import { RolesGuard } from "../src/common/guards/roles.guard.js";

const AUDIT: string[] = [];
let ROLE: "ADMIN" | "USER" = "USER";

class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().user = {
      id: ROLE === "ADMIN" ? "admin-1" : "user-1",
    };
    return true;
  }
}

class FakeRolesGuard implements CanActivate {
  canActivate(): boolean {
    if (ROLE !== "ADMIN") {
      throw new ForbiddenException({
        statusCode: 403,
        error: "Forbidden",
        message: "Acesso negado. Papel ADMIN necessário.",
      });
    }
    return true;
  }
}

class FakeRedisClient {
  store = new Map<string, string>();
  on() {
    return this;
  }
  async get(k: string) {
    return this.store.get(k) ?? null;
  }
  async set(k: string, v: string) {
    this.store.set(k, v);
    return "OK";
  }
  async del(...keys: string[]) {
    for (const k of keys) this.store.delete(k);
    return keys.length;
  }
  async keys(pattern: string) {
    const prefixo = pattern.replace("*", "");
    return [...this.store.keys()].filter((k) => k.includes(prefixo));
  }
  async quit() {
    return "OK";
  }
}

function makeStore() {
  const midias = new Map<string, Record<string, unknown>>();
  const prisma = {
    midia: {
      findFirst: async ({ where }: any) => {
        const alvos = [...midias.values()].filter((m) => {
          if (where.id?.not !== undefined) {
            if (m.id === where.id.not) return false;
          } else if (where.id !== undefined && m.id !== where.id) {
            return false;
          }
          if (where.fonte !== undefined && m.fonte !== where.fonte) return false;
          if (where.fonte_id !== undefined && m.fonte_id !== where.fonte_id) return false;
          if (where.deleted_at === null && m.deleted_at !== null) return false;
          return true;
        });
        return alvos[0] ?? null;
      },
      findUnique: async ({ where, include }: any) => {
        const m = midias.get(where.id) ?? null;
        if (m && include?.scores) return { ...m, scores: [] };
        return m;
      },
      findMany: async (args: any) => {
        const where = args.where ?? {};
        return [...midias.values()]
          .filter((m) => (where.deleted_at === null ? m.deleted_at === null : true))
          .sort((a, b) => String(a.id).localeCompare(String(b.id)))
          .slice(0, args.take ?? 20);
      },
      count: async (args: any) => {
        const where = args.where ?? {};
        return [...midias.values()].filter((m) =>
          where.deleted_at === null ? m.deleted_at === null : true,
        ).length;
      },
      create: async ({ data }: any) => {
        const m = { id: randomUUID(), deleted_at: null, ...data };
        midias.set(m.id, m);
        return m;
      },
      update: async ({ where, data }: any) => {
        const m = midias.get(where.id);
        if (m) Object.assign(m, data);
        return m;
      },
      delete: async () => ({}),
    },
  };
  return { prisma, midias };
}

const BODY_OK = {
  titulo: "Filme Teste",
  tipo: "FILME",
  sinopse: "sinopse",
  ano_lancamento: 2024,
  fonte: "manual",
  fonte_id: "manual",
};

describe("Media CRUD admin — e2e via HTTP (T215)", () => {
  let app: NestFastifyApplication;
  let ctx: ReturnType<typeof makeStore>;
  let cliente: FakeRedisClient;

  beforeAll(async () => {
    ctx = makeStore();
    cliente = new FakeRedisClient();
    const cacheService = new CacheService("redis://localhost:6379", cliente);
    const invalidation = new CacheInvalidationService(cacheService);

    const moduleRef = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        { provide: PrismaService, useValue: ctx.prisma },
        { provide: MediaScoreService, useValue: { calcularScoreV3: () => ({ score: 7 }) } },
        MediaService,
        { provide: SessionService, useValue: { validateToken: async () => null } },
        {
          provide: QuotaService,
          useValue: { planoDe: async () => "FREE", usar: async () => undefined },
        },
        { provide: CacheService, useValue: cacheService },
        { provide: CacheInvalidationService, useValue: invalidation },
        {
          provide: AuditLogService,
          useValue: {
            log: async (params: { acao: string }) => {
              AUDIT.push(params.acao);
            },
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(new FakeAuthGuard())
      .overrideGuard(RolesGuard)
      .useValue(new FakeRolesGuard())
      .compile();

    const adapter = new FastifyAdapter({ logger: false });
    app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);
    // Espelho do main.ts (T4.8 rawBody): parser JSON explícito — sem ele o
    // FastifyAdapter não parseia corpo de PUT como objeto.
    const fastifyInstance = adapter.getInstance() as unknown as {
      getDefaultJsonParser: (
        proto: string,
        ctor: string,
      ) => (
        req: unknown,
        body: string | Buffer,
        done: (err: Error | null, v?: unknown) => void,
      ) => void;
    };
    const defaultJsonParser = fastifyInstance.getDefaultJsonParser("error", "error");
    adapter.useBodyParser("application/json", true, {}, (req, body, done) => {
      defaultJsonParser(req, body, done);
    });
    await app.init();
    await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    ROLE = "ADMIN";
    ctx.midias.clear();
    cliente.store.clear();
    AUDIT.length = 0;
  });

  it("admin create → 201 sanitizado (sem fonte_id/created_at/deleted_at) + audit", async () => {
    const res = await request(app.getHttpServer()).post("/api/v1/midias").send(BODY_OK);
    expect(res.status).toBe(201);
    const chaves = Object.keys(res.body);
    expect(chaves).not.toContain("fonte_id");
    expect(chaves).not.toContain("created_at");
    expect(chaves).not.toContain("deleted_at");
    expect(chaves).toContain("titulo");
    expect(AUDIT).toContain("MEDIA_CREATED");
  });

  it("non-admin → 403 em POST/PUT/DELETE", async () => {
    ROLE = "USER";
    const post = await request(app.getHttpServer()).post("/api/v1/midias").send(BODY_OK);
    expect(post.status).toBe(403);
    const put = await request(app.getHttpServer()).put("/api/v1/midias/abc").send({ titulo: "X" });
    expect(put.status).toBe(403);
    const del = await request(app.getHttpServer()).delete("/api/v1/midias/abc");
    expect(del.status).toBe(403);
  });

  it("zod 400: tipo inválido / titulo vazio", async () => {
    const bad1 = await request(app.getHttpServer())
      .post("/api/v1/midias")
      .send({ ...BODY_OK, tipo: "HQ-INVALIDO" });
    expect(bad1.status).toBe(400);
    const bad2 = await request(app.getHttpServer())
      .post("/api/v1/midias")
      .send({ ...BODY_OK, titulo: "" });
    expect(bad2.status).toBe(400);
  });

  it("duplicata (fonte, fonte_id) → 409", async () => {
    await request(app.getHttpServer()).post("/api/v1/midias").send(BODY_OK);
    const dup = await request(app.getHttpServer()).post("/api/v1/midias").send(BODY_OK);
    expect(dup.status).toBe(409);
  });

  it("admin update → 200 sanitizado + audit", async () => {
    const criada = await request(app.getHttpServer()).post("/api/v1/midias").send(BODY_OK);
    const res = await app.inject({
      method: "PUT",
      url: `/api/v1/midias/${criada.body.id}`,
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ titulo: "Título Novo" }),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.titulo).toBe("Título Novo");
    expect(Object.keys(body)).not.toContain("deleted_at");
    expect(AUDIT).toContain("MEDIA_UPDATED");
  });

  it("admin delete → 200 soft; GET /:id → 404; listagem não inclui; audit", async () => {
    const criada = await request(app.getHttpServer()).post("/api/v1/midias").send(BODY_OK);
    const del = await request(app.getHttpServer()).delete(`/api/v1/midias/${criada.body.id}`);
    expect(del.status).toBe(200);
    expect(AUDIT).toContain("MEDIA_DELETED");

    const get = await request(app.getHttpServer()).get(`/api/v1/midias/${criada.body.id}`);
    expect(get.status).toBe(404);

    const list = await request(app.getHttpServer()).get("/api/v1/midias");
    const ids = (list.body?.items ?? list.body?.data ?? []).map((x: { id: string }) => x.id);
    expect(ids).not.toContain(criada.body.id);
  });

  it("escrita invalida cache de listagem (X-Cache volta a MISS)", async () => {
    await request(app.getHttpServer()).get("/api/v1/midias");
    await request(app.getHttpServer()).get("/api/v1/midias");
    await request(app.getHttpServer()).post("/api/v1/midias").send(BODY_OK);
    const r = await request(app.getHttpServer()).get("/api/v1/midias");
    expect(r.headers["x-cache"]).toBe("MISS");
  });
});
