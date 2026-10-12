import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test } from "@nestjs/testing";
import { APP_GUARD } from "@nestjs/core";
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AdminGateController } from "../src/modules/admin/admin-gate.controller.js";

/**
 * T206 — probe dedicado do gate admin: GET /api/v1/admin/gate.
 * Contrato: @Roles("ADMIN") (cadeia global), payload MÍNIMO {ok:true} — sem
 * papel/e-mail/id/sessão/IP/UA/token; idempotente; sem efeito colateral.
 * Guards fakeados aqui (o RolesGuard REAL e a ordem global já são exercidos
 * pelos e2e existentes e pela suíte completa no CI).
 */

let ROLE: "ADMIN" | "USER" | "ANONIMO" = "ADMIN";

class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (ROLE === "ANONIMO") throw new UnauthorizedException("Autenticação necessária.");
    context.switchToHttp().getRequest().user = { id: "u-1" };
    return true;
  }
}

class FakeRolesGuard implements CanActivate {
  canActivate(): boolean {
    if (ROLE !== "ADMIN") {
      // Espelha o RolesGuard real (exceção idêntica à produção).
      throw new ForbiddenException({
        statusCode: 403,
        error: "Forbidden",
        message: "Você não tem permissão para acessar este recurso.",
      });
    }
    return true;
  }
}

describe("AdminGateController — GET /api/v1/admin/gate (T206)", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminGateController],
      // Ordem global real (app.module): Auth → CSRF → Roles → Plan; aqui os dois
      // que importam para o contrato do gate (GET não usa CSRF; Plan não se aplica).
      providers: [
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: FakeRolesGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    ROLE = "ADMIN";
  });

  it("ADMIN → 200 com payload MÍNIMO {ok:true}", async () => {
    const r = await request(app.getHttpServer()).get("/api/v1/admin/gate");
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true });
  });

  it("payload não vaza papel, e-mail, id, sessão, ip, user-agent, token ou cookie", async () => {
    const r = await request(app.getHttpServer()).get("/api/v1/admin/gate");
    const bruto = JSON.stringify(r.body);
    expect(bruto).not.toContain("role");
    expect(bruto).not.toContain("email");
    expect(bruto).not.toContain("id");
    expect(bruto).not.toContain("session");
    expect(bruto).not.toContain("ip");
    expect(bruto).not.toContain("agent");
    expect(bruto).not.toContain("token");
    expect(bruto).not.toContain("cookie");
    expect(Object.keys(r.body)).toEqual(["ok"]);
  });

  it("não-admin (USER) → 403 (negação explícita, sem fallback aqui)", async () => {
    ROLE = "USER";
    const r = await request(app.getHttpServer()).get("/api/v1/admin/gate");
    expect(r.status).toBe(403);
  });

  it("anônimo → 401 (AuthGuard global; o web trata como fail-closed)", async () => {
    ROLE = "ANONIMO";
    const r = await request(app.getHttpServer()).get("/api/v1/admin/gate");
    expect(r.status).toBe(401);
  });
});

describe("T206 — gate coberto pelo rate limit admin de leitura (aplicarRateLimitAdmin)", () => {
  it("GET /api/v1/admin/gate recebe o limite de leitura (60/min)", async () => {
    const { aplicarRateLimitAdmin } = await import("../src/common/rate-limit.config.js");
    const rota = { url: "/api/v1/admin/gate", method: "GET" };
    aplicarRateLimitAdmin(rota as never);
    const cfg = (rota as { config?: { rateLimit?: { max: number } } }).config;
    expect(cfg?.rateLimit?.max).toBe(60);
  });
});
