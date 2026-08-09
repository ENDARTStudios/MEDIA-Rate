import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { applySecurityToAdapter } from "./helpers/apply-security.js";

describe("Rate Limit (T1.3)", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const adapter = new FastifyAdapter({ logger: false });
    app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);
    // Limite baixo para teste rapido: 3 req/min
    await applySecurityToAdapter(adapter, {
      isProduction: false,
      allowedOrigins: ["http://localhost:3000"],
      apiPerMinute: 3,
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

  it("permite requisicoes abaixo do limite (3 req/min)", async () => {
    const r1 = await request(app.getHttpServer()).get("/health");
    const r2 = await request(app.getHttpServer()).get("/health");
    const r3 = await request(app.getHttpServer()).get("/health");

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(200);
  });

  it("retorna 429 na 4a requisicao acima do limite", async () => {
    // Ja fizemos 3 acima. A 4a deve ser 429.
    const r = await request(app.getHttpServer()).get("/health");

    expect(r.status).toBe(429);
    expect(r.body.statusCode).toBe(429);
    expect(r.body.message).toMatch(/Limite de 3 requisicoes/);
  });

  it("resposta 429 nao expoe stack trace", async () => {
    const r = await request(app.getHttpServer()).get("/health");

    expect(r.status).toBe(429);
    expect(JSON.stringify(r.body)).not.toContain("stack");
    expect(JSON.stringify(r.body)).not.toContain("at ");
  });
});

describe("Rate Limit configuraÃ§Ã£o (T1.3 unit)", () => {
  it("buildRateLimitOptions usa defaults quando env ausente", async () => {
    delete process.env.RATE_LIMIT_API_PER_MIN;
    delete process.env.RATE_LIMIT_LOGIN_PER_MIN;
    const { buildRateLimitOptions, loginRateLimit } =
      await import("../src/common/rate-limit.config.js");
    const opts = buildRateLimitOptions();
    expect(opts.max).toBe(100);
    expect(opts.timeWindow).toBe(60 * 1000);
    expect(opts.global).toBe(true);

    const loginOpts = loginRateLimit();
    expect(loginOpts.max).toBe(6);
    expect(loginOpts.timeWindow).toBe("1 minute");
  });

  it("buildRateLimitOptions respeita env RATE_LIMIT_API_PER_MIN", async () => {
    process.env.RATE_LIMIT_API_PER_MIN = "42";
    const { buildRateLimitOptions } = await import("../src/common/rate-limit.config.js");
    const opts = buildRateLimitOptions();
    expect(opts.max).toBe(42);
    delete process.env.RATE_LIMIT_API_PER_MIN;
  });

  it("buildRateLimitOptions rejeita valor invalido em env e usa default", async () => {
    process.env.RATE_LIMIT_API_PER_MIN = "not-a-number";
    const { buildRateLimitOptions } = await import("../src/common/rate-limit.config.js");
    const opts = buildRateLimitOptions();
    expect(opts.max).toBe(100);
    delete process.env.RATE_LIMIT_API_PER_MIN;
  });
});
