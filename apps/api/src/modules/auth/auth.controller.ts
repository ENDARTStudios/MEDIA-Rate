import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Post,
  Req,
  Res,
  UsePipes,
  UnauthorizedException,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { AuthService, type LoginResult } from "./auth.service.js";
import { SessionService } from "./session.service.js";
import { SessionCookieService } from "./session-cookie.service.js";
import { RegisterDto, LoginDto } from "./dto/auth.dto.js";
import { ZodValidationPipe } from "../../common/zod-validation.pipe.js";
import type { AuthenticatedUser } from "../../common/guards/auth.guard.js";
import { timingSafeEqual } from "node:crypto";

/**
 * Controller de autenticação (T3.1-T3.7).
 *
 * Endpoints:
 * - POST /api/v1/auth/register — cria usuário (T3.1)
 * - POST /api/v1/auth/login    — autentica + seta cookie sessão (T3.2)
 * - GET  /api/v1/auth/me       — retorna usuário autenticado (T3.4)
 * - POST /api/v1/auth/logout   — invalida sessão + limpa cookie (T3.5/T3.6)
 */
@Controller("api/v1/auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly cookieService: SessionCookieService,
  ) {}

  @Post("register")
  @HttpCode(201)
  @UsePipes(new ZodValidationPipe(RegisterDto))
  async register(
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ): Promise<{
    id: string;
    email: string;
    nome: string | null;
    created_at: string;
  }> {
    const dto = body as { email: string; password: string; nome?: string };
    const ip = req.ip ?? undefined;
    const result = await this.authService.register(dto, { ip });
    return {
      id: result.id,
      email: result.email,
      nome: result.nome,
      created_at: result.created_at.toISOString(),
    };
  }

  @Post("login")
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(LoginDto))
  async login(
    @Body() body: unknown,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{
    usuario: { id: string; email: string; nome: string | null };
    expires_at: string;
    csrf_token: string;
  }> {
    const dto = body as { email: string; password: string };
    const userAgent = req.headers["user-agent"];
    const ip = req.ip ?? undefined;

    const result: LoginResult = await this.authService.login(dto, {
      ip,
      user_agent: typeof userAgent === "string" ? userAgent : undefined,
    });

    // T3.2: seta cookie httpOnly Secure SameSite=Lax.
    const csrf = this.cookieService.setSessionCookie(reply, result.token, result.expires_at);

    return {
      usuario: {
        id: result.usuario.id,
        email: result.usuario.email,
        nome: result.usuario.nome,
      },
      expires_at: result.expires_at.toISOString(),
      csrf_token: csrf,
    };
  }

  @Get("me")
  async me(@Req() req: FastifyRequest): Promise<{
    id: string;
    email: string;
    nome: string | null;
  }> {
    const user = (req as FastifyRequest & { user?: AuthenticatedUser }).user;
    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: "Unauthorized",
        message: "Autenticação necessária.",
      });
    }
    return {
      id: user.id,
      email: user.email,
      nome: user.nome,
    };
  }

  @Post("logout")
  @HttpCode(200)
  async logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ message: string }> {
    const user = (req as FastifyRequest & { user?: AuthenticatedUser }).user;
    if (user) {
      const cookies = (req as unknown as { cookies?: Record<string, string> }).cookies;
      const cookieToken = cookies?.csrf_token;
      const headerVal = req.headers["x-csrf-token"] as string | string[] | undefined;
      const headerToken = Array.isArray(headerVal) ? headerVal[0] : headerVal;

      if (!cookieToken || !headerToken) {
        throw new HttpException({
          statusCode: 403, error: "Forbidden", message: "CSRF token inválido.",
        }, 403);
      }
      try {
        const a = Buffer.from(headerToken, "utf-8");
        const b = Buffer.from(cookieToken, "utf-8");
        if (a.byteLength !== b.byteLength || !timingSafeEqual(a, b)) {
          throw new HttpException({
            statusCode: 403, error: "Forbidden", message: "CSRF token inválido.",
          }, 403);
        }
      } catch {
        throw new HttpException({
          statusCode: 403, error: "Forbidden", message: "CSRF token inválido.",
        }, 403);
      }
    }

    const cookieName = this.cookieService.getCookieName();
    const cookies = (req as unknown as { cookies?: Record<string, string> }).cookies;
    const token = cookies?.[cookieName];

    if (token) {
      await this.sessionService.revokeSession(token);
    }

    this.cookieService.clearSessionCookie(reply);

    if (user) {
      await this.authService.logoutAudit(user.id);
    }

    return { message: "Logout realizado com sucesso." };
  }

  @Post("forgot-password")
  @HttpCode(200)
  async forgotPassword(@Body("email") email: string): Promise<{ message: string }> {
    return this.authService.forgotPassword(email);
  }

  @Post("reset-password")
  @HttpCode(200)
  async resetPassword(
    @Body("token") token: string,
    @Body("password") password: string,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(token, password);
  }
}
