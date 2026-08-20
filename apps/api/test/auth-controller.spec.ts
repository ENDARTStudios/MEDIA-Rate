import { describe, it, expect, beforeEach } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { AuthController } from "../src/modules/auth/auth.controller.js";
import { AuthService } from "../src/modules/auth/auth.service.js";
import { SessionService } from "../src/modules/auth/session.service.js";
import { SessionCookieService } from "../src/modules/auth/session-cookie.service.js";
import { EmailVerificationService } from "../src/modules/auth/email-verification.service.js";
import { GoogleAuthService } from "../src/modules/auth/google-auth.service.js";
import { MetricsService } from "../src/modules/metrics/metrics.service.js";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";

interface MockAuthService {
  register: (
    dto: { email: string; password: string; nome?: string },
    options?: { ip?: string },
  ) => Promise<{ id: string; email: string; nome: string | null; created_at: Date }>;
  login: (
    dto: { email: string; password: string },
    options?: { ip?: string; user_agent?: string },
  ) => Promise<{
    token: string;
    expires_at: Date;
    usuario: { id: string; email: string; nome: string | null };
  }>;
  forgotPassword: (email: string) => Promise<{ message: string }>;
  resetPassword: (token: string, password: string) => Promise<{ message: string }>;
  logoutAudit: (usuarioId: string) => Promise<void>;
  getMe: (usuarioId: string) => Promise<{
    id: string;
    email: string;
    nome: string | null;
    plano: "FREE" | "PLUS" | "PREMIUM";
    status: string;
    trial_ends_at: string | null;
    watchlist_limit: number | null;
  }>;
}

interface MockSessionService {
  revokeSession: (token: string) => Promise<boolean>;
  validateToken: (token: string) => Promise<unknown>;
}

interface MockCookieService {
  getCookieName: () => string;
  getRefreshCookieName: () => string;
  clearSessionCookie: (reply: FastifyReply) => void;
  setSessionCookie: (reply: FastifyReply, token: string, expiresAt: Date) => string;
  setRefreshCookie: (reply: FastifyReply, token: string, expiresAt: Date) => void;
}

function mockReq(ip = "1.2.3.4", userAgent = "test-agent") {
  return { ip, headers: { "user-agent": userAgent } } as unknown as FastifyRequest;
}

function mockReply() {
  return {
    setCookie: () => {
      /* stub de teste */
    },
    header: () => mockReply(),
    send: () => mockReply(),
    clearCookie: () => {
      /* stub de teste */
    },
  } as unknown as FastifyReply;
}

describe("AuthController (unit)", () => {
  let controller: AuthController;
  let authService: MockAuthService;
  let sessionService: MockSessionService;
  let cookieService: MockCookieService;

  beforeEach(async () => {
    authService = {
      register: async (dto) => ({
        id: "u1",
        email: dto.email,
        nome: dto.nome ?? null,
        created_at: new Date(),
      }),
      login: async (dto) => ({
        token: "token-xyz",
        refreshToken: "refresh-xyz",
        expires_at: new Date(),
        refresh_expira_em: new Date(),
        usuario: { id: "u1", email: dto.email, nome: null },
      }),
      forgotPassword: async () => ({ message: "ok" }),
      resetPassword: async () => ({ message: "ok" }),
      logoutAudit: async () => {
        /* stub de teste */
      },
      getMe: async (id: string) => ({
        id,
        email: "u1@test.com",
        nome: "User",
        plano: "FREE",
        status: "ATIVA",
        trial_ends_at: null,
        watchlist_limit: 20,
      }),
    };
    sessionService = {
      revokeSession: async () => {
        /* stub de teste */
        return true;
      },
      validateToken: async () => null,
    };
    cookieService = {
      getCookieName: () => "sess",
      getRefreshCookieName: () => "refresh",
      clearSessionCookie: () => {
        /* stub de teste */
      },
      setSessionCookie: () => {
        /* stub de teste */
      },
      setRefreshCookie: () => {
        /* stub de teste */
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: SessionService, useValue: sessionService },
        { provide: SessionCookieService, useValue: cookieService },
        {
          provide: EmailVerificationService,
          useValue: {
            verificar: async () => ({ ok: true }),
            reenviar: async () => ({ message: "ok" }),
          },
        },
        {
          provide: MetricsService,
          useValue: {
            incrementRegister: () => {
              /* stub de teste */
            },
            incrementLogin: () => {
              /* stub de teste */
            },
            incrementLogout: () => {
              /* stub de teste */
            },
          },
        },
        {
          provide: GoogleAuthService,
          useValue: { verify: async () => ({ email: "g@test.com", nome: null }) },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it("register — retorna dados do usuário", async () => {
    const result = await controller.register(
      { email: "test@mediarate.app", password: "Senha@123", nome: "Test" },
      mockReq(),
    );
    expect(result.email).toBe("test@mediarate.app");
  });

  it("register — email duplicado propaga ConflictException", async () => {
    authService.register = async () => {
      throw new ConflictException("Email já cadastrado.");
    };
    await expect(
      controller.register({ email: "exists@mediarate.app", password: "Senha@123" }, mockReq()),
    ).rejects.toThrow(ConflictException);
  });

  it("login — retorna usuário + expires_at", async () => {
    const result = await controller.login(
      { email: "test@mediarate.app", password: "Senha@123" },
      mockReq(),
      mockReply(),
    );
    expect(result.usuario.email).toBe("test@mediarate.app");
    expect(result.expires_at).toBeDefined();
  });

  it("login — credenciais inválidas propagam", async () => {
    authService.login = async () => {
      throw new UnauthorizedException("Credenciais inválidas.");
    };
    await expect(
      controller.login({ email: "test@mediarate.app", password: "wrong" }, mockReq(), mockReply()),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("forgotPassword — retorna mensagem genérica", async () => {
    const result = await controller.forgotPassword({ email: "test@mediarate.app" });
    expect(result.message).toBe("ok");
  });

  it("resetPassword — sucesso", async () => {
    const result = await controller.resetPassword({
      token: "valid-token",
      password: "NewPass@123",
    });
    expect(result.message).toBe("ok");
  });

  it("resetPassword — token invalido propaga", async () => {
    authService.resetPassword = async () => {
      throw new UnauthorizedException("Token inválido.");
    };
    await expect(
      controller.resetPassword({ token: "bad-token", password: "NewPass@123" }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("me — retorna dados do usuario autenticado + plano (D-132)", async () => {
    const req = {
      user: { id: "u1", email: "u1@test.com", nome: "User" },
    } as unknown as FastifyRequest;
    const result = await controller.me(req);
    expect(result.id).toBe("u1");
    expect(result.email).toBe("u1@test.com");
    expect(result.plano).toBe("FREE");
    expect(result.watchlist_limit).toBe(20);
  });

  it("me — usuario nao autenticado lanca 401", async () => {
    const req = {} as unknown as FastifyRequest;
    await expect(controller.me(req)).rejects.toThrow(UnauthorizedException);
  });

  it("logout — sem cookie limpa e nao quebra", async () => {
    const req = { cookies: {} } as unknown as FastifyRequest;
    const reply = mockReply();
    const result = await controller.logout(req, reply);
    expect(result.message).toMatch(/Logout/i);
  });

  it("logout — com cookie revoga sessao", async () => {
    const csrf = "a".repeat(64);
    const req = {
      cookies: { sess: "some-token", csrf_token: csrf },
      user: { id: "u1" },
      headers: { "x-csrf-token": csrf },
    } as unknown as FastifyRequest;
    const reply = mockReply();
    let revokedToken: string | null = null;
    sessionService.revokeSession = async (t: string) => {
      revokedToken = t;
      return true;
    };

    const result = await controller.logout(req, reply);
    expect(result.message).toMatch(/Logout/i);
    expect(revokedToken).toBe("some-token");
    expect(cookieService.clearSessionCookie).toBeDefined();
  });

  it("logout — sem usuario ignora logoutAudit", async () => {
    const req = { cookies: { sess: "token" } } as unknown as FastifyRequest;
    const reply = mockReply();
    let audited = false;
    authService.logoutAudit = async () => {
      audited = true;
    };

    await controller.logout(req, reply);
    expect(audited).toBe(false);
  });
});
