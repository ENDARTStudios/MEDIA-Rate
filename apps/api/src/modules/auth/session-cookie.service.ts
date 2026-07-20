import { Injectable } from "@nestjs/common";
import type { FastifyReply } from "fastify";

/**
 * Configuração de cookie de sessão (T3.2).
 *
 * - httpOnly: true (JavaScript não acessa — proteção XSS).
 * - secure: true em produção (só HTTPS), false em dev (localhost HTTP).
 * - sameSite: 'lax' (DECIDE-01 — permite callback Stripe e deep links).
 * - path: '/' (cookie válido para todo o domínio).
 * - signed: false (token opaco já tem 256 bits de entropia + hash no banco).
 *
 * Nome do cookie: 'sess' (curto para reduzir overhead por request).
 */
const COOKIE_NAME = "sess";

/**
 * Serviço para gerenciar cookie de sessão opaca (T3.2).
 */
@Injectable()
export class SessionCookieService {
  /**
   * Seta cookie de sessão na resposta.
   */
  setSessionCookie(reply: FastifyReply, token: string, expiresAt: Date): void {
    const isProduction = process.env.NODE_ENV === "production";
    void reply.setCookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax", // DECIDE-01
      path: "/",
      expires: expiresAt,
    });
  }

  /**
   * Limpa cookie de sessão (logout).
   */
  clearSessionCookie(reply: FastifyReply): void {
    void reply.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }

  /**
   * Nome do cookie (exposto para leitura no controller).
   */
  getCookieName(): string {
    return COOKIE_NAME;
  }
}
