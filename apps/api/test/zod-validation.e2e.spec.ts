import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { applySecurityToAdapter } from "./helpers/apply-security.js";

describe("Zod Validation (T1.4)", () => {
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
    await app.init();
    await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
    // T230: AppModule completo — timeout explícito (contenda de 80 arquivos
    // paralelos pode estourar o default de 5s).
  }, 60_000);

  afterAll(async () => {
    // T230: defensivo — se o beforeAll falhou, app pode não existir; e
    // falha de teardown não deve derrubar o arquivo.
    if (!app) return;
    try {
      await app.close();
    } catch {
      // teardown falho ignorado
    }
  });

  it("POST /api/v1/echo com body valido â†’ 201 + echo", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/echo")
      .send({ message: "hello", level: "info" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      received: { message: "hello", level: "info" },
      echoedAt: expect.any(String),
    });
    expect(res.body.echoedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/);
  });

  it("POST /api/v1/echo aplica default em level quando ausente", async () => {
    const res = await request(app.getHttpServer()).post("/api/v1/echo").send({ message: "hello" });

    expect(res.status).toBe(201);
    expect(res.body.received.level).toBe("info");
  });

  it("POST /api/v1/echo rejeita 400 quando message ausente", async () => {
    const res = await request(app.getHttpServer()).post("/api/v1/echo").send({ level: "info" });

    expect(res.status).toBe(400);
    expect(res.body.statusCode).toBe(400);
    expect(res.body.message).toMatch(/Validation failed at 'message'/);
    expect(res.body.details).toBeInstanceOf(Array);
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it("POST /api/v1/echo rejeita 400 quando message vazia", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/echo")
      .send({ message: "", level: "info" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Validation failed at 'message'/);
  });

  it("POST /api/v1/echo rejeita 400 quando message maior que 280 chars", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/echo")
      .send({ message: "a".repeat(281) });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Validation failed at 'message'/);
  });

  it("POST /api/v1/echo rejeita 400 quando level invalido", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/echo")
      .send({ message: "hello", level: "debug" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Validation failed at 'level'/);
  });

  it("POST /api/v1/echo resposta 400 nao expoe stack trace", async () => {
    const res = await request(app.getHttpServer()).post("/api/v1/echo").send({});

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toContain("stack");
    expect(JSON.stringify(res.body)).not.toMatch(/\n\s*at\s+/);
  });
});
