import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { applySecurityToAdapter } from "./helpers/apply-security.js";

describe("CORS (T1.5)", () => {
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

  it("permite origem na allowlist (http://localhost:3000)", async () => {
    const res = await request(app.getHttpServer())
      .get("/health")
      .set("Origin", "http://localhost:3000");

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("rejeita origem fora da allowlist (https://evil.example)", async () => {
    const res = await request(app.getHttpServer())
      .get("/health")
      .set("Origin", "https://evil.example");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("responde a preflight OPTIONS para origem permitida", async () => {
    const res = await request(app.getHttpServer())
      .options("/health")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "GET");

    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("nao responde a preflight OPTIONS para origem proibida", async () => {
    const res = await request(app.getHttpServer())
      .options("/health")
      .set("Origin", "https://evil.example")
      .set("Access-Control-Request-Method", "GET");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("CORS em producao (T1.5)", () => {
  it("lanc erro se ALLOWED_ORIGINS vazio em producao", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const adapter = new FastifyAdapter({ logger: false });
    const app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);

    await expect(
      applySecurityToAdapter(adapter, { isProduction: true, allowedOrigins: [] }),
    ).rejects.toThrow(/ALLOWED_ORIGINS/);

    await app.close();
  });

  it("lanc erro se ALLOWED_ORIGINS contem * em producao", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const adapter = new FastifyAdapter({ logger: false });
    const app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);

    await expect(
      applySecurityToAdapter(adapter, { isProduction: true, allowedOrigins: ["*"] }),
    ).rejects.toThrow(/\*/);

    await app.close();
  });
});
