import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test } from "@nestjs/testing";
import { CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { MetricsModule } from "../src/modules/metrics/metrics.module.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { AuditLogService } from "../src/common/audit-log.service.js";
import { AuthGuard } from "../src/common/guards/auth.guard.js";
import { RolesGuard } from "../src/common/guards/roles.guard.js";

let ROLE: "ADMIN" | "USER" = "ADMIN";

class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().user = {
      id: ROLE === "ADMIN" ? "admin-1" : "user-1",
    };
    return true;
  }
}
class FakeRolesGuard implements CanActivate {
  canActivate(): boolean {
    if (ROLE !== "ADMIN") {
      throw new ForbiddenException({
        statusCode: 403,
        error: "Forbidden",
        message: "Acesso negado.",
      });
    }
    return true;
  }
}

describe("GET /api/v1/admin/alerts/status — e2e (T218)", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MetricsModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(AuditLogService)
      .useValue({ log: async () => undefined })
      .overrideGuard(AuthGuard)
      .useValue(new FakeAuthGuard())
      .overrideGuard(RolesGuard)
      .useValue(new FakeRolesGuard())
      .compile();

    const adapter = new FastifyAdapter({ logger: false });
    app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);
    await app.init();
    await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    ROLE = "ADMIN";
  });

  it("admin → 200 com array de 2 alertas (estrutura)", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/admin/alerts/status");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.alertas)).toBe(true);
    expect(res.body.alertas).toHaveLength(2);
    const nomes = res.body.alertas.map((a: { nome: string }) => a.nome);
    expect(nomes).toContain("5xx_rate");
    expect(nomes).toContain("auth_failures");
    for (const a of res.body.alertas) {
      expect(a).toHaveProperty("estado");
      expect(a).toHaveProperty("threshold");
      expect(a).toHaveProperty("valorAtual");
      expect(a).toHaveProperty("janela");
      expect(a).toHaveProperty("ultimoDisparo");
    }
  });

  it("non-admin → 403", async () => {
    ROLE = "USER";
    const res = await request(app.getHttpServer()).get("/api/v1/admin/alerts/status");
    expect(res.status).toBe(403);
  });
});
