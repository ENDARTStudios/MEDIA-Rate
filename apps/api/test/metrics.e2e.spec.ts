/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test } from "@nestjs/testing";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { CanActivate, ExecutionContext } from "@nestjs/common";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { MetricsModule } from "../src/modules/metrics/metrics.module.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { MetricsInterceptor } from "../src/common/interceptors/metrics.interceptor.js";

let SESSION_USER: { id: string } | null = { id: "admin-1" };

class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (SESSION_USER) {
      context.switchToHttp().getRequest().user = SESSION_USER;
    }
    return true; // /metrics é público no guard — a autorização acontece no controller
  }
}

describe("GET /metrics — e2e via HTTP (T217)", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MetricsModule],
      providers: [
        { provide: APP_GUARD, useValue: new FakeAuthGuard() },
        // T217: interceptor global via DI (mesmo container do controller).
        { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({
        usuarioPapel: {
          findFirst: async ({ where }: any) =>
            where.usuario_id === "admin-1" ? { id: "p1" } : null,
        },
      })
      .compile();

    const adapter = new FastifyAdapter({ logger: false });
    app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);
    await app.init();
    await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
  });

  afterAll(async () => {
    delete process.env.METRICS_ALLOW_IPS;
    await app.close();
  });

  beforeEach(() => {
    SESSION_USER = { id: "admin-1" };
    delete process.env.METRICS_ALLOW_IPS;
  });

  it("admin (sessão) → 200 com métricas Prometheus; interceptor alimenta os contadores", async () => {
    // 1ª chamada registra a própria requisição (pós-resposta); a 2ª inclui.
    await request(app.getHttpServer()).get("/metrics").set("Cookie", "sess=x");
    const res = await request(app.getHttpServer()).get("/metrics").set("Cookie", "sess=x");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.text).toContain("# HELP http_requests_total");
    expect(res.text).toContain("http_requests_total{");
    expect(res.text).toContain("http_request_duration_seconds_bucket");
  });

  it("sem autorização → 403", async () => {
    SESSION_USER = null; // sem sessão
    const res = await request(app.getHttpServer()).get("/metrics");
    expect(res.status).toBe(403);
  });

  it("IP allowlist (METRICS_ALLOW_IPS) → 200 mesmo sem sessão", async () => {
    process.env.METRICS_ALLOW_IPS = "127.0.0.1,::1,::ffff:127.0.0.1";
    SESSION_USER = null;
    const res = await request(app.getHttpServer()).get("/metrics");
    expect(res.status).toBe(200);
    expect(res.text).toContain("http_requests_total");
  });

  it("X-Admin-Token legado → 200", async () => {
    SESSION_USER = null;
    process.env.ADMIN_TOKEN = "token-metrics-teste";
    const res = await request(app.getHttpServer())
      .get("/metrics")
      .set("X-Admin-Token", "token-metrics-teste");
    expect(res.status).toBe(200);
    expect(res.text).toContain("# HELP http_requests_total");
  });

  it("métricas não expõem PII (regex: sem emails/passwords/tokens)", async () => {
    const res = await request(app.getHttpServer()).get("/metrics").set("Cookie", "sess=x");
    expect(res.status).toBe(200);
    expect(res.text).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/); // sem emails
    expect(res.text).not.toContain("password");
    expect(res.text).not.toContain("authorization");
  });
});
