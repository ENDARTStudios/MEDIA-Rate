import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { APP_GUARD, APP_FILTER } from "@nestjs/core";
import { CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { captureException } from "@sentry/node";
import { AdminController } from "../src/modules/admin/admin.controller.js";
import { AdminService } from "../src/modules/admin/admin.service.js";
import { FeatureFlagService } from "../src/modules/flags/feature-flags.service.js";
import { GlobalExceptionFilter } from "../src/common/global-exception.filter.js";

// T293: mock do transport do Sentry — captura sem rede e devolve eventId fixo.
vi.mock("@sentry/node", () => ({
  init: vi.fn(),
  captureException: vi.fn((_e: unknown) => "evt-teste-123"),
}));

const ROLE: "ADMIN" | "USER" = "ADMIN";
let FLAG_ON = true;

class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().user = { id: ROLE === "ADMIN" ? "admin-1" : "user-1" };
    return true;
  }
}
class FakeRolesGuard implements CanActivate {
  canActivate(): boolean {
    if (ROLE !== "ADMIN") throw new ForbiddenException({ statusCode: 403, error: "Forbidden" });
    return true;
  }
}

describe("T293 — Sentry (mock de transport)", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env.SENTRY_DSN = "http://fake@localhost/1";
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: { getStats: async () => ({ value: {}, hit: false }) } },
        { provide: FeatureFlagService, useValue: { avaliavel: async () => FLAG_ON } },
        { provide: APP_GUARD, useValue: new FakeAuthGuard() },
        { provide: APP_GUARD, useValue: new FakeRolesGuard() },
        { provide: APP_FILTER, useClass: GlobalExceptionFilter },
      ],
    }).compile();

    const adapter = new FastifyAdapter({ logger: false });
    app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);
    await app.init();
    await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
  });

  afterAll(async () => {
    delete process.env.SENTRY_DSN;
    await app.close();
  });

  it("sentry-test (flag ON) → 500 com sentryEventId + X-Correlation-Id", async () => {
    vi.clearAllMocks();
    const res = await request(app.getHttpServer())
      .get("/api/v1/admin/sentry-test")
      .set("x-request-id", "corr-test-1");
    expect(res.status).toBe(500);
    expect(res.body.correlationId).toBe("corr-test-1");
    expect(res.body.sentryEventId).toBe("evt-teste-123");
    expect(res.headers["x-correlation-id"]).toBe("corr-test-1");

    expect(captureException).toHaveBeenCalledTimes(1);
    const args = (captureException as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(args[0]).toBeInstanceOf(Error);
    expect(args[1]).toMatchObject({
      tags: expect.objectContaining({ correlation_id: "corr-test-1", http_status: "500" }),
      user: { id: "admin-1" },
    });
  });

  it("sentry-test (flag OFF) → 404 sem captura", async () => {
    FLAG_ON = false;
    vi.clearAllMocks();
    const res = await request(app.getHttpServer()).get("/api/v1/admin/sentry-test");
    expect(res.status).toBe(404);
    expect(res.body.sentryEventId).toBeUndefined();
    expect(captureException).not.toHaveBeenCalled();
    FLAG_ON = true;
  });
});
