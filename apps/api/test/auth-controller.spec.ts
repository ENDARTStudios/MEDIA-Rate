import { describe, it, expect, beforeEach } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { AuthController } from "../src/modules/auth/auth.controller.js";
import { AuthService } from "../src/modules/auth/auth.service.js";
import { SessionService } from "../src/modules/auth/session.service.js";
import { SessionCookieService } from "../src/modules/auth/session-cookie.service.js";
import { ConflictException, UnauthorizedException, HttpException } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";

function mockReq(ip = "1.2.3.4", userAgent = "test-agent") {
  return { ip, headers: { "user-agent": userAgent } } as unknown as FastifyRequest;
}

function mockReply() {
  return {
    setCookie: () => {},
    header: () => mockReply(),
    send: () => mockReply(),
    clearCookie: () => {},
  } as unknown as FastifyReply;
}

describe("AuthController (unit)", () => {
  let controller: AuthController;
  let authService: any;
  let sessionService: any;
  let cookieService: any;

  beforeEach(async () => {
    authService = {
      register: async (dto: any) => ({ id: "u1", email: dto.email, nome: dto.nome ?? null, created_at: new Date() }),
      login: async (dto: any) => ({ token: "token-xyz", expires_at: new Date(), usuario: { id: "u1", email: dto.email, nome: null } }),
      forgotPassword: async () => ({ message: "ok" }),
      resetPassword: async () => ({ message: "ok" }),
      logoutAudit: async () => {},
    };
    sessionService = { revokeSession: async () => {}, validateToken: async () => null };
    cookieService = { getCookieName: () => "sess", clearSessionCookie: () => {}, setSessionCookie: () => {} };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: SessionService, useValue: sessionService },
        { provide: SessionCookieService, useValue: cookieService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it("register — retorna dados do usuário", async () => {
    const result = await controller.register(
      { email: "test@mediarate.app", password: "Senha@123", nome: "Test" },
      mockReq()
    );
    expect(result.email).toBe("test@mediarate.app");
  });

  it("register — email duplicado propaga ConflictException", async () => {
    authService.register = async () => { throw new ConflictException("Email já cadastrado."); };
    await expect(
      controller.register({ email: "exists@mediarate.app", password: "Senha@123" }, mockReq())
    ).rejects.toThrow(ConflictException);
  });

  it("login — retorna usuário + expires_at", async () => {
    const result = await controller.login(
      { email: "test@mediarate.app", password: "Senha@123" },
      mockReq(),
      mockReply()
    );
    expect(result.usuario.email).toBe("test@mediarate.app");
    expect(result.expires_at).toBeDefined();
  });

  it("login — credenciais inválidas propagam", async () => {
    authService.login = async () => { throw new UnauthorizedException("Credenciais inválidas."); };
    await expect(
      controller.login({ email: "test@mediarate.app", password: "wrong" }, mockReq(), mockReply())
    ).rejects.toThrow(UnauthorizedException);
  });

  it("forgotPassword — retorna mensagem genérica", async () => {
    const result = await controller.forgotPassword("test@mediarate.app");
    expect(result.message).toBe("ok");
  });

  it("resetPassword — sucesso", async () => {
    const result = await controller.resetPassword("valid-token", "NewPass@123");
    expect(result.message).toBe("ok");
  });

  it("resetPassword — token invalido propaga", async () => {
    authService.resetPassword = async () => { throw new UnauthorizedException("Token inválido."); };
    await expect(controller.resetPassword("bad-token", "NewPass@123")).rejects.toThrow(UnauthorizedException);
  });

  it("me — retorna dados do usuario autenticado", async () => {
    const req = { user: { id: "u1", email: "u1@test.com", nome: "User" } } as any;
    const result = await controller.me(req);
    expect(result.id).toBe("u1");
    expect(result.email).toBe("u1@test.com");
  });

  it("me — usuario nao autenticado lanca 401", async () => {
    const req = {} as any;
    await expect(controller.me(req)).rejects.toThrow(UnauthorizedException);
  });

  it("logout — sem cookie limpa e nao quebra", async () => {
    const req = { cookies: {} } as any;
    const reply = mockReply();
    const result = await controller.logout(req, reply);
    expect(result.message).toMatch(/Logout/i);
  });

  it("logout — com cookie revoga sessao", async () => {
    const csrf = "a".repeat(64);
    const req = { cookies: { sess: "some-token", csrf_token: csrf }, user: { id: "u1" }, headers: { "x-csrf-token": csrf } } as any;
    const reply = mockReply();
    let revokedToken: string | null = null;
    sessionService.revokeSession = async (t: string) => { revokedToken = t; return true; };

    const result = await controller.logout(req, reply);
    expect(result.message).toMatch(/Logout/i);
    expect(revokedToken).toBe("some-token");
    expect(cookieService.clearSessionCookie).toBeDefined();
  });

  it("logout — sem usuario ignora logoutAudit", async () => {
    const req = { cookies: { sess: "token" } } as any;
    const reply = mockReply();
    let audited = false;
    authService.logoutAudit = async () => { audited = true; };

    await controller.logout(req, reply);
    expect(audited).toBe(false);
  });
});
