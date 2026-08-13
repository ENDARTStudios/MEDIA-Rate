/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { APP_GUARD } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import cookie from "@fastify/cookie";
import { randomUUID } from "node:crypto";
import { AuthModule } from "../src/modules/auth/auth.module.js";
import { MetricsModule } from "../src/modules/metrics/metrics.module.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { PasswordService } from "../src/common/password.service.js";
import { LockoutService } from "../src/modules/auth/lockout.service.js";
import { AnalyticsService } from "../src/common/analytics.service.js";
import { AuditLogService } from "../src/common/audit-log.service.js";
import { MockMailService } from "../src/common/mock-mail.service.js";
import { AuthGuard } from "../src/common/guards/auth.guard.js";

const AUDIT: string[] = [];
const MAILBOX: { email: string; token: string }[] = [];

function makeStore() {
  const usuarios = new Map<string, Record<string, unknown>>();
  const sessoes = new Map<string, Record<string, unknown>>();
  const prisma = {
    usuario: {
      findUnique: async ({ where }: any) => {
        if (where.email) return usuarios.get(where.email) ?? null;
        if (where.id) return [...usuarios.values()].find((u) => u.id === where.id) ?? null;
        return null;
      },
      findFirst: async ({ where }: any) =>
        [...usuarios.values()].find((u) => {
          if (u.email_verification_token_hash !== where.email_verification_token_hash) {
            return false;
          }
          const exp = where.email_verification_expira_em;
          if (exp && "gt" in exp && exp.gt) {
            return (
              u.email_verification_expira_em != null &&
              new Date(u.email_verification_expira_em as Date) > new Date(exp.gt as Date)
            );
          }
          return true;
        }) ?? null,
      create: async ({ data }: any) => {
        const u = {
          id: randomUUID(),
          created_at: new Date(),
          email_verificado_em: null,
          email_verification_token_hash: null,
          email_verification_expira_em: null,
          ...data,
        };
        usuarios.set(u.email, u);
        return u;
      },
      update: async ({ where, data }: any) => {
        const u = [...usuarios.values()].find((x) => x.id === where.id);
        if (u) Object.assign(u, data);
        return u;
      },
    },
    usuarioPlano: { create: async () => ({}) },
    papel: { findUnique: async () => ({ id: "p1", nome: "USER" }) },
    usuarioPapel: { create: async () => ({}) },
    $transaction: async (arg: any) => {
      if (typeof arg === "function") return arg(prisma);
      for (const op of arg) await op;
    },
    sessao: {
      create: async ({ data }: any) => {
        const row = { id: randomUUID(), revoked_at: null, ...data };
        sessoes.set(row.id, row);
        return row;
      },
    },
  };
  return { prisma, usuarios, sessoes };
}

describe("Email verification — e2e via HTTP (T214)", () => {
  let app: NestFastifyApplication;
  let ctx: ReturnType<typeof makeStore>;

  beforeAll(async () => {
    ctx = makeStore();
    AUDIT.length = 0;
    MAILBOX.length = 0;

    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule, MetricsModule],
      providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
    })
      .overrideProvider(PrismaService)
      .useValue(ctx.prisma)
      .overrideProvider(PasswordService)
      .useValue({ hash: async (p: string) => `argon2id:${p}`, verify: async () => true })
      .overrideProvider(LockoutService)
      .useValue({
        isLocked: async () => ({ locked: false, remainingMs: 0 }),
        registerFailure: async () => ({ locked: false, failedCount: 1, lockedForMs: 0 }),
        resetOnSuccess: async () => undefined,
      })
      .overrideProvider(AnalyticsService)
      .useValue({ capture: () => undefined, identify: () => undefined })
      .overrideProvider(AuditLogService)
      .useValue({
        log: async (params: { acao: string }) => {
          AUDIT.push(params.acao);
        },
      })
      .overrideProvider(MockMailService)
      .useValue({
        enviarResetSenha: async () => undefined,
        enviarVerificacaoEmail: async (email: string, token: string) => {
          MAILBOX.push({ email, token });
        },
      })
      .compile();

    const adapter = new FastifyAdapter({ logger: false });
    app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);
    await app.register(cookie as never);
    await app.init();
    await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("register → 201 sem token no body; token no mailbox; audit EMAIL_VERIFICATION_SENT", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "novo@test.com", password: "Senha123!", aceitouTermos: true });
    expect(res.status).toBe(201);
    expect(JSON.stringify(res.body)).not.toContain("token");
    expect(MAILBOX.some((m) => m.email === "novo@test.com")).toBe(true);
    expect(AUDIT).toContain("EMAIL_VERIFICATION_SENT");
  });

  it("login sem verificar → 403 EMAIL_NOT_VERIFIED e SEM cookie de sessão", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "novo@test.com", password: "Senha123!" });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("EMAIL_NOT_VERIFIED");
    expect(res.headers["set-cookie"]).toBeUndefined();
    expect(AUDIT).toContain("USER_LOGIN_FAILED");
  });

  it("verify-email com token válido → 200; login passa a funcionar", async () => {
    const entry = MAILBOX.find((m) => m.email === "novo@test.com")!;
    const v = await request(app.getHttpServer()).get(
      `/api/v1/auth/verify-email?token=${entry.token}`,
    );
    expect(v.status).toBe(200);
    expect(AUDIT).toContain("EMAIL_VERIFIED");

    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "novo@test.com", password: "Senha123!" });
    expect(login.status).toBe(200);
    expect(login.headers["set-cookie"]).toBeDefined();
  });

  it("verify-email com token inválido ou expirado → 200 genérico (sem revelar)", async () => {
    const invalido = await request(app.getHttpServer()).get(
      "/api/v1/auth/verify-email?token=token-invalido",
    );
    expect(invalido.status).toBe(200);
    expect(invalido.body.message).toContain("Email verificado");
  });

  it("resend-verification: 3/h por email → 429 na 4ª; email inexistente → 200 genérico", async () => {
    for (let i = 0; i < 3; i++) {
      const r = await request(app.getHttpServer())
        .post("/api/v1/auth/resend-verification")
        .send({ email: "ninguem@test.com" });
      expect(r.status).toBe(200);
    }
    const quarto = await request(app.getHttpServer())
      .post("/api/v1/auth/resend-verification")
      .send({ email: "ninguem@test.com" });
    expect(quarto.status).toBe(429);
  });

  it("legado (backfill): usuário existente com email verificado loga normalmente", async () => {
    ctx.usuarios.set("legado@test.com", {
      id: "u-legado",
      email: "legado@test.com",
      password_hash: "h",
      email_verificado_em: new Date(), // backfill da migration
      email_verification_token_hash: null,
      email_verification_expira_em: null,
    });
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "legado@test.com", password: "Senha123!" });
    expect(login.status).toBe(200);
    expect(login.headers["set-cookie"]).toBeDefined();
  });
});
