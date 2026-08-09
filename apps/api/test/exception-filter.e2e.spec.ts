import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { applySecurityToAdapter } from "./helpers/apply-security.js";
import { GlobalExceptionFilter } from "../src/common/global-exception.filter.js";

describe("Global Exception Filter (T1.6) — desenvolvimento", () => {
  let app: NestFastifyApplication;

  // T230: o beforeAll monta o AppModule COMPLETO (import dinâmico pesado).
  // Sob contenda de 80 arquivos paralelos, o timeout padrão (5s) estoura
  // intermitentemente → testes skipped + crash no afterAll. Timeout
  // explícito de 60s torna o e2e determinístico sem skip silencioso.
  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    // Rotas de debug são montadas na avaliação do AppModule — por isso o
    // import é dinâmico, após definir o env (ver app.module.ts).
    process.env.ENABLE_DEBUG_ROUTES = "true";
    const { AppModule } = await import("../src/app.module.js");
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
  }, 60_000);

  afterAll(async () => {
    // T230: defensivo — se o beforeAll falhou, app pode não ter sido
    // criada; close() numa referência inválida mascara o erro real.
    if (!app) return;
    try {
      await app.close();
    } catch {
      // Fechamento falho no teardown não deve derrubar o arquivo: o
      // resultado do TESTE já foi registrado.
    }
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
