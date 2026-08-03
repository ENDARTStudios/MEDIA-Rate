import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { randomBytes, createHash } from "crypto";
import { PrismaService } from "../../prisma/prisma.service.js";
import { PasswordService } from "../../common/password.service.js";
import { SessionService, type SessionCreationResult } from "./session.service.js";
import { LockoutService } from "./lockout.service.js";
import { AnalyticsService, AnalyticsEvents } from "../../common/analytics.service.js";
import { AuditLogService } from "../../common/audit-log.service.js";
import { RegisterDtoType, type LoginDtoType } from "./dto/auth.dto.js";
import { FREE_WATCHLIST_LIMIT } from "../watchlist/watchlist.service.js";

/**
 * Resultado de registro. Nunca expõe password_hash.
 */
export interface RegisterResult {
  id: string;
  email: string;
  nome: string | null;
  created_at: Date;
}

/**
 * Resultado de login. Token opaco para setar no cookie.
 */
export interface LoginResult {
  token: string;
  expires_at: Date;
  usuario: {
    id: string;
    email: string;
    nome: string | null;
  };
}

/**
 * Resultado de GET /auth/me — usuário + plano/entitlements (D-132).
 */
export interface MeResult {
  id: string;
  email: string;
  nome: string | null;
  plano: "FREE" | "PLUS" | "PREMIUM";
  status: string;
  trial_ends_at: string | null;
  watchlist_limit: number | null;
}

/**
 * AuthService (T3.1 + T3.2).
 *
 * - register(): cria Usuario + UsuarioPlano (FREE default) + Papel USER.
 *   Hasheia senha com argon2id (PasswordService T2.5).
 * - login(): valida credenciais, aplica lockout (T3.3), cria sessão (T3.1).
 *
 * Segurança:
 * - Mensagens de erro genéricas para não revelar se email existe
 *   ("Credenciais inválidas" em vez de "email não encontrado").
 * - Lockout antes da verificação de senha (evita timing attack).
 * - Analytics de registro/login para T1.9 (sem PII em properties).
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly sessionService: SessionService,
    private readonly lockoutService: LockoutService,
    private readonly analytics: AnalyticsService,
    private readonly auditLog: AuditLogService,
  ) {}

  async register(dto: RegisterDtoType, _options: { ip?: string } = {}): Promise<RegisterResult> {
    // Verifica email único antes de hash (evita hash desnecessário).
    const existing = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        error: "Conflict",
        message: "Email já cadastrado.",
      });
    }

    const password_hash = await this.passwordService.hash(dto.password);

    // Transação: cria Usuario + UsuarioPlano (FREE) + UsuarioPapel (USER).
    const usuario = await this.prisma.$transaction(async (tx) => {
      const user = await tx.usuario.create({
        data: {
          email: dto.email,
          password_hash,
          nome: dto.nome ?? null,
        },
        select: { id: true, email: true, nome: true, created_at: true },
      });

      // Plano FREE default
      await tx.usuarioPlano.create({
        data: { usuario_id: user.id, plano: "FREE", status: "ATIVA" },
      });

      // Papel USER default
      const papelUser = await tx.papel.findUnique({ where: { nome: "USER" } });
      if (papelUser) {
        await tx.usuarioPapel.create({
          data: { usuario_id: user.id, papel_id: papelUser.id },
        });
      }

      return user;
    });

    this.analytics.capture(usuario.id, AnalyticsEvents.USER_REGISTERED, {
      plan: "free",
      has_name: dto.nome !== undefined,
    });
    this.analytics.identify(usuario.id, { plan: "free", role: "user" });

    await this.auditLog.log({
      entidade: "Usuario",
      entidadeId: usuario.id,
      acao: "register",
      usuarioId: usuario.id,
      dadosDepois: { email: dto.email },
    });

    this.logger.log(`Usuário registrado (id: ${usuario.id})`);
    return usuario;
  }

  async login(
    dto: LoginDtoType,
    options: { ip?: string; user_agent?: string } = {},
  ): Promise<LoginResult> {
    const ip = options.ip ?? "unknown";

    // 1. Verifica lockout ANTES de consultar senha (evita timing attack).
    const lockout = await this.lockoutService.isLocked(ip, dto.email);
    if (lockout.locked) {
      const secondsRemaining = Math.ceil(lockout.remainingMs / 1000);
      throw new ForbiddenException({
        statusCode: 403,
        error: "Forbidden",
        message: `Conta bloqueada por tentativas excessivas. Tente novamente em ${secondsRemaining} segundos.`,
      });
    }

    // 2. Busca usuário por email.
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        nome: true,
        password_hash: true,
        email_verificado_em: true,
      },
    });

    // 3. Verifica senha. Mensagem genérica se usuário não existe.
    let passwordValid = false;
    if (usuario) {
      passwordValid = await this.passwordService.verify(dto.password, usuario.password_hash);
    }

    if (!usuario || !passwordValid) {
      // Registra falha para lockout progressivo.
      const result = await this.lockoutService.registerFailure(ip, dto.email);
      if (result.locked) {
        this.logger.warn(
          `Lockout aplicado para ${dto.email} (IP: ${ip}) após ${result.failedCount} falhas`,
        );
        throw new ForbiddenException({
          statusCode: 403,
          error: "Forbidden",
          message: `Credenciais inválidas. Conta bloqueada por ${Math.ceil(
            result.lockedForMs / 1000,
          )} segundos por tentativas excessivas.`,
        });
      }
      throw new UnauthorizedException({
        statusCode: 401,
        error: "Unauthorized",
        message: "Credenciais inválidas.",
      });
    }

    // 4. Login bem-sucedido: reseta lockout, cria sessão.
    await this.lockoutService.resetOnSuccess(ip, dto.email);

    const session: SessionCreationResult = await this.sessionService.createSession({
      usuario_id: usuario.id,
      user_agent: options.user_agent,
      ip,
    });

    // Atualiza ultimo_login_em.
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimo_login_em: new Date() },
    });

    this.analytics.capture(usuario.id, AnalyticsEvents.USER_SESSION_START, {
      has_verified_email: usuario.email_verificado_em !== null,
    });

    await this.auditLog.log({
      entidade: "Usuario",
      entidadeId: usuario.id,
      acao: "login",
      usuarioId: usuario.id,
      ipOrigem: ip,
    });

    return {
      token: session.token,
      expires_at: session.record.expires_at,
      usuario: { id: usuario.id, email: usuario.email, nome: usuario.nome },
    };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    if (!usuario) return { message: "Se o email existir, um link de reset será enviado." };

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        password_reset_token: tokenHash,
        password_reset_expira: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await this.auditLog.log({
      entidade: "Usuario",
      entidadeId: usuario.id,
      acao: "password_reset_requested",
    });

    // NUNCA logar o token de reset em texto plano (equivalente à senha).
    this.logger.log(`Reset de senha solicitado (usuário ${usuario.id})`);
    return { message: "Se o email existir, um link de reset será enviado." };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const usuario = await this.prisma.usuario.findFirst({
      where: { password_reset_token: tokenHash, password_reset_expira: { gt: new Date() } },
    });

    if (!usuario) {
      throw new BadRequestException({
        statusCode: 400,
        error: "Bad Request",
        message: "Token inválido ou expirado.",
      });
    }

    const passwordHash = await this.passwordService.hash(newPassword);

    // Transação: troca a senha E revoga todas as sessões ativas do usuário
    // (padrão de segurança pós-reset — sessões antigas não sobrevivem).
    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          password_hash: passwordHash,
          password_reset_token: null,
          password_reset_expira: null,
        },
      }),
      this.prisma.sessao.updateMany({
        where: { usuario_id: usuario.id, revoked_at: null },
        data: { revoked_at: new Date() },
      }),
    ]);

    await this.auditLog.log({
      entidade: "Usuario",
      entidadeId: usuario.id,
      acao: "password_reset_completed",
    });

    this.logger.log(`Senha resetada para usuário ${usuario.id}`);
    return { message: "Senha alterada com sucesso." };
  }

  async logoutAudit(usuarioId: string, ip?: string): Promise<void> {
    await this.auditLog.log({
      entidade: "Usuario",
      entidadeId: usuarioId,
      acao: "logout",
      usuarioId,
      ipOrigem: ip,
    });
  }

  /**
   * Dados do usuário autenticado + plano/entitlements (D-132).
   * Consumido por GET /api/v1/auth/me.
   */
  async getMe(usuarioId: string): Promise<MeResult> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        email: true,
        nome: true,
        plano: {
          select: {
            plano: true,
            status: true,
            trial_ends_at: true,
          },
        },
      },
    });
    if (!usuario) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: "Unauthorized",
        message: "Autenticação necessária.",
      });
    }

    const plano = usuario.plano?.plano ?? "FREE";
    return {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      plano,
      status: usuario.plano?.status ?? "ATIVA",
      trial_ends_at: usuario.plano?.trial_ends_at?.toISOString() ?? null,
      watchlist_limit: plano === "FREE" ? FREE_WATCHLIST_LIMIT : null,
    };
  }
}
