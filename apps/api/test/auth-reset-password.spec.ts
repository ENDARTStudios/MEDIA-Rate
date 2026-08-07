/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { BadRequestException, Logger } from "@nestjs/common";
import { createHash } from "node:crypto";
import { AuthService } from "../src/modules/auth/auth.service.js";
import { PasswordService } from "../src/common/password.service.js";
import { ResetPasswordDto } from "../src/modules/auth/dto/auth.dto.js";

function makeMocks() {
  const users = new Map<string, Record<string, unknown>>();
  const mail = { enviarResetSenha: vi.fn(async () => undefined) };
  const audit = { log: vi.fn(async () => undefined) };
  const passwordService = {
    hash: vi.fn(async (pw: string) => `argon2id:${pw}`),
    verify: vi.fn(async () => true),
  } as unknown as PasswordService;

  const prisma = {
    usuario: {
      findUnique: vi.fn(async ({ where }: any) => users.get(where.email) ?? null),
      findFirst: vi.fn(async (args: any) => {
        for (const u of users.values()) {
          if (
            args.where.password_reset_token &&
            u.password_reset_token === args.where.password_reset_token
          ) {
            const exp = args.where.password_reset_expira;
            if (exp && "gt" in exp) {
              if (
                u.password_reset_expira &&
                new Date(u.password_reset_expira as Date) > (exp.gt as Date)
              ) {
                return u;
              }
            } else {
              return u;
            }
          }
        }
        return null;
      }),
      update: vi.fn(async (args: any) => {
        const alvo =
          [...users.values()].find((u) => u.id === args.where.id) ??
          [...users.values()].find((u) => u.email === args.where.email);
        if (alvo) Object.assign(alvo, args.data);
        return alvo;
      }),
    },
    sessao: { updateMany: vi.fn(async () => ({ count: 0 })) },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => {
      for (const op of ops) await op;
    }),
  };

  const service = new AuthService(
    prisma as any, // prisma
    passwordService, // passwordService
    {} as any, // sessionService
    {
      // sessionRotation
      rotacionarRefresh: async () => ({
        ok: true,
        refreshToken: "r",
        sessaoId: "s",
        usuarioId: "u",
        familyId: "f",
      }),
      revogarTodasSessoes: async () => 0,
    } as any,
    {} as any, // lockoutService
    { capture: vi.fn(), identify: vi.fn() } as any, // analytics
    audit as any, // auditLog
    mail as any, // mockMail
    {
      // emailVerification
      emitirToken: async () => "token-mock",
      verificar: async () => ({ ok: true }),
      reenviar: async () => ({ message: "ok" }),
    } as any,
  );
  return { service, prisma, mail, audit, passwordService, users };
}

function seedUser(
  users: Map<string, Record<string, unknown>>,
  email: string,
  overrides: Record<string, unknown> = {},
) {
  users.set(email, {
    id: "u-reset",
    email,
    password_hash: "old-hash",
    nome: null,
    password_reset_token: null,
    password_reset_expira: null,
    ultimo_login_em: null,
    email_verificado_em: null,
    ...overrides,
  });
}

describe("T206 — reset de senha (forgot + reset)", () => {
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
  });

  // ---------- forgotPassword ----------
  it("armazena apenas o SHA-256 do token (nunca plaintext) e entrega o raw no mail", async () => {
    seedUser(mocks.users, "user@test.com");
    await mocks.service.forgotPassword("user@test.com");

    const rawToken = mocks.mail.enviarResetSenha.mock.calls[0][1] as string;
    expect(rawToken).toBeDefined();
    const user = mocks.users.get("user@test.com");
    const armazenado = user?.password_reset_token as string;
    expect(armazenado).toBe(createHash("sha256").update(rawToken).digest("hex"));
    expect(armazenado).not.toBe(rawToken);
    expect(armazenado).toMatch(/^[0-9a-f]{64}$/);
  });

  it("token expira em 1 hora", async () => {
    seedUser(mocks.users, "user@test.com");
    const antes = Date.now();
    await mocks.service.forgotPassword("user@test.com");
    const expira = mocks.users.get("user@test.com")?.password_reset_expira as Date;
    const delta = new Date(expira).getTime() - antes;
    expect(delta).toBeGreaterThanOrEqual(3_600_000 - 5_000);
    expect(delta).toBeLessThanOrEqual(3_600_000 + 5_000);
  });

  it("email inexistente: resposta genérica e sem efeitos colaterais", async () => {
    const r = await mocks.service.forgotPassword("ninguem@test.com");
    expect(r.message).toContain("Se o email existir");
    expect(mocks.prisma.usuario.update).not.toHaveBeenCalled();
    expect(mocks.audit.log).not.toHaveBeenCalled();
    expect(mocks.mail.enviarResetSenha).not.toHaveBeenCalled();
  });

  it("registra audit PASSWORD_RESET_REQUESTED", async () => {
    seedUser(mocks.users, "user@test.com");
    await mocks.service.forgotPassword("user@test.com");
    expect(mocks.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ acao: "PASSWORD_RESET_REQUESTED" }),
    );
  });

  it("rate limit: 3 por email por hora — a 4ª solicitação lança 429", async () => {
    for (let i = 0; i < 3; i++) {
      await mocks.service.forgotPassword("limit@test.com"); // genérico (usuário não existe)
    }
    await expect(mocks.service.forgotPassword("limit@test.com")).rejects.toMatchObject({
      status: 429,
    });
    // Emails diferentes não compartilham a cota.
    await expect(mocks.service.forgotPassword("outro@test.com")).resolves.toBeDefined();
  });

  it("token nunca aparece nos logs do app (apenas hash truncado)", async () => {
    seedUser(mocks.users, "user@test.com");
    const logSpy = vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    await mocks.service.forgotPassword("user@test.com");
    const rawToken = mocks.mail.enviarResetSenha.mock.calls[0][1] as string;
    const msgs = logSpy.mock.calls.map((c) => String(c[0])).join(" ");
    expect(msgs).not.toContain(rawToken);
    logSpy.mockRestore();
  });

  // ---------- resetPassword ----------
  it("token válido: re-hasheia senha, anula token (uso único) e revoga sessões", async () => {
    const rawToken = "token-256-bits-aleatorio-para-reset-1234567890";
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    seedUser(mocks.users, "user@test.com", {
      password_reset_token: tokenHash,
      password_reset_expira: new Date(Date.now() + 3_600_000),
    });

    const r = await mocks.service.resetPassword(rawToken, "NovaSenha@123");
    expect(r.message).toContain("Senha alterada");
    expect(mocks.passwordService.hash).toHaveBeenCalledWith("NovaSenha@123");

    const user = mocks.users.get("user@test.com");
    expect(user?.password_hash).toBe("argon2id:NovaSenha@123");
    expect(user?.password_reset_token).toBeNull();
    expect(user?.password_reset_expira).toBeNull();

    // Sessões ativas do usuário revogadas (não as já revogadas).
    expect(mocks.prisma.sessao.updateMany).toHaveBeenCalledWith({
      where: { usuario_id: "u-reset", revoked_at: null },
      data: expect.objectContaining({ revoked_at: expect.any(Date) }),
    });
  });

  it("token inválido → 400", async () => {
    seedUser(mocks.users, "user@test.com");
    await expect(mocks.service.resetPassword("token-invalido", "NovaSenha@123")).rejects.toThrow(
      BadRequestException,
    );
  });

  it("token expirado → 400", async () => {
    const rawToken = "token-expirado-aleatorio-1234567890";
    seedUser(mocks.users, "user@test.com", {
      password_reset_token: createHash("sha256").update(rawToken).digest("hex"),
      password_reset_expira: new Date(Date.now() - 60_000),
    });
    await expect(mocks.service.resetPassword(rawToken, "NovaSenha@123")).rejects.toThrow(
      BadRequestException,
    );
  });

  it("uso único: segunda chamada com o mesmo token → 400", async () => {
    const rawToken = "token-uso-unico-aleatorio-1234567890";
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    seedUser(mocks.users, "user@test.com", {
      password_reset_token: tokenHash,
      password_reset_expira: new Date(Date.now() + 3_600_000),
    });
    await mocks.service.resetPassword(rawToken, "NovaSenha@123");
    // Token já anulado no banco → findFirst não encontra.
    await expect(mocks.service.resetPassword(rawToken, "OutraSenha@456")).rejects.toThrow(
      BadRequestException,
    );
  });

  it("registra audit PASSWORD_RESET_COMPLETED", async () => {
    const rawToken = "token-audit-aleatorio-1234567890";
    seedUser(mocks.users, "user@test.com", {
      password_reset_token: createHash("sha256").update(rawToken).digest("hex"),
      password_reset_expira: new Date(Date.now() + 3_600_000),
    });
    await mocks.service.resetPassword(rawToken, "NovaSenha@123");
    expect(mocks.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ acao: "PASSWORD_RESET_COMPLETED" }),
    );
  });

  it("DTO: senha nova com menos de 8 caracteres é rejeitada (mesma regra do register)", () => {
    const curta = ResetPasswordDto.safeParse({ token: "token-valido-123456", password: "curta1" });
    expect(curta.success).toBe(false);
    const valida = ResetPasswordDto.safeParse({
      token: "token-valido-123456",
      password: "NovaSenha123!",
    });
    expect(valida.success).toBe(true);
  });

  it("rate limit não afeta resetPassword (token tem expiração própria)", async () => {
    const rawToken = "token-rate-aleatorio-1234567890";
    seedUser(mocks.users, "user@test.com", {
      password_reset_token: createHash("sha256").update(rawToken).digest("hex"),
      password_reset_expira: new Date(Date.now() + 3_600_000),
    });
    await expect(mocks.service.resetPassword(rawToken, "NovaSenha@123")).resolves.toBeDefined();
  });
});
