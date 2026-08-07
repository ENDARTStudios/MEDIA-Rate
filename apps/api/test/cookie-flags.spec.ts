/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SessionCookieService } from "../src/modules/auth/session-cookie.service.js";
import type { FastifyReply } from "fastify";

describe("SessionCookieService (T3.2 + T049)", () => {
  let svc: SessionCookieService;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    svc = new SessionCookieService();
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  function createMockReply(): {
    reply: FastifyReply;
    setCookie: ReturnType<typeof vi.fn>;
    clearCookie: ReturnType<typeof vi.fn>;
  } {
    const setCookie = vi.fn();
    const clearCookie = vi.fn();
    const reply = { setCookie, clearCookie } as unknown as FastifyReply;
    return { reply, setCookie, clearCookie };
  }

  describe("setSessionCookie()", () => {
    it("em dev: httpOnly=true, secure=false, sameSite=lax (sess + csrf)", () => {
      process.env.NODE_ENV = "test";
      const { reply, setCookie } = createMockReply();
      const expires = new Date(Date.now() + 3600 * 1000);

      const csrf = svc.setSessionCookie(reply, "token-opaco", expires);

      expect(setCookie).toHaveBeenCalledTimes(2);

      // Cookie sess
      const [sessName, sessVal, sessOpts] = setCookie.mock.calls[0]!;
      expect(sessName).toBe("sess");
      expect(sessVal).toBe("token-opaco");
      expect(sessOpts.httpOnly).toBe(true);
      expect(sessOpts.secure).toBe(false);
      expect(sessOpts.sameSite).toBe("lax");
      expect(sessOpts.path).toBe("/");
      expect(sessOpts.expires).toBe(expires);

      // Cookie csrf_token
      const [csrfName, csrfVal, csrfOpts] = setCookie.mock.calls[1]!;
      expect(csrfName).toBe("csrf_token");
      expect(csrfVal).toBe(csrf);
      expect(csrfOpts.httpOnly).toBe(false); // T049: JS do frontend precisa ler
      expect(csrfOpts.secure).toBe(false);
      expect(csrfOpts.sameSite).toBe("lax");
      expect(csrfOpts.path).toBe("/");

      // csrf_token é hex de 64 chars (32 bytes random)
      expect(csrf).toHaveLength(64);
      expect(csrf).toMatch(/^[a-f0-9]{64}$/);
    });

    it("em prod: httpOnly=true, secure=true, sameSite=Lax (sess + csrf)", () => {
      process.env.NODE_ENV = "production";
      const { reply, setCookie } = createMockReply();
      const expires = new Date(Date.now() + 3600 * 1000);

      svc.setSessionCookie(reply, "token-opaco", expires);

      expect(setCookie).toHaveBeenCalledTimes(2);

      // sess
      const [, , sessOpts] = setCookie.mock.calls[0]!;
      expect(sessOpts.secure).toBe(true);
      expect(sessOpts.httpOnly).toBe(true);
      expect(sessOpts.sameSite).toBe("lax");

      // csrf_token
      const [, , csrfOpts] = setCookie.mock.calls[1]!;
      expect(csrfOpts.secure).toBe(true);
      expect(csrfOpts.httpOnly).toBe(false);
      expect(csrfOpts.sameSite).toBe("lax");
    });
  });

  describe("clearSessionCookie()", () => {
    it("limpa sess + refresh + csrf_token com mesmas flags (T212)", () => {
      process.env.NODE_ENV = "test";
      const { reply, clearCookie } = createMockReply();

      svc.clearSessionCookie(reply);

      expect(clearCookie).toHaveBeenCalledTimes(3);

      const [sessName, sessOpts] = clearCookie.mock.calls[0]!;
      expect(sessName).toBe("sess");
      expect(sessOpts.httpOnly).toBe(true);
      expect(sessOpts.sameSite).toBe("lax");
      expect(sessOpts.path).toBe("/");

      const [refreshName, refreshOpts] = clearCookie.mock.calls[1]!;
      expect(refreshName).toBe("refresh");
      expect(refreshOpts.httpOnly).toBe(true);
      expect(refreshOpts.sameSite).toBe("lax");
      expect(refreshOpts.path).toBe("/api/v1/auth/refresh");

      const [csrfName, csrfOpts] = clearCookie.mock.calls[2]!;
      expect(csrfName).toBe("csrf_token");
      expect(csrfOpts.path).toBe("/");
    });
  });

  describe("getCookieName()", () => {
    it("retorna 'sess'", () => {
      expect(svc.getCookieName()).toBe("sess");
    });
  });
});
