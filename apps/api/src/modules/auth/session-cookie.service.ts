import { Injectable } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { randomBytes } from "node:crypto";
import "@fastify/cookie";

const COOKIE_NAME = "sess";
const CSRF_COOKIE_NAME = "csrf_token";

@Injectable()
export class SessionCookieService {
  private isProd() {
    return process.env.NODE_ENV === "production";
  }

  setSessionCookie(reply: FastifyReply, token: string, expiresAt: Date): string {
    const isProd = this.isProd();
    void reply.setCookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    // T049: CSRF double-submit cookie — não-httpOnly para o JS do frontend ler.
    const csrf = randomBytes(32).toString("hex");
    void reply.setCookie(CSRF_COOKIE_NAME, csrf, {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      path: "/",
    });

    return csrf;
  }

  clearSessionCookie(reply: FastifyReply): void {
    const isProd = this.isProd();
    void reply.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
    });
    void reply.clearCookie(CSRF_COOKIE_NAME, {
      path: "/",
    });
  }

  getCookieName(): string {
    return COOKIE_NAME;
  }
}
