import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { applySecurityToAdapter } from "./helpers/apply-security.js";
import { GlobalExceptionFilter } from "../src/common/global-exception.filter.js";

describe("Global Exception Filter (T1.6) — desenvolvimento", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const adapter = new FastifyAdapter({ logger: false });
    app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);
    await applySecurityToAdapter(adapter, {
      isProduction: false,
      allowedOrigins: ["http://localhost:3000"],
      apiPerMinute: 1000,
    });
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
    await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/v1/_force-error/http-exception → 409 com shape padrao", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/_force-error/http-exception");

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      statusCode: 409,
      error: "Conflict",
      message: "Forced HTTP exception for testing",
      correlationId: expect.any(String),
      timestamp: expect.any(String),
    });
    expect(res.body.correlationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/);
  });

  it("GET /api/v1/_force-error/http-exception → header X-Request-Id presente", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/_force-error/http-exception");

    expect(res.headers["x-request-id"]).toBeDefined();
    expect(res.headers["x-request-id"]).toBe(res.body.correlationId);
  });

  it("GET /api/v1/_force-error/internal-error → 500 + mensagem original em dev", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/_force-error/internal-error");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      statusCode: 500,
      error: "Internal Server Error",
      message: expect.stringContaining("Forced internal error"),
      correlationId: expect.any(String),
      timestamp: expect.any(String),
    });
    // Em dev, message original pode aparecer (para debug), MAS stack nao.
    expect(JSON.stringify(res.body)).not.toMatch(/\n\s*at\s+/);
    expect(res.body.stack).toBeUndefined();
  });

  it("POST /api/v1/_force-error (non-Error thrown) → 500", async () => {
    const res = await request(app.getHttpServer()).post("/api/v1/_force-error").send({});

    expect(res.status).toBe(500);
    expect(res.body.statusCode).toBe(500);
    expect(res.body.error).toBe("Internal Server Error");
    expect(res.body.correlationId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("resposta de erro nunca inclui stack trace", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/_force-error/internal-error");

    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain('"stack"');
    expect(bodyStr).not.toMatch(/at\s+\w+\s+\(/);
  });
});

describe("Global Exception Filter (T1.6) — producao", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = "production";
    process.env.SKIP_DB_CONNECT = "true";
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

  it("GET /api/v1/_force-error/internal-error → 500 com mensagem GENERICA em prod", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/_force-error/internal-error");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      statusCode: 500,
      error: "Internal Server Error",
      message: "Ocorreu um erro interno inesperado. Tente novamente.",
      correlationId: expect.any(String),
      timestamp: expect.any(String),
    });
    // Mensagem original (com password=SUA_CHAVE_AQUI) NUNCA deve aparecer.
    expect(JSON.stringify(res.body)).not.toContain("password");
    expect(JSON.stringify(res.body)).not.toContain("SUA_CHAVE_AQUI");
  });

  it("POST /api/v1/_force-error (non-Error) → 500 com mensagem GENERICA em prod", async () => {
    const res = await request(app.getHttpServer()).post("/api/v1/_force-error").send({});

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Ocorreu um erro interno inesperado. Tente novamente.");
  });
});
