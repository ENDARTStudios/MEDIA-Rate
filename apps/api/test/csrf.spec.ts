import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import type { FastifyPluginAsync } from "fastify";
import cookiePlugin, { type FastifyCookieOptions } from "@fastify/cookie";
import request from "supertest";
import { AuthController } from "../src/modules/auth/auth.controller.js";
import { AuthService } from "../src/modules/auth/auth.service.js";
import { SessionService } from "../src/modules/auth/session.service.js";
import { SessionCookieService } from "../src/modules/auth/session-cookie.service.js";
import { MetricsService } from "../src/modules/metrics/metrics.service.js";

describe("CSRF Guard (T050)", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = "production";
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: async () => ({
              token: "mock-token",
              expires_at: new Date(),
              usuario: { id: "u1", email: "e@e.com", nome: null },
            }),
            register: async () => ({
              id: "u1",
              email: "e@e.com",
              nome: null,
              created_at: new Date(),
            }),
            forgotPassword: async () => ({ message: "ok" }),
            resetPassword: async () => ({ message: "ok" }),
            logoutAudit: async () => {
              /* stub de teste */
            },
          },
        },
        { provide: SessionService, useValue: { revokeSession: async () => true } },
        {
          provide: SessionCookieService,
          useValue: {
            setSessionCookie: () => {
              /* stub de teste */
            },
            clearSessionCookie: () => {
              /* stub de teste */
            },
            getCookieName: () => "sess",
          },
        },
        {
          provide: MetricsService,
          useValue: {
            incrementRegister: () => {
              /* stub de teste */
            },
            incrementLogin: () => {
              /* stub de teste */
            },
            incrementLogout: () => {
              /* stub de teste */
            },
          },
        },
      ],
    }).compile();

    const adapter = new FastifyAdapter({ logger: false, bodyLimit: 1_048_576 });
    app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);
    await adapter.register(cookiePlugin as FastifyPluginAsync<FastifyCookieOptions>, {
      secret: "test-csrf",
    });
    await app.init();
    await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
  });

  afterAll(async () => {
    process.env.NODE_ENV = "test";
    await app.close();
  });

  it("login isento de CSRF — nao bloqueia sem X-CSRF-Token", async () => {
    const r = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "login@test.com", password: "Test@123!" })
      .set("Content-Type", "application/json");
    expect(r.status).not.toBe(403);
  });

  it("register isento de CSRF — nao bloqueia sem X-CSRF-Token", async () => {
    const r = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "reg@test.com", password: "Test@123!", nome: "Test" })
      .set("Content-Type", "application/json");
    expect(r.status).not.toBe(403);
  });

  it("logout sem X-CSRF-Token sem sessao → 200 (CSRF so atua com autenticacao)", async () => {
    const r = await request(app.getHttpServer()).post("/api/v1/auth/logout");
    expect(r.status).toBe(200);
    expect(r.body.message).toMatch(/Logout/i);
  });

  it("logout com X-CSRF-Token ≠ cookie sem sessao → 200 (CSRF so atua com autenticacao)", async () => {
    const r = await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("X-CSRF-Token", "wrong_token_value_1234")
      .set("Cookie", "csrf_token=correct_token_value_5678");
    expect(r.status).toBe(200);
  });

  it("logout com X-CSRF-Token == cookie → 200 (token valido)", async () => {
    const token = "a".repeat(64);
    const r = await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("X-CSRF-Token", token)
      .set("Cookie", [`sess=some-session-token`, `csrf_token=${token}`]);
    expect(r.status).toBe(200);
    expect(r.body.message).toMatch(/Logout/i);
  });

  it("logout sem X-CSRF-Token sem auth → 200 (CSRF delegation)", async () => {
    const r = await request(app.getHttpServer()).post("/api/v1/auth/logout");
    expect(r.status).toBe(200);
  });
});
