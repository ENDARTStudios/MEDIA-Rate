import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { applySecurityToAdapter } from "./helpers/apply-security.js";
import { GlobalExceptionFilter } from "../src/common/global-exception.filter.js";
import { HttpsRedirectGuard } from "../src/common/https-redirect.guard.js";

describe("HTTPS Redirect (T1.1) — producao", () => {
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
    app.useGlobalGuards(new HttpsRedirectGuard());
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
    await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
    // T230: AppModule completo — timeout explícito (contenda de 80 arquivos
    // paralelos pode estourar o default de 5s).
  }, 60_000);

  afterAll(async () => {
    process.env.NODE_ENV = "test";
    delete process.env.SKIP_DB_CONNECT;
    // T230: defensivo — se o beforeAll falhou, app pode não existir.
    if (!app) return;
    try {
      await app.close();
    } catch {
      // teardown falho ignorado
    }
  });

  it("GET /health com x-forwarded-proto: http → 308 redirect para https", async () => {
    const res = await request(app.getHttpServer())
      .get("/health")
      .set("X-Forwarded-Proto", "http")
      .set("Host", "mediarate.example");

    expect(res.status).toBe(308);
    expect(res.headers.location).toMatch(/^https:\/\/mediarate\.example\/health$/);
  });

  it("GET /health com x-forwarded-proto: https → 200 (sem redirect)", async () => {
    const res = await request(app.getHttpServer())
      .get("/health")
      .set("X-Forwarded-Proto", "https")
      .set("Host", "mediarate.example");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("GET /health sem x-forwarded-proto → 200 (deixa passar)", async () => {
    const res = await request(app.getHttpServer()).get("/health").set("Host", "mediarate.example");

    expect(res.status).toBe(200);
  });
});

describe("HTTPS Redirect (T1.1) — desenvolvimento", () => {
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
    app.useGlobalGuards(new HttpsRedirectGuard());
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
    await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
    // T230: AppModule completo — timeout explícito.
  }, 60_000);

  afterAll(async () => {
    // T230: defensivo — se o beforeAll falhou, app pode não existir.
    if (!app) return;
    try {
      await app.close();
    } catch {
      // teardown falho ignorado
    }
  });

  it("GET /health em dev nao redireciona mesmo com x-forwarded-proto: http", async () => {
    const res = await request(app.getHttpServer())
      .get("/health")
      .set("X-Forwarded-Proto", "http")
      .set("Host", "localhost:4000");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
