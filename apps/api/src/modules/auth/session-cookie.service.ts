import { Injectable } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { randomBytes } from "node:crypto";
import "@fastify/cookie";

const COOKIE_NAME = "sess";
const REFRESH_COOKIE_NAME = "refresh";
const CSRF_COOKIE_NAME = "csrf_token";

@Injectable()
export class SessionCookieService {
  private isProd() {
    return process.env.NODE_ENV === "production";
  }

  setSessionCookie(reply: FastifyReply, token: string, expiresAt: Date): string {
    const isProd = this.isProd();
    const ttlSegundos = Math.max(1, Math.round((expiresAt.getTime() - Date.now()) / 1000));
    void reply.setCookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
      // T316: Max-Age explícito = TTL server-side (7 dias) — o cookie persiste
      // no browser e fechar o navegador NÃO desloga mais.
      maxAge: ttlSegundos,
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

  /** T212: refresh token rotativo em cookie httpOnly separado (30 dias). */
  setRefreshCookie(reply: FastifyReply, token: string, expiresAt: Date): void {
    const isProd = this.isProd();
    void reply.setCookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/api/v1/auth/refresh", // só envia no refresh (menor superfície)
      expires: expiresAt,
    });
  }

  /**
   * T316: renovação sliding — re-seta SÓ o cookie 'sess' (com o novo TTL),
   * sem rotacionar o CSRF (o front guarda o csrf em sessionStorage; rotacionar
   * aqui quebraria a CSRF até o próximo login).
   */
  renovarSessionCookie(reply: FastifyReply, token: string, expiresAt: Date): void {
    const isProd = this.isProd();
    const ttlSegundos = Math.max(1, Math.round((expiresAt.getTime() - Date.now()) / 1000));
    void reply.setCookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
      maxAge: ttlSegundos,
    });
  }

  clearSessionCookie(reply: FastifyReply): void {
    const isProd = this.isProd();
    void reply.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
    });
    void reply.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/api/v1/auth/refresh",
    });
    void reply.clearCookie(CSRF_COOKIE_NAME, {
      path: "/",
    });
  }

  getCookieName(): string {
    return COOKIE_NAME;
  }

  getRefreshCookieName(): string {
    return REFRESH_COOKIE_NAME;
  }
}
