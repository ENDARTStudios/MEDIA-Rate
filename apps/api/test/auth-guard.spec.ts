import { describe, it, expect, beforeEach } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { AuthGuard } from "../src/common/guards/auth.guard.js";
import { SessionService } from "../src/modules/auth/session.service.js";
import { Reflector } from "@nestjs/core";
import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";

function mockContext(opts: { hasCookie?: boolean; validToken?: boolean; url: string }) {
  const cookies: Record<string, string> = {};
  if (opts.hasCookie) cookies.sess = "test-token";
  const request = { cookies, url: opts.url } as any;
  const http = { getRequest: () => request };

  return {
    context: {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => http,
    } as unknown as ExecutionContext,
    request,
  };
}

describe("AuthGuard (unit)", () => {
  let guard: AuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: SessionService, useValue: { validateToken: async () => null } },
        { provide: Reflector, useValue: { getAllAndOverride: () => undefined } },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
  });

  it("sem cookie em rota protegida — lança 401", async () => {
    const { context } = mockContext({ hasCookie: false, url: "/api/v1/admin/stats" });
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it("cookie válido — retorna true e anexa request.user", async () => {
    const { context, request } = mockContext({
      hasCookie: true,
      validToken: true,
      url: "/api/v1/admin/stats",
    });
    const mockSession = {
      validateToken: async () => ({
        sessao: { id: "s1", usuario_id: "u1", expires_at: new Date() },
        usuario: { id: "u1", email: "test@mediarate.app", nome: null },
      }),
    };
    const testModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: SessionService, useValue: mockSession },
        { provide: Reflector, useValue: { getAllAndOverride: () => undefined } },
      ],
    }).compile();
    const customGuard = testModule.get<AuthGuard>(AuthGuard);
    const result = await customGuard.canActivate(context);
    expect(result).toBe(true);
    expect(request.user?.email).toBe("test@mediarate.app");
  });

  it("cookie inválido em rota protegida — lança 401", async () => {
    const { context } = mockContext({ hasCookie: true, url: "/api/v1/admin/stats" });
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it("rota pública /login — retorna true mesmo sem cookie", async () => {
    const { context } = mockContext({ hasCookie: false, url: "/api/v1/auth/login" });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it("/health — retorna true", async () => {
    const { context } = mockContext({ hasCookie: false, url: "/health" });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it("/api/v1/echo (rota pública) — retorna true", async () => {
    const { context } = mockContext({ hasCookie: false, url: "/api/v1/echo" });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
