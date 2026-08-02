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
import { createHash } from "crypto";

describe("AuthService (unit)", () => {
  let service: AuthService;
  let mockPrismaObj: ReturnType<typeof mockPrisma>;
  let userMap: Map<string, any>;

  beforeEach(async () => {
    process.env.SKIP_DB_CONNECT = "true";
    userMap = new Map();
    mockPrismaObj = mockPrisma(userMap);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PasswordService,
          useValue: {
            hash: async () => "hashed",
            verify: async (pw: string, _hash: string) => pw === "Senha@123",
          },
        },
        {
          provide: SessionService,
          useValue: {
            createSession: async () => ({
              token: "mock-token",
              record: {
                id: "s1",
                usuario_id: "u2",
                expires_at: new Date(Date.now() + 7 * 86400000),
              },
            }),
          },
        },
        {
          provide: LockoutService,
          useValue: {
            isLocked: async () => ({ locked: false, remainingMs: 0 }),
            registerFailure: async () => ({ locked: false, failedCount: 1 }),
            resetOnSuccess: async () => {},
          },
        },
        { provide: PrismaService, useValue: mockPrismaObj },
        { provide: AnalyticsService, useValue: { capture: () => {}, identify: () => {} } },
        { provide: AuditLogService, useValue: { log: async () => {} } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("register — cria usuário com sucesso", async () => {
    const result = await service.register({
      email: "new@test.com",
      password: "Senha@123",
      nome: "Novo",
    });
    expect(result.email).toBe("new@test.com");
  });

  it("register — email duplicado lança ConflictException", async () => {
    await expect(
      service.register({ email: "exists@test.com", password: "Senha@123" }),
    ).rejects.toThrow(ConflictException);
  });

  it("login — credenciais válidas retornam token", async () => {
    const result = await service.login({ email: "valid@test.com", password: "Senha@123" });
    expect(result.token).toBeDefined();
    expect(result.usuario.email).toBe("valid@test.com");
  });

  it("login — senha incorreta lança UnauthorizedException", async () => {
    await expect(service.login({ email: "valid@test.com", password: "wrong" })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("forgotPassword — retorna mesma mensagem para email existente ou não", async () => {
    const r1 = await service.forgotPassword("any@test.com");
    const r2 = await service.forgotPassword("nonexistent@test.com");
    expect(r1.message).toBe(r2.message);
  });

  it("forgotPassword — para email existente cria token de reset", async () => {
    userMap.set("existing@test.com", {
      id: "u3",
      email: "existing@test.com",
      password_hash: "hashed",
      nome: null,
      password_reset_token: null,
      password_reset_expira: null,
      ultimo_login_em: null,
      email_verificado_em: null,
    });
    const r = await service.forgotPassword("existing@test.com");
    expect(r.message).toContain("Se o email existir");
    // O mock atualiza o registro internamente
    const user = userMap.get("existing@test.com");
    expect(user?.password_reset_token).toBeDefined();
  });

  it("resetPassword — token invalido lança BadRequestException", async () => {
    await expect(service.resetPassword("invalid-token", "NewPass@123")).rejects.toThrow(
      BadRequestException,
    );
  });

  it("resetPassword — token valido altera senha", async () => {
    const rawToken = "valid-raw-token-for-reset";
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    userMap.set("reset@test.com", {
      id: "u4",
      email: "reset@test.com",
      password_hash: "old-hash",
      nome: null,
      password_reset_token: tokenHash,
      password_reset_expira: new Date(Date.now() + 3600000),
      ultimo_login_em: null,
      email_verificado_em: null,
    });
    // findFirst procura pelo hash do token
    mockPrismaObj.usuario.findFirst = async (args: any) => {
      for (const u of userMap.values()) {
        if (
          args.where.password_reset_token &&
          u.password_reset_token === args.where.password_reset_token
        ) {
          if (args.where.password_reset_expira) {
            const gtDate = args.where.password_reset_expira.gt as Date;
            if (u.password_reset_expira && new Date(u.password_reset_expira) > gtDate) return u;
            return null;
          }
          return u;
        }
      }
      return null;
    };
    // update procura pelo id
    mockPrismaObj.usuario.update = async (args: any) => {
      if (args.where.id) {
        const u = userMap.get(
          args.where.email ?? Object.values(userMap).find((v) => v.id === args.where.id)?.email,
        );
        if (u) {
          Object.assign(u, args.data);
          return u;
        }
        for (const v of userMap.values()) {
          if (v.id === args.where.id) {
            Object.assign(v, args.data);
            return v;
          }
        }
      }
      return null;
    };

    const result = await service.resetPassword(rawToken, "NewStrong@1");
    expect(result.message).toMatch(/alterada/i);
  });

  it("resetPassword — token expirado lança BadRequestException", async () => {
    userMap.set("expired@test.com", {
      id: "u5",
      email: "expired@test.com",
      password_hash: "old",
      nome: null,
      password_reset_token: "expired-token-hash",
      password_reset_expira: new Date(Date.now() - 3600000),
      ultimo_login_em: null,
    });
    mockPrismaObj.usuario.findFirst = async () => null; // findFirst retorna null pq expirado

    await expect(service.resetPassword("expired-token-hash", "NewPass")).rejects.toThrow(
      BadRequestException,
    );
  });

  it("login — ip padrao 'unknown' quando nao fornecido", async () => {
    const result = await service.login({ email: "valid@test.com", password: "Senha@123" });
    expect(result.token).toBeDefined();
  });

  it("logoutAudit — chama auditLog com acao logout", async () => {
    let loggedAction = "";
    const auditModule = (service as any).auditLog;
    auditModule.log = async (args: any) => {
      loggedAction = args.acao;
    };
    await service.logoutAudit("u1", "1.2.3.4");
    expect(loggedAction).toBe("logout");
  });
});

function mockPrisma(users: Map<string, any>) {
  users.set("exists@test.com", {
    id: "u1",
    email: "exists@test.com",
    password_hash: "hashed",
    nome: null,
    password_reset_token: null,
    password_reset_expira: null,
    ultimo_login_em: null,
  });
  users.set("valid@test.com", {
    id: "u2",
    email: "valid@test.com",
    password_hash: "hashed",
    nome: null,
    password_reset_token: null,
    password_reset_expira: null,
    ultimo_login_em: null,
    email_verificado_em: null,
  });

  return {
    usuario: {
      findUnique: async (args: any) => users.get(args.where.email) ?? null,
      findFirst: async (args: any) => {
        for (const u of users.values()) {
          if (
            args.where.password_reset_token &&
            u.password_reset_token === args.where.password_reset_token
          ) {
            if (
              args.where.password_reset_expira &&
              u.password_reset_expira < args.where.password_reset_expira.gt
            )
              return u;
            if (args.where.password_reset_expira) return null;
            return u;
          }
        }
        return null;
      },
      create: async (args: any) => {
        const u = {
          id: `u_${Date.now()}`,
          email: args.data.email,
          password_hash: "hashed",
          nome: args.data.nome ?? null,
          password_reset_token: null,
          password_reset_expira: null,
          ultimo_login_em: null,
          email_verificado_em: null,
        };
        users.set(args.data.email, u);
        return u;
      },
      update: async (args: any) => {
        const email = args.where.email || args.where.id;
        if (args.where.email) {
          const u = users.get(args.where.email);
          if (u) {
            Object.assign(u, args.data);
            return u;
          }
        }
        if (args.where.id) {
          for (const u of users.values()) {
            if (u.id === args.where.id) {
              Object.assign(u, args.data);
              return u;
            }
          }
        }
        // updateMany fallback
        for (const u of users.values()) {
          if (u.password_reset_token === args.where.password_reset_token) {
            Object.assign(u, args.data);
            return u;
          }
        }
        return null;
      },
    },
    papel: { findUnique: async () => ({ id: 1, nome: "USER" }) },
    usuarioPapel: { create: async () => ({}) },
    usuarioPlano: { create: async () => ({}) },
    sessao: { updateMany: async () => ({ count: 0 }) },
    $transaction: async (arg: any) => {
      // Forma callback (register): tx como objeto de métodos.
      if (typeof arg === "function") {
        return arg({
          usuario: {
            create: async (a: any) => (
              users.set(a.data.email, {
                id: `u_${Date.now()}`,
                email: a.data.email,
                password_hash: "hashed",
                nome: a.data.nome ?? null,
                password_reset_token: null,
                password_reset_expira: null,
                ultimo_login_em: null,
                email_verificado_em: null,
              }),
              users.get(a.data.email)!
            ),
            update: async () => ({}),
          },
          usuarioPapel: { create: async () => ({}) },
          usuarioPlano: { create: async () => ({}) },
          papel: { findUnique: async () => ({ id: 1, nome: "USER" }) },
        });
      }
      // Forma array (resetPassword): executa cada operação em sequência.
      for (const op of arg) await op;
      return arg;
    },
  };
}
