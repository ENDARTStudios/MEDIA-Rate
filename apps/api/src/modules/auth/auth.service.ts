import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  UnprocessableEntityException,
  HttpException,
  Logger,
} from "@nestjs/common";
import { randomBytes, createHash } from "crypto";
import { PrismaService } from "../../prisma/prisma.service.js";
import { PasswordService } from "../../common/password.service.js";
import { SessionService, type SessionCreationResult } from "./session.service.js";
import { SessionRotationService } from "./session-rotation.service.js";
import { LockoutService } from "./lockout.service.js";
import { AnalyticsService, AnalyticsEvents } from "../../common/analytics.service.js";
import { AuditLogService } from "../../common/audit-log.service.js";
import { MockMailService } from "../../common/mock-mail.service.js";
import { mascararEmail, mascararIp } from "../../common/pii-mask.js";
import { EmailVerificationService } from "./email-verification.service.js";
import { AlertsService } from "../metrics/alerts.service.js";
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
  refreshToken: string;
  expires_at: Date;
  refresh_expira_em: Date;
  usuario: {
    id: string;
    email: string;
    nome: string | null;
  };
  /** T389: true quando o login social criou uma conta nova (rota para /welcome). */
  isNewUser?: boolean;
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
  /** T436: usuário usou o trial e ele terminou (plano voltou a FREE) — NÃO
   *  é Free novo nem assinante ativo. Orienta o banner de re-assinar. */
  trialEnded: boolean;
  watchlist_limit: number | null;
  /** T321: membro desde (ISO) — exibido no Perfil. */
  created_at: string;
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

  // T206: rate limit por email — 3 solicitações de reset por hora (em memória,
  // por instância; janela deslizante). Aplica-se ANTES da consulta do usuário
  // (evita enumeração de email por diferença de resposta/timing).
  private static readonly RESET_MAX_POR_EMAIL = 3;
  private static readonly RESET_JANELA_MS = 60 * 60 * 1000;
  private readonly resetSolicitacoes = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly sessionService: SessionService,
    private readonly sessionRotation: SessionRotationService,
    private readonly lockoutService: LockoutService,
    private readonly analytics: AnalyticsService,
    private readonly auditLog: AuditLogService,
    private readonly mockMail: MockMailService,
    private readonly emailVerification: EmailVerificationService,
    private readonly alerts: AlertsService,
  ) {}

  async register(
    dto: RegisterDtoType,
    options: { ip?: string; user_agent?: string } = {},
  ): Promise<RegisterResult> {
    // T306 (D-295): aceite obrigatório dos Termos antes de qualquer trabalho.
    if (dto.aceitouTermos !== true) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        error: "Unprocessable Entity",
        code: "TERMS_NOT_ACCEPTED",
        message: "É necessário aceitar os Termos e Condições.",
      });
    }

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
          termos_aceitos_em: new Date(),
          // T360 (D-339): verificação de email REAL reativada (Resend em
          // produção). email_verificado_em fica null → login exige verificação
          // (403 EMAIL_NOT_VERIFIED) e o front redireciona para "confira seu email".
        },
        select: { id: true, email: true, nome: true, created_at: true },
      });

      // T344: contexto RLS de serviço para a escrita do plano (FORCE RLS).
      await tx.$executeRawUnsafe("SELECT set_config('app.current_user_id', $1, true)", user.id);
      await tx.$executeRawUnsafe("SELECT set_config('app.current_user_role', 'SERVICE', true)");

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
      acao: "USER_REGISTERED",
      usuarioId: usuario.id,
      ipOrigem: options.ip,
      dadosDepois: { email: dto.email, userAgent: options.user_agent },
    });

    this.logger.log(`Usuário registrado (id: ${usuario.id})`);

    // T214: emite token de verificação de email (envio via mock em dev).
    // Resposta do register continua 201 SEM expor o token.
    try {
      await this.emailVerification.emitirToken(usuario, dto.locale ?? "pt-BR");
      await this.auditLog.log({
        entidade: "Usuario",
        entidadeId: usuario.id,
        acao: "EMAIL_VERIFICATION_SENT",
        ipOrigem: options.ip,
        dadosDepois: { userAgent: options.user_agent },
      });
    } catch (err) {
      this.logger.warn(`Falha ao emitir token de verificação (não-bloqueante): ${String(err)}`);
    }

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
      // T213: trilha de auditoria de falha (lockout é tratado pelo
      // LockoutService — aqui só registramos; nunca logamos a senha).
      await this.auditLog.log({
        entidade: "Usuario",
        entidadeId: usuario?.id ?? "unknown",
        acao: "USER_LOGIN_FAILED",
        ipOrigem: ip,
        dadosDepois: {
          email: dto.email,
          userAgent: options.user_agent,
          motivo: "invalid_credentials",
        },
      });
      // T218: alimenta o alerta de falhas de autenticação (janela 1min).
      this.alerts.registrarFalhaAuth();
      // Registra falha para lockout progressivo.
      const result = await this.lockoutService.registerFailure(ip, dto.email);
      if (result.locked) {
        this.logger.warn(
          `Lockout aplicado para ${mascararEmail(dto.email)} (IP: ${mascararIp(ip)}) após ${result.failedCount} falhas`,
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

    // 4. T214: email não verificado → 403 EMAIL_NOT_VERIFIED (sem sessão).
    if (usuario.email_verificado_em === null) {
      await this.auditLog.log({
        entidade: "Usuario",
        entidadeId: usuario.id,
        acao: "USER_LOGIN_FAILED",
        ipOrigem: ip,
        dadosDepois: {
          email: dto.email,
          userAgent: options.user_agent,
          motivo: "email_not_verified",
        },
      });
      // T218: falha de auth também alimenta o alerta (janela 1min).
      this.alerts.registrarFalhaAuth();
      throw new ForbiddenException({
        statusCode: 403,
        error: "Forbidden",
        code: "EMAIL_NOT_VERIFIED",
        message: "Verifique seu email antes de entrar.",
      });
    }

    // 5. Login bem-sucedido: reseta lockout, cria sessão.
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
      acao: "USER_LOGIN_SUCCESS",
      usuarioId: usuario.id,
      ipOrigem: ip,
      dadosDepois: { userAgent: options.user_agent },
    });

    return {
      token: session.token,
      refreshToken: session.refreshToken,
      expires_at: session.record.expires_at,
      refresh_expira_em: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usuario: { id: usuario.id, email: usuario.email, nome: usuario.nome },
    };
  }

  /**
   * T361 — login social (Google): cria/recupera o usuário pelo email (o
   * Google já validou o email, então marca email_verificado_em) e cria a
   * sessão como no login por senha. Email novo → conta FREE automática.
   */
  async googleLogin(
    email: string,
    nome: string | null,
    options: { ip?: string; user_agent?: string } = {},
  ): Promise<LoginResult> {
    const ip = options.ip ?? "unknown";

    let usuario = await this.prisma.usuario.findUnique({
      where: { email },
      select: { id: true, email: true, nome: true },
    });
    const isNewUser = !usuario;

    if (!usuario) {
      usuario = await this.prisma.$transaction(async (tx) => {
        const user = await tx.usuario.create({
          data: {
            email,
            nome,
            // Social: sem senha. Placeholder aleatório (nunca usado para login
            // por senha — o usuário entra via Google).
            password_hash: randomBytes(32).toString("hex"),
            termos_aceitos_em: new Date(),
            email_verificado_em: new Date(), // Google já validou o email.
          },
          select: { id: true, email: true, nome: true },
        });
        await tx.$executeRawUnsafe("SELECT set_config('app.current_user_id', $1, true)", user.id);
        await tx.$executeRawUnsafe("SELECT set_config('app.current_user_role', 'SERVICE', true)");
        await tx.usuarioPlano.create({
          data: { usuario_id: user.id, plano: "FREE", status: "ATIVA" },
        });
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
        provider: "google",
        has_name: nome != null,
      });
      this.analytics.identify(usuario.id, { plan: "free", role: "user" });
    }

    const session: SessionCreationResult = await this.sessionService.createSession({
      usuario_id: usuario.id,
      user_agent: options.user_agent,
      ip,
    });

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimo_login_em: new Date() },
    });

    this.analytics.capture(usuario.id, AnalyticsEvents.USER_SESSION_START, {
      provider: "google",
      has_verified_email: true,
    });
    await this.auditLog.log({
      entidade: "Usuario",
      entidadeId: usuario.id,
      acao: "USER_LOGIN_SOCIAL",
      usuarioId: usuario.id,
      ipOrigem: ip,
      dadosDepois: { provider: "google", userAgent: options.user_agent },
    });

    return {
      token: session.token,
      refreshToken: session.refreshToken,
      expires_at: session.record.expires_at,
      refresh_expira_em: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usuario: { id: usuario.id, email: usuario.email, nome: usuario.nome },
      isNewUser,
    };
  }

  /**
   * T212 — POST /auth/refresh: rotaciona o refresh token (reuso detectado
   * revoga TODAS as sessões do usuário) e emite novo par access+refresh.
   */
  async refresh(
    refreshToken: string,
    options: { ip?: string; user_agent?: string } = {},
  ): Promise<{
    token: string;
    refreshToken: string;
    expires_at: Date;
    refresh_expira_em: Date;
  }> {
    const access = this.sessionService.generateToken();
    const accessHash = this.sessionService.hashToken(access);
    const accessExpires = new Date(Date.now() + 15 * 60 * 1000);

    const rot = await this.sessionRotation.rotacionarRefresh({
      refreshToken,
      novoAccessHash: accessHash,
      accessExpiresAt: accessExpires,
    });

    if (!rot.ok) {
      if (rot.motivo === "reuso") {
        // Roubo provável: token já rotacionado sendo usado de novo.
        await this.auditLog.log({
          entidade: "Sessao",
          entidadeId: rot.sessaoId,
          acao: "TOKEN_REFRESH_REUSE_DETECTED",
          ipOrigem: options.ip,
          dadosDepois: { familyId: rot.familyId, userAgent: options.user_agent },
        });
        await this.auditLog.log({
          entidade: "Usuario",
          entidadeId: rot.usuarioId,
          acao: "SESSION_REVOKED_ALL",
          ipOrigem: options.ip,
          dadosDepois: { userAgent: options.user_agent },
        });
        this.logger.warn(`Reuse de refresh detectado (IP ${mascararIp(options.ip)}).`);
      }
      throw new UnauthorizedException({
        statusCode: 401,
        error: "Unauthorized",
        message: "Sessão expirada.",
      });
    }

    await this.auditLog.log({
      entidade: "Sessao",
      entidadeId: rot.sessaoId,
      acao: "TOKEN_REFRESHED",
      ipOrigem: options.ip,
      dadosDepois: { userAgent: options.user_agent },
    });

    return {
      token: access,
      refreshToken: rot.refreshToken,
      expires_at: accessExpires,
      refresh_expira_em: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }

  async forgotPassword(
    email: string,
    options: { ip?: string; user_agent?: string } = {},
  ): Promise<{ message: string }> {
    // Rate limit por email (3/h) — antes de qualquer consulta.
    this.registrarSolicitacaoReset(email);

    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    if (!usuario) return { message: "Se o email existir, um link de reset será enviado." };

    // Token: 256 bits aleatórios (hex). NUNCA armazenado em texto plano —
    // apenas o SHA-256 (64 hex, cabe no VarChar(64) da coluna).
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        password_reset_token: tokenHash,
        // T206: expiração de 1 hora.
        password_reset_expira: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await this.auditLog.log({
      entidade: "Usuario",
      entidadeId: usuario.id,
      acao: "PASSWORD_RESET_REQUESTED",
      ipOrigem: options.ip,
      dadosDepois: { userAgent: options.user_agent },
    });

    // Entrega do token via email (mock em dev — token vai para o
    // dev-mailbox.log, NUNCA para os logs do app).
    await this.mockMail.enviarResetSenha(usuario.email, token);

    this.logger.log(
      `Reset de senha solicitado (usuário ${usuario.id}; hash truncado: ${tokenHash.slice(0, 12)})`,
    );
    return { message: "Se o email existir, um link de reset será enviado." };
  }

  async resetPassword(
    token: string,
    newPassword: string,
    options: { ip?: string; user_agent?: string } = {},
  ): Promise<{ message: string }> {
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
    // O token é anulado (uso único): uma segunda tentativa com o mesmo token
    // não encontra mais o usuário (password_reset_token = null).
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
      acao: "PASSWORD_RESET_COMPLETED",
      ipOrigem: options.ip,
      dadosDepois: { userAgent: options.user_agent },
    });

    this.logger.log(`Senha resetada para usuário ${usuario.id}`);
    return { message: "Senha alterada com sucesso." };
  }

  /** Janela deslizante por email: máximo 3 solicitações na última hora. */
  private registrarSolicitacaoReset(email: string): void {
    const agora = Date.now();
    const recentes = (this.resetSolicitacoes.get(email) ?? []).filter(
      (t) => agora - t < AuthService.RESET_JANELA_MS,
    );
    if (recentes.length >= AuthService.RESET_MAX_POR_EMAIL) {
      throw new HttpException(
        {
          statusCode: 429,
          error: "Too Many Requests",
          message: "Muitas solicitações de reset. Tente novamente em uma hora.",
        },
        429,
      );
    }
    recentes.push(agora);
    this.resetSolicitacoes.set(email, recentes);
  }

  async logoutAudit(usuarioId: string, ip?: string, user_agent?: string): Promise<void> {
    return this.auditLog.log({
      entidade: "Usuario",
      entidadeId: usuarioId,
      acao: "USER_LOGOUT",
      usuarioId,
      ipOrigem: ip,
      dadosDepois: { userAgent: user_agent },
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
        // T321: data de criação para "Membro desde" no Perfil (mesma fonte
        // única de plano — subscription).
        created_at: true,
        plano: {
          select: {
            plano: true,
            status: true,
            trial_ends_at: true,
            trial_used_at: true,
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
      // T436: usou o trial (trial_used_at marcado) e está de volta ao FREE
      // (não assinou) → trial encerrado sem conversão automática.
      trialEnded: usuario.plano?.trial_used_at != null && plano === "FREE",
      watchlist_limit: plano === "FREE" ? FREE_WATCHLIST_LIMIT : null,
      // T321: membro desde (ISO) — exibido no Perfil.
      created_at: usuario.created_at.toISOString(),
    };
  }
}
