import { describe, it, expect, beforeEach } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { AuthController } from "../src/modules/auth/auth.controller.js";
import { AuthService } from "../src/modules/auth/auth.service.js";
import { SessionService } from "../src/modules/auth/session.service.js";
import { SessionCookieService } from "../src/modules/auth/session-cookie.service.js";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";

function mockReq(ip = "1.2.3.4", userAgent = "test-agent") {
  return { ip, headers: { "user-agent": userAgent } } as unknown as FastifyRequest;
}

function mockReply() {
  return { setCookie: () => {}, header: () => mockReply(), send: () => mockReply() } as unknown as FastifyReply;
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
    sessionService = { revokeSession: async () => {} };
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

  it("resetPassword — token inválido propaga", async () => {
    authService.resetPassword = async () => { throw new UnauthorizedException("Token inválido."); };
    await expect(controller.resetPassword("bad-token", "NewPass@123")).rejects.toThrow(UnauthorizedException);
  });
});
