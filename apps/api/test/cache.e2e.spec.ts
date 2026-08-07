/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test } from "@nestjs/testing";
import { CanActivate } from "@nestjs/common";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import cookie from "@fastify/cookie";
import { MediaController } from "../src/modules/media/media.controller.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { MediaScoreService } from "../src/modules/media-score/media-score.service.js";
import { MediaService } from "../src/modules/media/media.service.js";
import { SessionService } from "../src/modules/auth/session.service.js";
import { QuotaService } from "../src/modules/quota/quota.service.js";
import { CacheService, CacheInvalidationService } from "../src/common/cache.service.js";
import { AuthGuard } from "../src/common/guards/auth.guard.js";
import { RolesGuard } from "../src/common/guards/roles.guard.js";

/** Fake do client Redis — injetado via CacheService (testabilidade). */
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
  _clear() {
    this.store.clear();
  }
}

const allowGuard: CanActivate = { canActivate: async () => true };

const MIDIA = {
  id: "abc",
  titulo: "Filme Teste",
  titulo_original: null,
  tipo: "FILME",
  sinopse: "sinopse",
  ano_lancamento: 2024,
  classificacao_indicativa: null,
  imagem_url: null,
};

const SCORE_FIXO = {
  score: 7.5,
  criticosScore: null,
  publicoScore: null,
  consenso: null,
  indiceConsenso: null,
  votosTotal: 0,
  num_fontes: 0,
  confianca: 0,
  pesos_usados: {},
};

describe("Cache de aplicação — e2e via HTTP (T210)", () => {
  let app: NestFastifyApplication;
  let cliente: FakeRedisClient;

  beforeAll(async () => {
    cliente = new FakeRedisClient();
    const cacheService = new CacheService("redis://localhost:6379", cliente);
    const invalidation = new CacheInvalidationService(cacheService);

    const moduleRef = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            midia: {
              findUnique: async ({ where }: any) =>
                where.id === "abc" ? { ...MIDIA, scores: [] } : null,
              findMany: async () => [],
              count: async () => 0,
            },
          },
        },
        { provide: MediaScoreService, useValue: { calcularScoreV3: () => ({ ...SCORE_FIXO }) } },
        {
          provide: MediaService,
          useValue: {
            create: async (b: unknown) => ({ ...(b as object), id: "novo" }),
            update: async () => ({}),
            remove: async () => undefined,
          },
        },
        {
          provide: SessionService,
          useValue: {
            validateToken: async (token: string) =>
              token === "sess-valida" ? { sessao: { usuario_id: "u1" } } : null,
          },
        },
        {
          provide: QuotaService,
          useValue: { planoDe: async () => "FREE", usar: async () => undefined },
        },
        { provide: CacheService, useValue: cacheService },
        { provide: CacheInvalidationService, useValue: invalidation },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(allowGuard)
      .overrideGuard(RolesGuard)
      .useValue(allowGuard)
      .compile();

    const adapter = new FastifyAdapter({ logger: false });
    app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);
    await app.register(cookie as never);
    await app.init();
    await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    cliente._clear();
  });

  it("GET /midias/:id — MISS na 1ª, HIT na 2ª (X-Cache)", async () => {
    const r1 = await request(app.getHttpServer()).get("/api/v1/midias/abc");
    expect(r1.status).toBe(200);
    expect(r1.headers["x-cache"]).toBe("MISS");
    const r2 = await request(app.getHttpServer()).get("/api/v1/midias/abc");
    expect(r2.headers["x-cache"]).toBe("HIT");
    expect(r2.body.titulo).toBe("Filme Teste");
  });

  it("GET /midias?limit=5 — chave inclui query params (MISS → HIT)", async () => {
    const r1 = await request(app.getHttpServer()).get("/api/v1/midias?limit=5");
    expect(r1.headers["x-cache"]).toBe("MISS");
    const r2 = await request(app.getHttpServer()).get("/api/v1/midias?limit=5");
    expect(r2.headers["x-cache"]).toBe("HIT");
    // Query diferente → chave diferente → MISS.
    const r3 = await request(app.getHttpServer()).get("/api/v1/midias?limit=10");
    expect(r3.headers["x-cache"]).toBe("MISS");
  });

  it("GET /midias/:id/media-score — cache 300s (MISS → HIT)", async () => {
    const r1 = await request(app.getHttpServer()).get("/api/v1/midias/abc/media-score");
    expect(r1.status).toBe(200);
    expect(r1.headers["x-cache"]).toBe("MISS");
    const r2 = await request(app.getHttpServer()).get("/api/v1/midias/abc/media-score");
    expect(r2.headers["x-cache"]).toBe("HIT");
    expect(r2.body.score).toBe(7.5);
  });

  it("escrita (DELETE) invalida o cache — GET volta a MISS", async () => {
    await request(app.getHttpServer()).get("/api/v1/midias?limit=5");
    await request(app.getHttpServer()).get("/api/v1/midias?limit=5");
    const del = await request(app.getHttpServer()).delete("/api/v1/midias/abc");
    expect(del.status).toBe(204);
    const r = await request(app.getHttpServer()).get("/api/v1/midias?limit=5");
    expect(r.headers["x-cache"]).toBe("MISS");
  });

  it("endpoint autenticado NUNCA é cacheado (X-Cache ausente)", async () => {
    const r1 = await request(app.getHttpServer())
      .get("/api/v1/midias?limit=5")
      .set("Cookie", "sess=sess-valida");
    expect(r1.status).toBe(200);
    expect(r1.headers["x-cache"]).toBeUndefined();
    const r2 = await request(app.getHttpServer())
      .get("/api/v1/midias?limit=5")
      .set("Cookie", "sess=sess-valida");
    expect(r2.headers["x-cache"]).toBeUndefined();
  });
});
