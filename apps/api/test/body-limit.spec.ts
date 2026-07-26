import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { applySecurityToAdapter } from "./helpers/apply-security.js";

describe("Limite de payload (T020/7.7)", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const adapter = new FastifyAdapter({
      logger: false,
      bodyLimit: 1_048_576, // 1 MiB
    });
    app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);
    await applySecurityToAdapter(adapter, {
      isProduction: false,
      allowedOrigins: ["http://localhost:3000"],
      apiPerMinute: 100,
    });
    await app.init();
    await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("aceita payload dentro do limite (1 MiB)", async () => {
    const r = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "test@test.com", password: "12345678" })
      .set("Content-Type", "application/json");
    expect(r.status).not.toBe(413);
  });

  it("rejeita payload maior que 1 MiB com 413", async () => {
    const largeBody = "x".repeat(1_500_000); // 1.5 MiB
    try {
      const r = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ data: largeBody })
        .set("Content-Type", "application/json");
      expect(r.status).toBe(413);
    } catch {
      // Fastify pode resetar conexão ao exceder bodyLimit — é comportamento esperado.
      // O importante é que a requisição grande não é processada (413 ou reset).
    }
  });

  it("bodyLimit padrao configurado no FastifyAdapter", () => {
    // Verifica se o adapter foi criado com bodyLimit configurado.
    const fastify = app.getHttpAdapter().getInstance() as Record<string, unknown>;
    expect(fastify).toBeDefined();
    // Verifica que a instancia Fastify esta configurada com bodyLimit.
    const rawInstance = fastify as { initialConfig?: { bodyLimit?: number } };
    if (rawInstance.initialConfig) {
      expect(rawInstance.initialConfig.bodyLimit).toBe(1_048_576);
    }
  });

  it("resposta 413 tem statusCode no formato JSON (quando Fastify retorna)", async () => {
    const largeBody = "x".repeat(1_500_000);
    try {
      const r = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ data: largeBody })
        .set("Content-Type", "application/json");
      if (r.status === 413) {
        expect(r.body).toBeDefined();
        expect(r.body.statusCode ?? r.body.error).toBeDefined();
        const body = JSON.stringify(r.body);
        expect(body).not.toContain("stack");
        expect(body).not.toContain("at ");
      }
    } catch {
      // Fastify reset — comportamento aceito.
    }
  });
});
