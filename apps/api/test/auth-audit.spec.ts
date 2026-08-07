/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createHash } from "node:crypto";
import { AuthService } from "../src/modules/auth/auth.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { PasswordService } from "../src/common/password.service.js";
import { SessionService } from "../src/modules/auth/session.service.js";
import { SessionRotationService } from "../src/modules/auth/session-rotation.service.js";
import { LockoutService } from "../src/modules/auth/lockout.service.js";
import { AnalyticsService } from "../src/common/analytics.service.js";
import { AuditLogService } from "../src/common/audit-log.service.js";
import { MockMailService } from "../src/common/mock-mail.service.js";

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

function makeMocks() {
  const usuarios = new Map<string, Record<string, unknown>>();
  const auditLog = { log: vi.fn(async () => undefined) };
  const prisma = {
    usuario: {
      findUnique: async ({ where }: any) =>
        usuarios.get(where.email) ?? [...usuarios.values()].find((u) => u.id === where.id) ?? null,
      update: async ({ where, data }: any) => {
        const u = [...usuarios.values()].find((x) => x.id === where.id);
        if (u) Object.assign(u, data);
        return u;
      },
      create: async ({ data }: any) => {
        const u = { id: "u-novo", created_at: new Date(), ...data };
        usuarios.set(u.email, u);
        return u;
      },
    },
    usuarioPlano: { create: async () => ({}) },
    papel: { findUnique: async () => ({ id: "p1", nome: "USER" }) },
    usuarioPapel: { create: async () => ({}) },
    $transaction: async (arg: any) => {
      if (typeof arg === "function") return arg(prisma);
      for (const op of arg) await op; // forma array (resetPassword)
    },
    sessao: {
      findUnique: async ({ where }: any) => {
        if (where.token_hash) {
          return [...sessoes.values()].find((r) => r.token_hash === where.token_hash) ?? null;
        }
        if (where.refresh_token_hash) {
          return (
            [...sessoes.values()].find((r) => r.refresh_token_hash === where.refresh_token_hash) ??
            null
          );
        }
        return null;
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
  const sessoes = new Map<string, Record<string, unknown>>();
  const sessionService = {
    generateToken: () => "access-token-xyz",
    hashToken: (t: string) => hash(t),
    createSession: async (params: any) => ({
      token: "access-token-xyz",
      refreshToken: "refresh-token-xyz",
      record: { id: "s1", usuario_id: params.usuario_id, expires_at: new Date() },
    }),
  } as unknown as SessionService;
  const sessionRotation = {
    rotacionarRefresh: async () => ({
      ok: true,
      refreshToken: "novo-refresh",
      sessaoId: "s1",
      usuarioId: "u1",
      familyId: "fam-1",
    }),
    revogarTodasSessoes: async () => 1,
  } as unknown as SessionRotationService;
  const passwordService = {
    hash: async (p: string) => `argon2id:${p}`,
    verify: async () => true,
  } as unknown as PasswordService;
  const lockoutService = {
    isLocked: async () => ({ locked: false, remainingMs: 0 }),
    registerFailure: async () => ({ locked: false, failedCount: 1, lockedForMs: 0 }),
    resetOnSuccess: async () => undefined,
  } as unknown as LockoutService;

  const service = new AuthService(
    prisma as unknown as PrismaService,
    passwordService,
    sessionService,
    sessionRotation,
    lockoutService,
    { capture: vi.fn(), identify: vi.fn() } as unknown as AnalyticsService,
    auditLog as unknown as AuditLogService,
    { enviarResetSenha: vi.fn() } as unknown as MockMailService,
  );
  return { service, prisma, usuarios, sessoes, auditLog, sessionRotation };
}

describe("Auth audit logging (T213)", () => {
  let m: ReturnType<typeof makeMocks>;
  const UA = "test-agent/1.0";
  const IP = "1.2.3.4";

  beforeEach(() => {
    m = makeMocks();
  });

  const acoes = () => m.auditLog.log.mock.calls.map((c) => c[0] as { acao: string });
  const jsonDeTudo = () => JSON.stringify(m.auditLog.log.mock.calls.map((c) => c[0]));

  it("register → USER_REGISTERED com ip + user-agent e sem senha", async () => {
    await m.service.register(
      { email: "novo@test.com", password: "Senha123!", nome: "Novo" },
      { ip: IP, user_agent: UA },
    );
    const call = acoes().find((a) => a.acao === "USER_REGISTERED");
    expect(call).toBeDefined();
    expect(call!.ipOrigem).toBe(IP);
    expect(call!.dadosDepois).toMatchObject({ email: "novo@test.com", userAgent: UA });
    expect(jsonDeTudo()).not.toContain("Senha123!");
  });

  it("login válido → USER_LOGIN_SUCCESS com ip + user-agent", async () => {
    m.usuarios.set("user@test.com", {
      id: "u1",
      email: "user@test.com",
      nome: "T",
      password_hash: "h",
      email_verificado_em: null,
    });
    await m.service.login(
      { email: "user@test.com", password: "Senha123!" },
      { ip: IP, user_agent: UA },
    );
    const call = acoes().find((a) => a.acao === "USER_LOGIN_SUCCESS");
    expect(call).toBeDefined();
    expect(call!.ipOrigem).toBe(IP);
    expect(call!.dadosDepois).toMatchObject({ userAgent: UA });
    expect(jsonDeTudo()).not.toContain("Senha123!");
  });

  it("login com senha errada → USER_LOGIN_FAILED (motivo) sem senha", async () => {
    m.usuarios.set("user@test.com", {
      id: "u1",
      email: "user@test.com",
      nome: "T",
      password_hash: "h",
      email_verificado_em: null,
    });
    (m.service as any).passwordService.verify = async () => false;
    await expect(
      m.service.login(
        { email: "user@test.com", password: "Errada123!" },
        { ip: IP, user_agent: UA },
      ),
    ).rejects.toThrow();
    const call = acoes().find((a) => a.acao === "USER_LOGIN_FAILED");
    expect(call).toBeDefined();
    expect(call!.ipOrigem).toBe(IP);
    expect(call!.dadosDepois).toMatchObject({ motivo: "invalid_credentials", userAgent: UA });
    expect(jsonDeTudo()).not.toContain("Errada123!");
  });

  it("login de email inexistente → USER_LOGIN_FAILED (email p/ auditoria)", async () => {
    await expect(
      m.service.login({ email: "ninguem@test.com", password: "Xyz123!" }, { ip: IP }),
    ).rejects.toThrow();
    const call = acoes().find((a) => a.acao === "USER_LOGIN_FAILED");
    expect(call).toBeDefined();
    expect(call!.dadosDepois).toMatchObject({ email: "ninguem@test.com" });
  });

  it("logoutAudit → USER_LOGOUT com ip + user-agent", async () => {
    await m.service.logoutAudit("u1", IP, UA);
    const call = acoes().find((a) => a.acao === "USER_LOGOUT");
    expect(call).toBeDefined();
    expect(call!.ipOrigem).toBe(IP);
    expect(call!.dadosDepois).toMatchObject({ userAgent: UA });
  });

  it("forgotPassword → PASSWORD_RESET_REQUESTED com ip + user-agent", async () => {
    m.usuarios.set("user@test.com", { id: "u1", email: "user@test.com" });
    await m.service.forgotPassword("user@test.com", { ip: IP, user_agent: UA });
    const call = acoes().find((a) => a.acao === "PASSWORD_RESET_REQUESTED");
    expect(call).toBeDefined();
    expect(call!.ipOrigem).toBe(IP);
    expect(call!.dadosDepois).toMatchObject({ userAgent: UA });
  });

  it("resetPassword → PASSWORD_RESET_COMPLETED com ip + user-agent", async () => {
    const token = "reset-token-valido-1234567890";
    m.usuarios.set("user@test.com", {
      id: "u1",
      email: "user@test.com",
      password_reset_token: hash(token),
      password_reset_expira: new Date(Date.now() + 3_600_000),
      password_hash: "old",
    });
    m.sessoes.set("s1", { id: "s1", usuario_id: "u1", revoked_at: null });
    (m.service as any).prisma.usuario.findFirst = async ({ where }: any) => {
      const u = [...m.usuarios.values()].find(
        (x) => x.password_reset_token === where.password_reset_token,
      );
      return u ? { ...u } : null;
    };
    await m.service.resetPassword(token, "NovaSenha123!", { ip: IP, user_agent: UA });
    const call = acoes().find((a) => a.acao === "PASSWORD_RESET_COMPLETED");
    expect(call).toBeDefined();
    expect(call!.ipOrigem).toBe(IP);
    expect(call!.dadosDepois).toMatchObject({ userAgent: UA });
    expect(jsonDeTudo()).not.toContain("NovaSenha123!");
    expect(jsonDeTudo()).not.toContain(token);
  });

  it("T212 preservado: reuso de refresh → TOKEN_REFRESH_REUSE_DETECTED + SESSION_REVOKED_ALL", async () => {
    const refreshAntigo = "refresh-antigo-rotacionado";
    m.sessoes.set("s1", {
      id: "s1",
      usuario_id: "u1",
      token_hash: "access-2",
      refresh_token_hash: hash("refresh-novo"),
      refresh_token_hash_anterior: hash(refreshAntigo),
      refresh_expira_em: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      refresh_family_id: "fam-1",
      revoked_at: null,
    });
    (m.sessionRotation as any).rotacionarRefresh = async () => ({
      ok: false,
      motivo: "reuso",
      sessaoId: "s1",
      usuarioId: "u1",
      familyId: "fam-1",
    });
    await expect(m.service.refresh(refreshAntigo, { ip: IP, user_agent: UA })).rejects.toThrow();
    const acoes2 = acoes().map((a) => a.acao);
    expect(acoes2).toContain("TOKEN_REFRESH_REUSE_DETECTED");
    expect(acoes2).toContain("SESSION_REVOKED_ALL");
    const reuse = acoes().find((a) => a.acao === "TOKEN_REFRESH_REUSE_DETECTED");
    expect(reuse!.ipOrigem).toBe(IP);
    expect(reuse!.dadosDepois).toMatchObject({ userAgent: UA, familyId: "fam-1" });
    expect(jsonDeTudo()).not.toContain(refreshAntigo);
  });
});
