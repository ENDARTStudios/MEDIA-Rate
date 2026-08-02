import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { applySecurityToAdapter } from "./helpers/apply-security.js";
import { GlobalExceptionFilter } from "../src/common/global-exception.filter.js";

/**
 * T1.6 — producao: rotas de debug NÃO existem (removidas do AppModule em
 * produção) e o exception filter nunca vaza stack/mensagem interna.
 * File separado do spec de dev: o AppModule é avaliado uma única vez por
 * worker (cache de import ESM), então os cenários dev/prod são isolados.
 */
describe("Global Exception Filter (T1.6) — producao", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = "production";
    process.env.SKIP_DB_CONNECT = "true";
    delete process.env.ENABLE_DEBUG_ROUTES;
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const adapter = new FastifyAdapter({ logger: false });
    app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);
    await applySecurityToAdapter(adapter, {
      isProduction: true,
      allowedOrigins: ["https://mediarate.example"],
      apiPerMinute: 1000,
    });
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
    await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
  });

  afterAll(async () => {
    process.env.NODE_ENV = "test";
    delete process.env.SKIP_DB_CONNECT;
    await app.close();
  });

  it("GET /api/v1/_force-error/internal-error → 404 (rotas de debug removidas em producao)", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/_force-error/internal-error");

    expect(res.status).toBe(404);
  });

  it("POST /api/v1/_force-error (non-Error) → 404 (rotas de debug removidas em producao)", async () => {
    const res = await request(app.getHttpServer()).post("/api/v1/_force-error").send({});

    expect(res.status).toBe(404);
  });
});
