import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Post,
  Query,
  Req,
  Res,
  UsePipes,
  UnauthorizedException,
} from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { AuthService, type LoginResult, type MeResult } from "./auth.service.js";
import { SessionService } from "./session.service.js";
import { SessionCookieService } from "./session-cookie.service.js";
import { EmailVerificationService } from "./email-verification.service.js";
import { GoogleAuthService } from "./google-auth.service.js";
import { MetricsService } from "../metrics/metrics.service.js";
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from "./dto/auth.dto.js";
import { resendVerificationSchema } from "./dto/resend-verification.dto.js";
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
    private readonly emailVerification: EmailVerificationService,
    private readonly googleAuth: GoogleAuthService,
  ) {}

  /**
   * T214 — GET /verify-email?token= : público. Resposta SEMPRE genérica
   * (200) — não revela se o token é válido ou se o email existe.
   */
  @Get("verify-email")
  @HttpCode(200)
  async verifyEmail(
    @Query() query: { token?: string },
    @Req() req: FastifyRequest,
  ): Promise<{ message: string; ok: boolean }> {
    const userAgent = req?.headers?.["user-agent"];
    const resultado = await this.emailVerification.verificar(query.token ?? "", {
      ip: req?.ip ?? undefined,
      user_agent: typeof userAgent === "string" ? userAgent : undefined,
    });
    // T376: `ok` permite a página /verificar-email distinguir sucesso/erro.
    // A mensagem segue genérica (sem revelar existência de email) e o status
    // é sempre 200 — o token (single-use, 256-bit) é o segredo, não o email.
    return { message: "Email verificado com sucesso.", ok: resultado.ok };
  }

  /**
   * T214 — POST /resend-verification : público; rate limit 3/h por email
   * (service, janela deslizante). Respostas genéricas (sem enumeração).
   */
  @Post("resend-verification")
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(resendVerificationSchema))
  async resendVerification(
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ): Promise<{ message: string }> {
    const userAgent = req?.headers?.["user-agent"];
    const { email, locale } = body as { email: string; locale?: string };
    return this.emailVerification.reenviar(email, {
      ip: req?.ip ?? undefined,
      user_agent: typeof userAgent === "string" ? userAgent : undefined,
      locale,
    });
  }

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
    const dto = body as {
      email: string;
      password: string;
      nome?: string;
      inviteCode?: string;
      aceitouTermos?: boolean;
      locale?: "pt-BR" | "en-US" | "es-ES";
    };
    const ip = req.ip ?? undefined;
    const userAgent = req.headers["user-agent"];

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
    const result = await this.authService.register(dto, {
      ip,
      user_agent: typeof userAgent === "string" ? userAgent : undefined,
    });

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
    // T212: refresh token rotativo em cookie httpOnly (path do /refresh).
    this.cookieService.setRefreshCookie(reply, result.refreshToken, result.refresh_expira_em);

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

  /**
   * T361 — POST /auth/google/callback: login social Google.
   * Recebe o ID token (credential) do Google Identity Services, valida
   * server-side (GoogleAuthService) e cria/recupera a conta + sessão.
   */
  @Post("google/callback")
  @HttpCode(200)
  async googleCallback(
    @Body() body: unknown,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{
    usuario: { id: string; email: string; nome: string | null };
    expires_at: string;
    csrf_token: string;
    is_new_user: boolean;
  }> {
    const { credential } = body as { credential?: string };
    if (!credential) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: "Unauthorized",
        message: "Credencial ausente.",
      });
    }

    const profile = await this.googleAuth.verify(credential);
    const userAgent = req.headers["user-agent"];
    const result = await this.authService.googleLogin(profile.email, profile.nome, {
      ip: req.ip ?? undefined,
      user_agent: typeof userAgent === "string" ? userAgent : undefined,
    });

    const csrf = this.cookieService.setSessionCookie(reply, result.token, result.expires_at);
    this.cookieService.setRefreshCookie(reply, result.refreshToken, result.refresh_expira_em);

    return {
      usuario: {
        id: result.usuario.id,
        email: result.usuario.email,
        nome: result.usuario.nome,
      },
      expires_at: result.expires_at.toISOString(),
      csrf_token: csrf,
      is_new_user: result.isNewUser === true,
    };
  }

  /**
   * T212 — POST /auth/refresh: público (sem AuthGuard), exige cookie
   * 'refresh' válido; rotaciona o par (reuso detectado revoga tudo).
   * Rate limit: 10 req/min por IP (onRoute).
   */
  @Post("refresh")
  @HttpCode(200)
  async refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ ok: boolean }> {
    const cookies = (req as unknown as { cookies?: Record<string, string> }).cookies;
    const refreshToken = cookies?.[this.cookieService.getRefreshCookieName()];
    if (!refreshToken) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: "Unauthorized",
        message: "Sessão expirada.",
      });
    }
    const userAgent = req.headers["user-agent"];
    const result = await this.authService.refresh(refreshToken, {
      ip: req.ip ?? undefined,
      user_agent: typeof userAgent === "string" ? userAgent : undefined,
    });
    this.cookieService.setSessionCookie(reply, result.token, result.expires_at);
    this.cookieService.setRefreshCookie(reply, result.refreshToken, result.refresh_expira_em);
    return { ok: true };
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
      const userAgent = req.headers["user-agent"];
      await this.authService.logoutAudit(
        user.id,
        req.ip ?? undefined,
        typeof userAgent === "string" ? userAgent : undefined,
      );
    }

    return { message: "Logout realizado com sucesso." };
  }

  @Post("forgot-password")
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(ForgotPasswordDto))
  async forgotPassword(
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ): Promise<{ message: string }> {
    const userAgent = req?.headers?.["user-agent"];
    return this.authService.forgotPassword((body as { email: string }).email, {
      ip: req?.ip ?? undefined,
      user_agent: typeof userAgent === "string" ? userAgent : undefined,
    });
  }

  @Post("reset-password")
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(ResetPasswordDto))
  async resetPassword(
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ): Promise<{ message: string }> {
    const dto = body as { token: string; password: string };
    const userAgent = req?.headers?.["user-agent"];
    return this.authService.resetPassword(dto.token, dto.password, {
      ip: req?.ip ?? undefined,
      user_agent: typeof userAgent === "string" ? userAgent : undefined,
    });
  }
}
