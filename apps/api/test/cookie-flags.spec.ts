/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SessionCookieService } from "../src/modules/auth/session-cookie.service.js";
import type { FastifyReply } from "fastify";

describe("SessionCookieService (T3.2)", () => {
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
    it("em dev: httpOnly=true, secure=false, sameSite=lax", () => {
      process.env.NODE_ENV = "test";
      const { reply, setCookie } = createMockReply();
      const expires = new Date(Date.now() + 3600 * 1000);

      svc.setSessionCookie(reply, "token-opaco", expires);

      expect(setCookie).toHaveBeenCalledOnce();
      const [name, value, opts] = setCookie.mock.calls[0]!;
      expect(name).toBe("sess");
      expect(value).toBe("token-opaco");
      expect(opts.httpOnly).toBe(true);
      expect(opts.secure).toBe(false); // dev
      expect(opts.sameSite).toBe("lax");
      expect(opts.path).toBe("/");
      expect(opts.expires).toBe(expires);
    });

    it("em prod: httpOnly=true, secure=true, sameSite=lax", () => {
      process.env.NODE_ENV = "production";
      const { reply, setCookie } = createMockReply();
      const expires = new Date(Date.now() + 3600 * 1000);

      svc.setSessionCookie(reply, "token-opaco", expires);

      const [, , opts] = setCookie.mock.calls[0]!;
      expect(opts.secure).toBe(true); // prod
      expect(opts.httpOnly).toBe(true);
      expect(opts.sameSite).toBe("lax");
    });
  });

  describe("clearSessionCookie()", () => {
    it("limpa cookie com mesmas flags (httpOnly, secure, sameSite, path)", () => {
      process.env.NODE_ENV = "test";
      const { reply, clearCookie } = createMockReply();

      svc.clearSessionCookie(reply);

      expect(clearCookie).toHaveBeenCalledOnce();
      const [name, opts] = clearCookie.mock.calls[0]!;
      expect(name).toBe("sess");
      expect(opts.httpOnly).toBe(true);
      expect(opts.sameSite).toBe("lax");
      expect(opts.path).toBe("/");
    });
  });

  describe("getCookieName()", () => {
    it("retorna 'sess'", () => {
      expect(svc.getCookieName()).toBe("sess");
    });
  });
});
