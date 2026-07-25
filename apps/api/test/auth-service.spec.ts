import { describe, it, expect, beforeEach } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { AuthService } from "../src/modules/auth/auth.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { PasswordService } from "../src/common/password.service.js";
import { SessionService } from "../src/modules/auth/session.service.js";
import { LockoutService } from "../src/modules/auth/lockout.service.js";
import { AnalyticsService } from "../src/common/analytics.service.js";
import { AuditLogService } from "../src/common/audit-log.service.js";
import { ConflictException, UnauthorizedException, BadRequestException } from "@nestjs/common";

describe("AuthService (unit)", () => {
  let service: AuthService;

  beforeEach(async () => {
    process.env.SKIP_DB_CONNECT = "true";
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PasswordService, useValue: { hash: async () => "hashed", verify: async (pw: string, _hash: string) => pw === "Senha@123" } },
        { provide: SessionService, useValue: { createSession: async () => ({ token: "mock-token", record: { id: "s1", usuario_id: "u2", expires_at: new Date(Date.now() + 7 * 86400000) } }) } },
        { provide: LockoutService, useValue: { isLocked: () => ({ locked: false, remainingMs: 0 }), registerFailure: () => ({ locked: false, failedCount: 1 }), resetOnSuccess: () => {} } },
        { provide: PrismaService, useValue: mockPrisma() },
        { provide: AnalyticsService, useValue: { capture: () => {}, identify: () => {} } },
        { provide: AuditLogService, useValue: { log: async () => {} } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("register — cria usuário com sucesso", async () => {
    const result = await service.register({ email: "new@test.com", password: "Senha@123", nome: "Novo" });
    expect(result.email).toBe("new@test.com");
  });

  it("register — email duplicado lança ConflictException", async () => {
    await expect(
      service.register({ email: "exists@test.com", password: "Senha@123" })
    ).rejects.toThrow(ConflictException);
  });

  it("login — credenciais válidas retornam token", async () => {
    const result = await service.login({ email: "valid@test.com", password: "Senha@123" });
    expect(result.token).toBeDefined();
    expect(result.usuario.email).toBe("valid@test.com");
  });

  it("login — senha incorreta lança UnauthorizedException", async () => {
    await expect(
      service.login({ email: "valid@test.com", password: "wrong" })
    ).rejects.toThrow(UnauthorizedException);
  });

  it("forgotPassword — retorna mesma mensagem para email existente ou não", async () => {
    const r1 = await service.forgotPassword("any@test.com");
    const r2 = await service.forgotPassword("nonexistent@test.com");
    expect(r1.message).toBe(r2.message);
  });

  it("resetPassword — token inválido lança BadRequestException", async () => {
    await expect(
      service.resetPassword("invalid-token", "NewPass@123")
    ).rejects.toThrow(BadRequestException);
  });
});

function mockPrisma() {
  const users = new Map<string, { id: string; email: string; password_hash: string; nome: string | null; password_reset_token: string | null; password_reset_expira: Date | null }>();
  users.set("exists@test.com", { id: "u1", email: "exists@test.com", password_hash: "hashed", nome: null, password_reset_token: null, password_reset_expira: null });
  users.set("valid@test.com", { id: "u2", email: "valid@test.com", password_hash: "hashed", nome: null, password_reset_token: null, password_reset_expira: null });

  return {
    usuario: {
      findUnique: async (args: any) => users.get(args.where.email) ?? null,
      findFirst: async () => null,
      create: async (args: any) => {
        const u = { id: `u_${Date.now()}`, email: args.data.email, password_hash: "hashed", nome: args.data.nome ?? null, password_reset_token: null, password_reset_expira: null };
        users.set(args.data.email, u);
        return u;
      },
      update: async (args: any) => {
        const email = args.where.email;
        if (email) { const u = users.get(email); if (u) Object.assign(u, args.data); return u; }
        return null;
      },
    },
    papel: { findUnique: async () => ({ id: 1, nome: "USER" }) },
    usuarioPapel: { create: async () => ({}) },
    usuarioPlano: { create: async () => ({}) },
    $transaction: async (fn: any) => fn({
      usuario: {
        create: async (a: any) => (users.set(a.data.email, { id: `u_${Date.now()}`, email: a.data.email, password_hash: "hashed", nome: a.data.nome ?? null, password_reset_token: null, password_reset_expira: null }), users.get(a.data.email)!),
        update: async () => ({}),
      },
      usuarioPapel: { create: async () => ({}) },
      usuarioPlano: { create: async () => ({}) },
      papel: { findUnique: async () => ({ id: 1, nome: "USER" }) },
    }),
  };
}
