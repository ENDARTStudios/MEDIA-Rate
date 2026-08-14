/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { APP_GUARD } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import cookie from "@fastify/cookie";
import { createHash, randomUUID } from "node:crypto";
import { AuthModule } from "../src/modules/auth/auth.module.js";
import { MetricsModule } from "../src/modules/metrics/metrics.module.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { PasswordService } from "../src/common/password.service.js";
import { LockoutService } from "../src/modules/auth/lockout.service.js";
import { AnalyticsService } from "../src/common/analytics.service.js";
import { AuditLogService } from "../src/common/audit-log.service.js";
import { MockMailService } from "../src/common/mock-mail.service.js";
import { AuthGuard } from "../src/common/guards/auth.guard.js";

const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const AUDIT: string[] = [];

function makeStore() {
  const sessoes = new Map<string, Record<string, unknown>>();
  const usuarios = new Map<string, Record<string, unknown>>();
  const prisma = {
    usuario: {
      findUnique: async ({ where }: any) => {
        const u = where.email
          ? usuarios.get(where.email) ?? null
          : [...usuarios.values()].find((x) => x.id === where.id) ?? null;
        // T321: getMe lê created_at — default seguro no mock.
        return u ? { ...u, created_at: u.created_at ?? new Date() } : null;
      },
      update: async ({ where, data }: any) => {
        const u = [...usuarios.values()].find((x) => x.id === where.id);
        if (u) Object.assign(u, data);
        return u;
      },
    },
    sessao: {
      create: async ({ data }: any) => {
        const row = { id: randomUUID(), revoked_at: null, created_at: new Date(), ...data };
        sessoes.set(row.id, row);
        return row;
      },
      findUnique: async ({ where, include }: any) => {
        let row: Record<string, unknown> | null = null;
        if (where.token_hash) {
          row = [...sessoes.values()].find((r) => r.token_hash === where.token_hash) ?? null;
        }
        if (where.refresh_token_hash) {
          row =
            [...sessoes.values()].find((r) => r.refresh_token_hash === where.refresh_token_hash) ??
            null;
        }
        if (row && include?.usuario) {
          const u = [...usuarios.values()].find((x) => x.id === row!.usuario_id);
          return { ...row, usuario: u ?? { id: row.usuario_id, email: "", nome: null } };
        }
        return row;
      },
      findFirst: async ({ where }: any) =>
        [...sessoes.values()].find(
          (r) => r.refresh_token_hash_anterior === where.refresh_token_hash_anterior,
        ) ?? null,
      update: async ({ where, data }: any) => {
        const row = sessoes.get(where.id);
        if (row) Object.assign(row, data);
        return row;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const r of sessoes.values()) {
          if (r.usuario_id === where.usuario_id && r.revoked_at === null) {
            Object.assign(r, data);
            count++;
          }
        }
        return { count };
      },
    },
  };
  return { prisma, sessoes, usuarios };
}

function getCookie(res: request.Response, name: string): string | null {
  const setCookies = res.headers["set-cookie"];
  if (!setCookies) return null;
  const list = Array.isArray(setCookies) ? setCookies : [setCookies];
  for (const c of list) {
    const m = c.match(new RegExp(`${name}=([^;]+)`));
    if (m) return m[1];
  }
  return null;
}

describe("Refresh token flow — e2e via HTTP (T212)", () => {
  let app: NestFastifyApplication;
  let ctx: ReturnType<typeof makeStore>;

  beforeAll(async () => {
    ctx = makeStore();
    // Usuário de teste (verificado — pré-existente ao backfill da T214).
    ctx.usuarios.set("user@test.com", {
      id: "u1",
      email: "user@test.com",
      nome: "Teste",
      password_hash: "fake-hash",
      email_verificado_em: new Date(),
    });

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
      .useValue({ enviarResetSenha: async () => undefined })
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

  it("login define cookies sess + refresh (httpOnly)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "user@test.com", password: "Senha123!" });
    expect(res.status).toBe(200);
    expect(getCookie(res, "sess")).toBeTruthy();
    expect(getCookie(res, "refresh")).toBeTruthy();
  });

  it("fluxo completo: refresh rotaciona o par; REUSO do antigo → 401 + todas as sessões revogadas", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "user@test.com", password: "Senha123!" });
    const refreshAntigo = getCookie(login, "refresh")!;
    const sessAntiga = getCookie(login, "sess")!;

    // 1º refresh: rotaciona → novo par.
    const r1 = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Cookie", `refresh=${refreshAntigo}`);
    expect(r1.status).toBe(200);
    const refreshNovo = getCookie(r1, "refresh")!;
    const sessNova = getCookie(r1, "sess")!;
    expect(refreshNovo).not.toBe(refreshAntigo);
    expect(sessNova).not.toBe(sessAntiga);
    expect(AUDIT).toContain("TOKEN_REFRESHED");

    // 2º: REUSO do refresh antigo (já rotacionado) → 401 + revoga TUDO.
    const r2 = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Cookie", `refresh=${refreshAntigo}`);
    expect(r2.status).toBe(401);
    expect(AUDIT).toContain("TOKEN_REFRESH_REUSE_DETECTED");
    expect(AUDIT).toContain("SESSION_REVOKED_ALL");

    // O access NOVO (emitido na rotação) também foi revogado.
    const me = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Cookie", `sess=${sessNova}`);
    expect(me.status).toBe(401);
  });

  it("refresh sem cookie → 401", async () => {
    const res = await request(app.getHttpServer()).post("/api/v1/auth/refresh");
    expect(res.status).toBe(401);
  });

  it("compatibilidade: sessão antiga (sem refresh) continua válida no access; /refresh sem cookie → 401", async () => {
    // Sessão pré-T212: apenas access (sem colunas de refresh).
    const accessAntigo = "access-token-legado-abc";
    ctx.sessoes.set("legado", {
      id: "legado",
      usuario_id: "u1",
      token_hash: hash(accessAntigo),
      refresh_token_hash: null,
      refresh_token_hash_anterior: null,
      refresh_expira_em: null,
      refresh_family_id: null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revoked_at: null,
    });
    const me = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Cookie", `sess=${accessAntigo}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe("user@test.com");
    // Sem refresh cookie → 401 (não renova, mas não quebra o logado).
    const refresh = await request(app.getHttpServer()).post("/api/v1/auth/refresh");
    expect(refresh.status).toBe(401);
  });

  it("sliding session: access com < 5min restantes renova transparente via /me", async () => {
    const access = "access-sliding-xyz";
    ctx.sessoes.set("sliding", {
      id: "sliding",
      usuario_id: "u1",
      token_hash: hash(access),
      refresh_token_hash: null,
      refresh_token_hash_anterior: null,
      refresh_expira_em: null,
      refresh_family_id: null,
      expires_at: new Date(Date.now() + 2 * 60 * 1000), // < 5min → renova
      revoked_at: null,
    });
    const me = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Cookie", `sess=${access}`);
    expect(me.status).toBe(200);
    const row = ctx.sessoes.get("sliding")!;
    const restante = (row.expires_at as Date).getTime() - Date.now();
    expect(restante).toBeGreaterThan(10 * 60 * 1000); // estendido para ~15min
  });
});
