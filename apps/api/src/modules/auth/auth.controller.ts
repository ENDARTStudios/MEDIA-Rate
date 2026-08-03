import {
  BadRequestException,
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
import { FastifyReply, FastifyRequest } from "fastify";
import { AuthService, type LoginResult, type MeResult } from "./auth.service.js";
import { SessionService } from "./session.service.js";
import { SessionCookieService } from "./session-cookie.service.js";
import { MetricsService } from "../metrics/metrics.service.js";
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from "./dto/auth.dto.js";
import { validInvites } from "../invite/invite.controller.js";
import { ZodValidationPipe } from "../../common/zod-validation.pipe.js";
import { AuthenticatedUser } from "../../common/guards/auth.guard.js";
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
    private readonly metrics: MetricsService,
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
    const dto = body as { email: string; password: string; nome?: string; inviteCode?: string };
    const ip = req.ip ?? undefined;

    if (dto.inviteCode) {
      if (!validInvites.has(dto.inviteCode)) {
        throw new BadRequestException({
          statusCode: 400,
          error: "Bad Request",
          message: "Código de convite inválido ou expirado.",
        });
      }
    }

    this.metrics.incrementRegister();
    const result = await this.authService.register(dto, { ip });

    if (dto.inviteCode) {
      validInvites.delete(dto.inviteCode);
    }

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

    this.metrics.incrementLogin();
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
  async me(@Req() req: FastifyRequest): Promise<MeResult> {
    const user = (req as FastifyRequest & { user?: AuthenticatedUser }).user;
    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: "Unauthorized",
        message: "Autenticação necessária.",
      });
    }
    return this.authService.getMe(user.id);
  }

  @Post("logout")
  @HttpCode(200)
  async logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ message: string }> {
    const user = (req as FastifyRequest & { user?: AuthenticatedUser }).user;
    if (user) {
      this.metrics.incrementLogout();
      const cookies = (req as unknown as { cookies?: Record<string, string> }).cookies;
      const cookieToken = cookies?.csrf_token;
      const headerVal = req.headers["x-csrf-token"] as string | string[] | undefined;
      const headerToken = Array.isArray(headerVal) ? headerVal[0] : headerVal;

      if (!cookieToken || !headerToken) {
        throw new HttpException(
          {
            statusCode: 403,
            error: "Forbidden",
            message: "CSRF token inválido.",
          },
          403,
        );
      }
      try {
        const a = Buffer.from(headerToken, "utf-8");
        const b = Buffer.from(cookieToken, "utf-8");
        if (a.byteLength !== b.byteLength || !timingSafeEqual(a, b)) {
          throw new HttpException(
            {
              statusCode: 403,
              error: "Forbidden",
              message: "CSRF token inválido.",
            },
            403,
          );
        }
      } catch {
        throw new HttpException(
          {
            statusCode: 403,
            error: "Forbidden",
            message: "CSRF token inválido.",
          },
          403,
        );
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
  @UsePipes(new ZodValidationPipe(ForgotPasswordDto))
  async forgotPassword(@Body() body: unknown): Promise<{ message: string }> {
    return this.authService.forgotPassword((body as { email: string }).email);
  }

  @Post("reset-password")
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(ResetPasswordDto))
  async resetPassword(@Body() body: unknown): Promise<{ message: string }> {
    const dto = body as { token: string; password: string };
    return this.authService.resetPassword(dto.token, dto.password);
  }
}
