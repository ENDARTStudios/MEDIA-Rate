/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import cookie from "@fastify/cookie";
import { SessionCookieService } from "../src/modules/auth/session-cookie.service.js";
import { SessionService, SESSION_TTL_MS } from "../src/modules/auth/session.service.js";
import { AuthGuard } from "../src/common/guards/auth.guard.js";

const TTL_DIAS = 7 * 24 * 60 * 60 * 1000;

@Controller("t316")
class T316Controller {
  constructor(private readonly cookies: SessionCookieService) {}

  @Get("session")
  set(@Req() _req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    this.cookies.setSessionCookie(reply, "token-abc", new Date(Date.now() + SESSION_TTL_MS));
    return { ok: true };
  }

  @Get("logout")
  logout(@Res({ passthrough: true }) reply: FastifyReply) {
    this.cookies.clearSessionCookie(reply);
    return { ok: true };
  }
}

@Controller("t316-protected")
@UseGuards(AuthGuard)
class T316ProtectedController {
  @Get()
  ok() {
    return { protegido: true };
  }
}

describe("T316 — duração de sessão (7 dias + sliding renewal + logout)", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [T316Controller, T316ProtectedController],
      providers: [
        SessionCookieService,
        AuthGuard, // guard REAL — valida com o SessionService mockado (renovada)
        {
          provide: SessionService,
          useValue: {
            validateToken: async () => ({
              sessao: { id: "s1", usuario_id: "u1", expires_at: new Date(Date.now() + TTL_DIAS) },
              usuario: { id: "u1", email: "u@mediarate.app", nome: null },
              renovada: true,
            }),
          },
        },
      ],
    }).compile();
    const adapter = new FastifyAdapter({ logger: false });
    await adapter.register(cookie as any, { secret: "test-secret", hook: "onRequest" });
    app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);
    await app.init();
    await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("login: Set-Cookie 'sess' com Max-Age ≈ 604800 (7 dias)", async () => {
    const res = await request(app.getHttpServer()).get("/t316/session");
    const setCookies: string[] = res.headers["set-cookie"] ?? [];
    const sess = setCookies.find((c) => c.startsWith("sess="));
    expect(sess).toBeTruthy();
    const maxAge = sess?.match(/Max-Age=(\d+)/)?.[1];
    expect(Number(maxAge)).toBeGreaterThan(604780);
    expect(Number(maxAge)).toBeLessThanOrEqual(604800);
    // httpOnly/Secure/SameSite mantidos.
    expect(sess).toContain("HttpOnly");
    expect(sess).toContain("SameSite=Lax");
    expect(sess).toContain("Expires=");
  });

  it("rota protegida com sessão renovada re-seta o cookie 'sess' (sliding)", async () => {
    const res = await request(app.getHttpServer())
      .get("/t316-protected")
      .set("Cookie", "sess=token-abc");
    expect(res.status).toBe(200);
    const setCookies: string[] = res.headers["set-cookie"] ?? [];
    const sess = setCookies.find((c) => c.startsWith("sess="));
    expect(sess).toBeTruthy();
    expect(sess).toContain("sess=token-abc");
    expect(sess).toMatch(/Max-Age=\d{6}/);
  });

  it("logout: cookie 'sess' limpo", async () => {
    const res = await request(app.getHttpServer()).get("/t316/logout");
    const setCookies: string[] = res.headers["set-cookie"] ?? [];
    const sess = setCookies.find((c) => c.startsWith("sess="));
    expect(sess).toBeTruthy();
    expect(sess).toContain("sess=;");
  });

  it("SESSION_TTL_MS é 7 dias (604800000 ms)", () => {
    expect(SESSION_TTL_MS).toBe(604_800_000);
  });
});

describe("T316 — sliding renewal (validateToken com prisma mockado)", () => {
  const token = "abc";
  const tokenHash = "sha";
  function makeSessionService(expiresAt: Date) {
    const update = vi.fn(async (_: any) => ({}));
    const prisma = {
      sessao: {
        findUnique: async () => ({
          id: "s1",
          usuario_id: "u1",
          token_hash: tokenHash,
          revoked_at: null,
          expires_at: expiresAt,
          usuario: { id: "u1", email: "u@mediarate.app", nome: null },
        }),
        update,
      },
    } as any;
    const svc = new (SessionService as any)(prisma);
    return { svc, update };
  }

  it("sessão envelhecida (< 50% do TTL) renova e sinaliza renovada", async () => {
    const aged = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 dias restantes < 3,5
    const { svc, update } = makeSessionService(aged);
    const result = await svc.validateToken(token);
    expect(result).not.toBeNull();
    const r = result as { renovada: boolean; sessao: { expires_at: Date } };
    expect(r.renovada).toBe(true);
    expect(update).toHaveBeenCalledTimes(1);
    // Novo expiry ≈ +7 dias a partir de agora.
    const novoExpiry = r.sessao.expires_at.getTime();
    expect(novoExpiry).toBeGreaterThan(Date.now() + 6 * 24 * 60 * 60 * 1000);
  });

  it("sessão fresca (>= 50% do TTL) não renova (zero writes)", async () => {
    const fresh = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000); // 6 dias restantes > 3,5
    const { svc, update } = makeSessionService(fresh);
    const result = await svc.validateToken(token);
    const r = result as { renovada: boolean };
    expect(r.renovada).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("sessão expirada → null", async () => {
    const expired = new Date(Date.now() - 60 * 1000);
    const { svc } = makeSessionService(expired);
    expect(await svc.validateToken(token)).toBeNull();
  });
});
